"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SUPABASE_MISSING_ENV_MESSAGE, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  formDataToObject,
  loginSchema,
  signupSchema,
  toFieldErrors,
  type FormState,
} from "@/lib/validation";

/**
 * สมัครบัญชีใหม่
 *
 * ผู้สมัครจะยังเข้าใช้งานระบบไม่ได้จนกว่า Admin จะอนุมัติในหน้า /users
 * (ดู supabase/migrations/002_user_approval.sql)
 */
export async function signUp(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) {
    return { message: SUPABASE_MISSING_ENV_MESSAGE };
  }

  const parsed = signupSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // trigger handle_new_user() จะอ่านค่านี้ไปใส่ profiles.full_name
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/pending`,
    },
  });

  if (error) {
    console.error("สมัครบัญชีไม่สำเร็จ:", error.code ?? "-", error.message);
    return { message: signUpErrorMessage(error.code, error.message) };
  }

  // ถ้า session ถูกสร้างให้เลย (ปิดการยืนยันอีเมลไว้) ให้ไปหน้ารออนุมัติทันที
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/pending");
  }

  return {
    success: true,
    message:
      "สมัครเรียบร้อยแล้ว กรุณาเปิดอีเมลเพื่อยืนยันบัญชี จากนั้นรอผู้ดูแลระบบอนุมัติก่อนเข้าใช้งาน",
  };
}

/**
 * แปลง error จาก Supabase Auth เป็นข้อความที่ผู้ใช้นำไปแก้ได้
 *
 * ต้องระบุสาเหตุให้ชัด ไม่ใช่ "เกิดข้อผิดพลาด" กลาง ๆ
 * เพราะตอนนี้โปรเจกต์ยังติด rate limit ของการส่งอีเมลอยู่
 */
function signUpErrorMessage(code?: string, message?: string): string {
  const text = `${code ?? ""} ${message ?? ""}`;

  // อีเมลซ้ำ — ไม่บอกว่ามีบัญชีอยู่แล้ว เพื่อไม่เปิดเผยรายชื่อผู้ใช้
  if (/already registered|already been registered|user_already_exists/i.test(text)) {
    return "ไม่สามารถสมัครได้ กรุณาตรวจสอบอีเมลและรหัสผ่านของคุณ";
  }

  if (/over_email_send_rate_limit|rate limit/i.test(text)) {
    return "ส่งอีเมลยืนยันถึงจำนวนจำกัดของโปรเจกต์แล้ว กรุณารอสักครู่แล้วลองใหม่ หรือปิดการยืนยันอีเมลชั่วคราวที่ Supabase → Authentication → Sign In / Providers";
  }

  if (/signups not allowed|signup.*disabled/i.test(text)) {
    return "ปิดการสมัครบัญชีใหม่ไว้ กรุณาติดต่อผู้ดูแลระบบ";
  }

  if (/smtp|failed to send/i.test(text)) {
    return "ระบบอีเมลของโปรเจกต์มีปัญหา กรุณาติดต่อผู้ดูแลระบบ";
  }

  if (/password should be at least|weak password/i.test(text)) {
    return "รหัสผ่านสั้นหรือซับซ้อนเกินไป กรุณาตั้งอย่างน้อย 8 ตัว";
  }

  if (/invalid email|email address/i.test(text)) {
    return "รูปแบบอีเมลไม่ถูกต้อง";
  }

  return "เกิดข้อผิดพลาดในการสมัครบัญชี กรุณาลองใหม่อีกครั้ง";
}

/**
 * แปลง error จาก Supabase Auth เป็นข้อความที่ผู้ใช้นำไปแก้ได้
 *
 * "อีเมลยังไม่ได้ยืนยัน" ต้องแยกออกจาก "รหัสผ่านผิด" เพราะผู้สมัครใหม่
 * จะเข้าใจว่าตัวเองพิมพ์ผิดทั้งที่จริง ๆ แค่ยังไม่ได้กดลิงก์ในอีเมล
 */
function loginErrorMessage(code?: string, message?: string): string {
  const text = `${code ?? ""} ${message ?? ""}`;

  if (/email_not_confirmed|not confirmed/i.test(text)) {
    return "อีเมลยังไม่ได้ยืนยัน กรุณาเปิดอีเมลและกดลิงก์ยืนยันบัญชีก่อน";
  }

  if (/invalid login credentials/i.test(text)) {
    // ไม่บอกว่าอีเมลหรือรหัสผ่านผิด เพื่อไม่เปิดเผยว่ามีบัญชีอยู่หรือไม่
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }

  if (/rate limit/i.test(text)) {
    return "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }

  if (/email not found|user not found/i.test(text)) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }

  return "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

/**
 * เข้าสู่ระบบด้วย Supabase Authentication
 * ใช้ร่วมกับ useActionState ในฟอร์ม Login
 */
export async function login(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) {
    return { message: SUPABASE_MISSING_ENV_MESSAGE };
  }

  const parsed = loginSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    console.error("เข้าสู่ระบบไม่สำเร็จ:", error.code ?? "-", error.message);
    return { message: loginErrorMessage(error.code, error.message) };
  }

  // ยังใช้ client เดิมเพื่ออ่าน profile เพราะ cookie ใหม่ยังไม่ถูกส่งมากับ request นี้
  if (data.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_approved")
      .eq("id", data.user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";
    const isApproved = profile?.is_approved ?? false;

    revalidatePath("/", "layout");

    // ยังไม่ได้รับอนุมัติ — ส่งไปหน้ารออนุมัติแทน
    if (!isApproved && !isAdmin) {
      redirect("/pending");
    }
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** ออกจากระบบ — ลบ session แล้วกลับไปหน้า Login */
export async function logout(): Promise<void> {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
