import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
  // nextaura.trendmucevher.com → /nextaura/[slug] rotasına yönlendir
  const host = request.headers.get("host") ?? "";
  const url = request.nextUrl.clone();
  if (host.startsWith("nextaura.")) {
    const slug = url.pathname === "/" ? "" : url.pathname.replace(/^\//, "").split("/")[0];
    if (!url.pathname.startsWith("/nextaura")) {
      url.pathname = slug ? `/nextaura/${slug}` : "/nextaura";
      return NextResponse.rewrite(url);
    }
  }

  // Basic auth (opsiyonel, .env'den kontrol edilir)
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (password) {
    const auth = request.headers.get("authorization");
    if (!auth || !auth.startsWith("Basic ")) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Site"' },
      });
    }
    const decoded = atob(auth.slice(6));
    const [, pass] = decoded.split(":");
    if (pass !== password) {
      return new NextResponse("Invalid credentials", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Site"' },
      });
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/mesh-optimize|.*\\.(?:svg|png|jpg|jpeg|gif|webp|glb|stl)$).*)",
  ],
};
