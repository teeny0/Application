/**
 * ค่า environment ที่ปลอดภัยเมื่อส่งไปฝั่ง browser
 *
 * หมายเหตุ: ไฟล์นี้ห้ามอ้างถึง Service Role Key / Secret Key เด็ดขาด
 * ค่าที่เป็นความลับต้องอ่านใน `lib/supabase/admin.ts` เท่านั้น
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_URL = url ?? "";
export const SUPABASE_ANON_KEY = anonKey ?? "";

/** คืนค่า null เมื่อยังไม่ได้ตั้งค่า environment (ใช้ตรวจสอบก่อนเรียก Supabase) */
export function isSupabaseConfigured(): boolean {
  return Boolean(url && anonKey);
}

/**
 * ข้อความแนะนำเมื่อยังไม่ได้ใส่ค่าใน .env.local
 * ใช้แสดงบนหน้า Login แทนการ throw error ที่ทำให้หน้าเว็บพัง
 */
export const SUPABASE_MISSING_ENV_MESSAGE =
  "ยังไม่ได้ตั้งค่า Supabase — กรุณาคัดลอกไฟล์ .env.example เป็น .env.local แล้วใส่ค่า Project URL และ anon key";
