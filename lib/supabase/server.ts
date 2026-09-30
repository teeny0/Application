import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Supabase client สำหรับ Server Component / Server Action / Route Handler
 * ใช้ anon key + cookie ของผู้ใช้ เพื่อให้ RLS ของ Supabase ทำงานตามสิทธิ์จริง
 *
 * หมายเหตุ: `setAll` จะถูกเรียกเมื่อ Supabase ต้องการ refresh token
 *  - ตอนอยู่ใน Server Action หรือ Route Handler: เขียน cookie ได้เลย
 *  - ตอนอยู่ใน Server Component: Next.js ไม่ให้แก้ cookie จึง catch ไว้
 *    (การ refresh จะเกิดใน `proxy.ts` แทน)
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // เรียกจาก Server Component — ข้ามไป ไม่เป็นไร
        }
      },
    },
  });
}
