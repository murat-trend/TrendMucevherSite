import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isRemauraSuperAdminUserId } from "@/lib/billing/super-admin";
import { createClient } from "@/utils/supabase/server";
import { creditCredits, debitCredits } from "@/lib/billing/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHUNK = 1000;
const MAX_PROFILE_PAGES = 50;
const MAX_WALLET_PAGES = 50;

type ProfileRow = { id: string; store_name: string | null };

function adminAllowed(userId: string, role: string | null | undefined): boolean {
  return isRemauraSuperAdminUserId(userId) || role === "admin";
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });
  }

  const cookieStore = await cookies();
  const auth = createClient(cookieStore);
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const { data: me } = await auth.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!adminAllowed(user.id, me?.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const supabase = createServiceClient(url, serviceKey);

  const profiles: ProfileRow[] = [];
  for (let p = 0; p < MAX_PROFILE_PAGES; p++) {
    const from = p * CHUNK;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, store_name")
      .order("id", { ascending: true })
      .range(from, from + CHUNK - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    profiles.push(...((data ?? []) as ProfileRow[]));
    if ((data ?? []).length < CHUNK) break;
  }

  const walletMap = new Map<string, { credits: number; updated_at: string | null }>();
  for (let p = 0; p < MAX_WALLET_PAGES; p++) {
    const from = p * CHUNK;
    const { data, error } = await supabase
      .from("billing_wallets")
      .select("user_id, credits, updated_at")
      .order("user_id", { ascending: true })
      .range(from, from + CHUNK - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const rows = data ?? [];
    for (const w of rows as { user_id: string; credits: number | string | null; updated_at: string | null }[]) {
      const n = Number(w.credits);
      walletMap.set(w.user_id, {
        credits: Number.isFinite(n) ? n : 0,
        updated_at: w.updated_at,
      });
    }
    if (rows.length < CHUNK) break;
  }

  const emailById: Record<string, string> = {};
  try {
    let page = 1;
    for (;;) {
      const { data: lu, error: authListErr } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (authListErr || !lu?.users?.length) break;
      for (const u of lu.users) {
        const em = typeof u.email === "string" ? u.email.trim() : "";
        if (em) emailById[u.id] = em;
      }
      if (lu.users.length < 1000) break;
      page += 1;
      if (page > 50) break;
    }
  } catch {
    /* auth.admin yoksa veya yetki yoksa e-posta atlanır */
  }

  const profileIds = new Set(profiles.map((p) => p.id));
  const users = profiles.map((pr) => {
    const w = walletMap.get(pr.id);
    const store = typeof pr.store_name === "string" ? pr.store_name.trim() : "";
    const em = emailById[pr.id]?.trim() || null;
    const displayName = store || em || `${pr.id.slice(0, 8)}…`;
    return {
      id: pr.id,
      displayName,
      email: em,
      storeName: store || null,
      credits: w?.credits ?? 0,
      walletUpdatedAt: w?.updated_at ?? null,
    };
  });

  for (const [uid, w] of walletMap) {
    if (profileIds.has(uid)) continue;
    users.push({
      id: uid,
      displayName: `${uid.slice(0, 8)}…`,
      email: null,
      storeName: null,
      credits: w.credits,
      walletUpdatedAt: w.updated_at,
    });
  }

  users.sort((a, b) => a.displayName.localeCompare(b.displayName, "tr"));

  const { data: ledgerRaw, error: ledErr } = await supabase
    .from("billing_ledger")
    .select("id, user_id, amount, type, description, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (ledErr) {
    return NextResponse.json({ error: ledErr.message }, { status: 500 });
  }

  const ledgerRows = (ledgerRaw ?? []) as {
    id: string;
    user_id: string;
    amount: number | string;
    type: string;
    description: string | null;
    created_at: string;
  }[];

  const uids = [...new Set(ledgerRows.map((r) => r.user_id))];
  const nameById: Record<string, string> = {};
  if (uids.length > 0) {
    const { data: lp } = await supabase.from("profiles").select("id, store_name").in("id", uids);
    for (const row of lp ?? []) {
      const pr = row as ProfileRow;
      const store = typeof pr.store_name === "string" ? pr.store_name.trim() : "";
      const em = emailById[pr.id]?.trim() || null;
      nameById[pr.id] = store || em || `${pr.id.slice(0, 8)}…`;
    }
    for (const id of uids) {
      if (!nameById[id]) nameById[id] = `${id.slice(0, 8)}…`;
    }
  }

  const ledger = ledgerRows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    userLabel: nameById[r.user_id] ?? r.user_id,
    amount: typeof r.amount === "number" ? r.amount : Number(r.amount),
    type: r.type,
    description: r.description,
    createdAt: r.created_at,
  }));

  return NextResponse.json({ users, ledger });
}

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik" }, { status: 500 });
  }

  const cookieStore = await cookies();
  const auth = createClient(cookieStore);
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Oturum gerekli" }, { status: 401 });
  }

  const { data: me } = await auth.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!adminAllowed(user.id, me?.role)) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  let body: { userId?: string; amount?: number; type?: string; description?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Geçersiz JSON" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) {
    return NextResponse.json({ error: "userId gerekli" }, { status: 400 });
  }

  const amount = Math.floor(Number(body.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount pozitif tam sayı olmalı" }, { status: 400 });
  }

  const type = body.type === "debit" ? "debit" : body.type === "credit" ? "credit" : null;
  if (!type) {
    return NextResponse.json({ error: "type credit veya debit olmalı" }, { status: 400 });
  }

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    return NextResponse.json({ error: "description gerekli" }, { status: 400 });
  }

  const reason = `admin_manual: ${description}`;

  try {
    if (type === "credit") {
      const wallet = await creditCredits(userId, amount, reason);
      return NextResponse.json({ ok: true, type: "credit", balanceCredits: wallet.balanceCredits });
    }

    const result = await debitCredits(userId, amount, reason);
    if (!result.ok) {
      return NextResponse.json({ error: "Yetersiz bakiye" }, { status: 400 });
    }
    if (!result.charged && isRemauraSuperAdminUserId(userId)) {
      return NextResponse.json(
        { error: "Bu kullanıcı için otomatik kredi düşümü devre dışı (süper admin)." },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, type: "debit", balanceCredits: result.wallet.balanceCredits });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "İşlem başarısız";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
