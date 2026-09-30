"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { checkAdmin, requireAdmin } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import { APP_ROLE_VALUES } from "@/lib/constants";
import type { AppRole } from "@/lib/types/database";

const userIdSchema = z.uuid({ error: "รหัสผู้ใช้ไม่ถูกต้อง" });

const roleSchema = z.enum(APP_ROLE_VALUES, {
  error: "ระดับสิทธิ์ไม่ถูกต้อง",
});

/**
 * อ่านค่าจาก FormData แล้วตรวจรูปแบบ พร้อมกันผู้แก้ไขบัญชีตัวเอง
 * @returns null เมื่อข้อมูลถูกต้อง, หรือข้อความ error
 */
async function readTarget(
  formData: FormData,
): Promise<{ id: string; role?: AppRole; error?: string }> {
  const denied = await checkAdmin();
  if (denied) return { id: "", error: denied };

  const admin = await requireAdmin();

  const parsedId = userIdSchema.safeParse(String(formData.get("id") ?? ""));
  if (!parsedId.success) {
    return { id: "", error: "ไม่พบผู้ใช้ที่ต้องการจัดการ" };
  }

  // ป้องกันไม่ให้ Admin ถอดสิทธิ์หรือยกระดับตัวเอง เพราะอาจทำให้
  // ไม่เหลือคนดูแลระบบเลย (ผู้ที่อนุมัติไว้แล้วจะยกเลิกสิทธิ์ตัวเองไม่ได้)
  if (parsedId.data === admin.id) {
    return { id: "", error: "ไม่สามารถเปลี่ยนสิทธิ์ของบัญชีที่กำลังใช้งานอยู่ได้" };
  }

  return { id: parsedId.data };
}

/** อนุมัติผู้ใช้ให้เข้าใช้งานระบบ — เฉพาะ Admin */
export async function approveUser(formData: FormData): Promise<void> {
  const target = await readTarget(formData);
  if (target.error) return;

  const supabase = await createClient();

  // คอลัมน์ approved_at / approved_by ให้ trigger protect_profile_approval เติมให้
  const { error } = await supabase
    .from("profiles")
    .update({ is_approved: true })
    .eq("id", target.id);

  if (error) {
    console.error("อนุมัติผู้ใช้ไม่สำเร็จ:", error.message);
    return;
  }

  revalidatePath("/users");
}

/** ยกเลิกสิทธิ์เข้าใช้งานของผู้ใช้ — เฉพาะ Admin */
export async function revokeUser(formData: FormData): Promise<void> {
  const target = await readTarget(formData);
  if (target.error) return;

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_approved: false })
    .eq("id", target.id);

  if (error) {
    console.error("ยกเลิกสิทธิ์ผู้ใช้ไม่สำเร็จ:", error.message);
    return;
  }

  revalidatePath("/users");
}

/** เปลี่ยนระดับสิทธิ์ของผู้ใช้ (admin <-> technician) — เฉพาะ Admin */
export async function changeUserRole(formData: FormData): Promise<void> {
  const target = await readTarget(formData);
  if (target.error) return;

  const parsedRole = roleSchema.safeParse(String(formData.get("role") ?? ""));
  if (!parsedRole.success) return;

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({ role: parsedRole.data })
    .eq("id", target.id);

  if (error) {
    console.error("เปลี่ยนระดับสิทธิ์ผู้ใช้ไม่สำเร็จ:", error.message);
    return;
  }

  revalidatePath("/users");
}
