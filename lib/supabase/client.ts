"use client";

import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/lib/types/database";

/**
 * Supabase client สำหรับ Client Component
 * ใช้ได้เฉพาะ anon key เท่านั้น — RLS ยังคงบังคับใช้ตามปกติ
 */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
