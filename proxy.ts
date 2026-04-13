import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function proxy(request: NextRequest) {
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
