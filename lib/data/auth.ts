import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/database";

/** ข้อมูลผู้ใช้ที่ปลอดภัยพอจะส่งไปฝั่ง client (DTO) */
export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  /** ผู้ดูแลระบบถือว่าใช้งานได้เสมอ แม้ยังไม่ได้กดอนุมัติ */
  isApproved: boolean;
  isAdmin: boolean;
};

/**
 * ดึงข้อมูลผู้ใช้ที่ล็อกอินอยู่ พร้อม role จากตาราง profiles
 *
 * - ใช้ `auth.getUser()` ซึ่งตรวจสอบ token กับ Supabase Auth server จริง
 *   (ปลอดภัยกว่าการอ่านค่าจาก JWT ที่ decode ฝั่ง client)
 * - ห่อด้วย React `cache` เพื่อให้ query ซ้ำภายใน request เดียวกันถูกเรียกแค่ครั้งเดียว
 *
 * คืน null เมื่อยังไม่ล็อกอิน — ไม่ throw
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_approved")
    .eq("id", user.id)
    .maybeSingle();

  // มีผู้ใช้ใน auth แต่ไม่มี profile (เช่น trigger ยังไม่ทำงาน)
  // — ถือว่าเป็นช่างที่ยังไม่ได้รับอนุมัติ จะได้ไม่เข้าใช้งานก่อนได้รับอนุมัติ
  if (!profile) {
    return {
      id: user.id,
      email: user.email ?? "",
      fullName: null,
      role: "technician",
      isApproved: false,
      isAdmin: false,
    };
  }

  const isAdmin = profile.role === "admin";

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    isApproved: profile.is_approved || isAdmin,
    isAdmin,
  };
});

/**
 * บังคับให้ต้องล็อกอิน — ถ้าไม่ล็อกอินจะ redirect ไปหน้า /login
 * ใช้ในทุกหน้า/Server Action ที่ต้องมีผู้ใช้
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * บังคับให้ต้องล็อกอิน และได้รับอนุมัติจาก Admin แล้ว
 * ผู้ที่ยังรออนุมัติจะถูกส่งไปหน้า /pending
 */
export async function requireApprovedUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isApproved) redirect("/pending");
  return user;
}

/**
 * บังคับให้ต้องเป็น Admin — ถ้าไม่ใช่จะ redirect ไปหน้า /dashboard
 * ใช้สำหรับการจัดการ Machine Master และข้อมูลหลัก
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireApprovedUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

/**
 * ตรวจสิทธิ์โดยไม่ redirect — ใช้ใน Server Action ที่ต้องการคืน error ให้ฟอร์ม
 * @returns null เมื่อผ่านการตรวจสอบ, หรือข้อความ error เมื่อไม่ผ่าน
 */
export async function checkAdmin(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return "กรุณาเข้าสู่ระบบก่อน";
  if (!user.isApproved) return "บัญชีของคุณยังไม่ได้รับอนุมัติจากผู้ดูแลระบบ";
  if (user.role !== "admin")
    return "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถทำรายการนี้ได้";
  return null;
}

/** ตรวจว่าล็อกอินอยู่และได้รับอนุมัติแล้วหรือยัง โดยไม่ redirect */
export async function checkUser(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return "กรุณาเข้าสู่ระบบก่อน";
  if (!user.isApproved)
    return "บัญชีของคุณยังอยู่ระหว่างรอการอนุมัติจากผู้ดูแลระบบ (Admin)";
  return null;
}
