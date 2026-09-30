"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkAdmin, requireAdmin } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import {
  formDataToObject,
  machineSchema,
  toFieldErrors,
  type FormState,
} from "@/lib/validation";

/** ตรวจว่ามี Machine ID ซ้ำหรือไม่ (ใช้กับ error code 23505 ของ Postgres) */
function isDuplicateCode(error: { code?: string }): boolean {
  return error.code === "23505";
}

function duplicateMessage(): FormState {
  return { message: "ไม่สามารถบันทึกได้ เนื่องจากรหัสเครื่องจักร (Machine ID) นี้มีอยู่แล้ว" };
}

/** สร้างข้อมูลเครื่องจักรใหม่ — เฉพาะ Admin */
export async function createMachine(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await checkAdmin();
  if (denied) return { message: denied };

  const parsed = machineSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const admin = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from("machines").insert({
    machine_code: parsed.data.machineCode,
    machine_name: parsed.data.machineName,
    machine_type: parsed.data.machineType,
    location: parsed.data.location,
    status: parsed.data.status,
    description: parsed.data.description,
    created_by: admin.id,
  });

  if (error) {
    if (isDuplicateCode(error)) return duplicateMessage();
    console.error("เพิ่มเครื่องจักรไม่สำเร็จ:", error.message);
    return { message: "เกิดข้อผิดพลาดในการเพิ่มเครื่องจักร กรุณาลองใหม่" };
  }

  revalidatePath("/machines");
  revalidatePath("/dashboard");
  return { success: true, message: "เพิ่มข้อมูลเครื่องจักรเรียบร้อยแล้ว" };
}

/** แก้ไขข้อมูลเครื่องจักร — เฉพาะ Admin */
export async function updateMachine(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await checkAdmin();
  if (denied) return { message: denied };

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "ไม่พบรหัสเครื่องจักรที่ต้องการแก้ไข" };

  const parsed = machineSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("machines")
    .update({
      machine_code: parsed.data.machineCode,
      machine_name: parsed.data.machineName,
      machine_type: parsed.data.machineType,
      location: parsed.data.location,
      status: parsed.data.status,
      description: parsed.data.description,
    })
    .eq("id", id);

  if (error) {
    if (isDuplicateCode(error)) return duplicateMessage();
    console.error("แก้ไขเครื่องจักรไม่สำเร็จ:", error.message);
    return { message: "เกิดข้อผิดพลาดในการแก้ไขเครื่องจักร กรุณาลองใหม่" };
  }

  revalidatePath("/machines");
  revalidatePath("/dashboard");
  return { success: true, message: "บันทึกการแก้ไขเรียบร้อยแล้ว" };
}

/**
 * ลบเครื่องจักร — เฉพาะ Admin
 * การลบจะลบ Alarm และงานบำรุงของเครื่องนั้นตาม foreign key (on delete cascade)
 * จึงต้องยืนยันกับผู้ใช้ก่อน
 */
export async function deleteMachine(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();

  // ต้องตรวจสิทธิ์ก่อนเขียนข้อมูล — ไม่ฝากไว้กับ RLS อย่างเดียว
  await requireAdmin();

  const { error } = await supabase.from("machines").delete().eq("id", id);

  if (error) {
    console.error("ลบเครื่องจักรไม่สำเร็จ:", error.message);
    return;
  }

  revalidatePath("/machines");
  revalidatePath("/alarms");
  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  redirect("/machines");
}
