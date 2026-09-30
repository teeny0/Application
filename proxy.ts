import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  isSupabaseConfigured,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "@/lib/env";
import type { Database } from "@/lib/types/database";

/** หน้าที่เข้าถึงได้โดยไม่ต้องล็อกอิน */
const PUBLIC_ROUTES = ["/login", "/signup"];

/**
 * Proxy (ชื่อเดิมคือ middleware — เปลี่ยนเป็น proxy ใน Next.js 16)
 *
 * หน้าที่ 2 อย่าง:
 *  1. ต่ออายุ session — เพื่อไม่ให้ผู้ใช้ถูก logout อัตโนมัติ
 *  2. กันไม่ให้เข้าหน้าที่ต้องล็อกอินโดยยังไม่ได้ล็อกอิน (optimistic check)
 *
 * ⚠️  เป็นเพียงการตรวจเบื้องต้นจาก cookie เท่านั้น ไม่ใช่การรักษาความปลอดภัยจริง
 *     การตรวจสิทธิ์จริงทั้งหมดทำซ้ำใน Server Action และ Data Access Layer
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  // ยังไม่ได้ตั้งค่า .env.local — ไม่สามารถสร้าง client ได้
  // ส่งไปหน้า login ซึ่งจะแสดงข้อความอธิบายวิธีตั้งค่า
  if (!isSupabaseConfigured()) {
    if (isPublicRoute) {
      return NextResponse.next({ request });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // สำคัญ: เรียก getUser() เพื่อให้ Supabase ต่ออายุ token
  // แล้วเขียน cookie ใหม่กลับไปใน response ข้างบน
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublicRoute) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * ทุกเส้นทาง ยกเว้น:
     *  - api          : API routes
     *  - _next/static : ไฟล์ JS/CSS
     *  - _next/image  : image optimizer
     *  - ไฟล์ใน public เช่น favicon.ico, robots.txt
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
