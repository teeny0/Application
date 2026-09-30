import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/database";

/** ข้อมูลผู้ใช้สำหรับหน้าจัดการของ Admin */
export type UserDTO = {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  isApproved: boolean;
  approvedAt: string | null;
  createdAt: string;
};

const USER_COLUMNS =
  "id, email, full_name, role, is_approved, approved_at, created_at";

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  is_approved: boolean;
  approved_at: string | null;
  created_at: string;
};

function toUserDTO(rows: ProfileRow[]): UserDTO[] {
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    isApproved: row.is_approved,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
  }));
}

/**
 * ผู้ใช้ทั้งหมด เรียงตามสถานะอนุมัติและวันที่สมัคร
 * (ผู้ที่ยังรออนุมัติขึ้นก่อน เพื่อให้ Admin เห็นงานที่ต้องทำติด ๆ บน)
 */
export async function getUsers(): Promise<UserDTO[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(USER_COLUMNS)
    .order("is_approved", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("ดึงรายชื่อผู้ใช้ไม่สำเร็จ:", error.message);
    return [];
  }

  return toUserDTO((data ?? []) as ProfileRow[]);
}

/** จำนวนผู้ที่ยังรออนุมัติ ใช้แสดงบนหัวข้อหน้า */
export async function countPendingUsers(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_approved", false);

  if (error) {
    console.error("นับผู้ที่รออนุมัติไม่สำเร็จ:", error.message);
    return 0;
  }

  return count ?? 0;
}
