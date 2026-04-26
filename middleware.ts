import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Skip static assets and Next internals — those don't need session refresh.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|mockups/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf)$).*)",
  ],
};


