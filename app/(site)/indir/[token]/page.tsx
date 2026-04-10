"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type OrderInfo = {
  product_name: string | null;
  license_type: string | null;
  amount: number;
  download_count: number;
  max_downloads: number;
  token_expires_at: string | null;
  product_id: string | null;
  download_glb_url: string | null;
  download_stl_url: string | null;
};

export default function IndirPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const fullSelect =
        "product_name, license_type, amount, download_count, max_downloads, token_expires_at, product_id, download_glb_url, download_stl_url";
      const baseSelect =
        "product_name, license_type, amount, download_count, max_downloads, token_expires_at, product_id";

      let { data, error: qError } = await supabase
        .from("orders")
        .select(fullSelect)
        .eq("download_token", token)
        .eq("payment_status", "paid")
        .maybeSingle();

      if (qError && /download_glb_url|download_stl_url|schema cache/i.test(qError.message ?? "")) {
        const retry = await supabase
          .from("orders")
          .select(baseSelect)
          .eq("download_token", token)
          .eq("payment_status", "paid")
          .maybeSingle();
        data = retry.data;
        qError = retry.error;
      }

      if (qError || !data) {
        setError("Geçersiz veya süresi dolmuş indirme linki.");
        setLoading(false);
        return;
      }

      if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
        setError("Bu indirme linkinin süresi dolmuş.");
        setLoading(false);
        return;
      }

      const count = Number(data.download_count ?? 0);
      const max = Number(data.max_downloads ?? 3);
      if (count >= max) {
        setError("Bu link maksimum indirme sayısına ulaştı.");
        setLoading(false);
        return;
      }

      setOrder({
        ...data,
        amount: Number(data.amount ?? 0),
        download_count: count,
        max_downloads: max,
        download_glb_url: "download_glb_url" in data ? (data.download_glb_url as string | null) : null,
        download_stl_url: "download_stl_url" in data ? (data.download_stl_url as string | null) : null,
      });
      setLoading(false);
    };
    void load();
  }, [token]);

  const handleDownload = async (format: "glb" | "stl") => {
    if (downloading || !order) return;
    setDownloading(true);
    const supabase = createClient();

    let url: string | null | undefined;
    let fileLabel = order.product_name ?? "model";

    const snapGlb = order.download_glb_url?.trim() || null;
    const snapStl = order.download_stl_url?.trim() || null;
    if (format === "glb") {
      url = snapGlb ?? undefined;
    } else {
      url = snapStl ?? undefined;
    }

    if (!url && order.product_id) {
      const { data: product } = await supabase
        .from("products_3d")
        .select("glb_url, stl_url, name")
        .eq("id", order.product_id)
        .maybeSingle();
      url = format === "glb" ? product?.glb_url : product?.stl_url;
      if (product?.name) fileLabel = product.name;
    }

    if (!url) {
      setDownloading(false);
      return;
    }

    await supabase
      .from("orders")
      .update({ download_count: (order.download_count ?? 0) + 1 })
      .eq("download_token", token);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileLabel}.${format}`;
    a.click();
    setDownloading(false);
  };

  if (loading)
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e0d0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p>Yükleniyor...</p>
      </main>
    );

  if (error)
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e0d0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#f87171", fontSize: "16px" }}>{error}</p>
          <a href="/modeller" style={{ display: "inline-block", marginTop: "1rem", color: "#c9a84c", fontSize: "13px" }}>
            Modellere Dön →
          </a>
        </div>
      </main>
    );

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", color: "#e8e0d0", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: "480px", width: "100%", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", background: "#101010", padding: "2rem" }}>
        <h1 style={{ color: "#c9a84c", fontWeight: 300, letterSpacing: "0.08em", marginBottom: "1.5rem" }}>Modelinizi İndirin</h1>
        <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span style={{ color: "#8a8278" }}>Ürün</span>
            <span>{order?.product_name ?? "-"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span style={{ color: "#8a8278" }}>Lisans</span>
            <span>{order?.license_type === "commercial" ? "Ticari" : "Kişisel"}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span style={{ color: "#8a8278" }}>Kalan İndirme</span>
            <span>
              {(order?.max_downloads ?? 3) - (order?.download_count ?? 0)} / {order?.max_downloads ?? 3}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            type="button"
            onClick={() => void handleDownload("glb")}
            disabled={downloading}
            style={{
              padding: "14px",
              border: "1px solid #c9a84c",
              color: "#c9a84c",
              background: "transparent",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              letterSpacing: "0.1em",
            }}
          >
            GLB İndir (3D Görüntüleyici / AR)
          </button>
          <button
            type="button"
            onClick={() => void handleDownload("stl")}
            disabled={downloading}
            style={{
              padding: "14px",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#e8e0d0",
              background: "transparent",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "13px",
              letterSpacing: "0.1em",
            }}
          >
            STL İndir (3D Baskı / CNC)
          </button>
        </div>
        <p style={{ marginTop: "1.5rem", color: "#8a8278", fontSize: "11px", textAlign: "center" }}>
          Bu link 7 gün geçerlidir. Sorun yaşarsanız iletişime geçin.
        </p>
      </div>
    </main>
  );
}
