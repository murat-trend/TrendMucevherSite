import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const url = request.nextUrl.clone();

  // nextaura.trendmucevher.com → /nextaura/[slug] rotasına yönlendir
  if (host.startsWith("nextaura.")) {
    const slug = url.pathname === "/" ? "" : url.pathname.replace(/^\//, "").split("/")[0];
    if (!url.pathname.startsWith("/nextaura")) {
      url.pathname = slug ? `/nextaura/${slug}` : "/nextaura";
      return NextResponse.rewrite(url);
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
