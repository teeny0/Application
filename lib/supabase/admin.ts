import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/types/database";

/**
 * Supabase client ที่ใช้ Service Role Key
 *
 * ⚠️  คำเตือน: client นี้ **ข้าม Row Level Security** ทั้งหมด
 *     เพราะฉะนั้น
 *     1. ห้าม import ไฟล์นี้ใน Client Component เด็ดขาด (มี `server-only` กันไว้แล้ว)
 *     2. ห้ามใช้รับคำขอที่มาจากผู้ใช้โดยตรง
 *     3. ทุกฟังก์ชันที่เรียกใช้ client นี้ต้องตรวจสิทธิ์ด้วยตัวเองก่อนเสมอ
 *     4. ค่า Service Role Key ต้องอยู่ใน SUPABASE_SERVICE_ROLE_KEY เท่านั้น
 *        ห้ามตั้งชื่อขึ้นต้นด้วย NEXT_PUBLIC_
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error(
      "ไม่พบค่า SUPABASE_SERVICE_ROLE_KEY — กรุณาตั้งค่าใน .env.local (ดูรายละเอียดใน .env.example)",
    );
  }

  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
