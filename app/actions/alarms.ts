"use server";

import { revalidatePath } from "next/cache";

import { checkUser } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import {
  alarmSchema,
  formDataToObject,
  toFieldErrors,
  type FormState,
} from "@/lib/validation";

/**
 * แปลงวันที่จาก <input type="datetime-local"> เป็น ISO string
 * ถือว่าเวลาที่ผู้ใช้กรอกเป็นเวลาท้องถิ่นของเครื่องนั้น
 */
function toIso(localDateTime: string): string {
  const date = new Date(localDateTime);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}

/** เติม resolved_at ให้สอดคล้องกับสถานะ (ปิดแล้วต้องมีเวลาที่แก้ไข) */
function resolvedAtFor(
  status: "open" | "in_progress" | "closed",
  previousResolvedAt: string | null,
): string | null {
  if (status === "closed") return previousResolvedAt ?? new Date().toISOString();
  return null;
}

/** บันทึก Alarm ใหม่ — Admin และ Technician ทำได้ */
export async function createAlarm(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await checkUser();
  if (denied) return { message: denied };

  const parsed = alarmSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const status = parsed.data.status;

  const { error } = await supabase.from("alarms").insert({
    machine_id: parsed.data.machineId,
    alarm_code: parsed.data.alarmCode,
    alarm_description: parsed.data.alarmDescription,
    occurred_at: toIso(parsed.data.occurredAt),
    cause: parsed.data.cause,
    status,
    assigned_to: parsed.data.assignedTo,
    reported_by: userData.user?.id ?? null,
    resolved_at: resolvedAtFor(status, null),
  });

  if (error) {
    console.error("เพิ่ม Alarm ไม่สำเร็จ:", error.message);
    return { message: "เกิดข้อผิดพลาดในการบันทึก Alarm กรุณาลองใหม่" };
  }

  revalidatePath("/alarms");
  revalidatePath("/dashboard");
  return { success: true, message: "บันทึก Alarm เรียบร้อยแล้ว" };
}

/** แก้ไข Alarm / เปลี่ยนสถานะ — Admin และ Technician ทำได้ */
export async function updateAlarm(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await checkUser();
  if (denied) return { message: denied };

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "ไม่พบรหัส Alarm ที่ต้องการแก้ไข" };

  const parsed = alarmSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();

  // อ่านค่าเดิมเพื่อคง resolved_at เดิมไว้เมื่อสถานะยังเป็น closed
  const { data: existing } = await supabase
    .from("alarms")
    .select("resolved_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return { message: "ไม่พบข้อมูล Alarm ที่ต้องการแก้ไข" };
  }

  const status = parsed.data.status;

  const { error } = await supabase
    .from("alarms")
    .update({
      machine_id: parsed.data.machineId,
      alarm_code: parsed.data.alarmCode,
      alarm_description: parsed.data.alarmDescription,
      occurred_at: toIso(parsed.data.occurredAt),
      cause: parsed.data.cause,
      status,
      assigned_to: parsed.data.assignedTo,
      resolved_at: resolvedAtFor(status, existing.resolved_at),
    })
    .eq("id", id);

  if (error) {
    console.error("แก้ไข Alarm ไม่สำเร็จ:", error.message);
    return { message: "เกิดข้อผิดพลาดในการแก้ไข Alarm กรุณาลองใหม่" };
  }

  revalidatePath("/alarms");
  revalidatePath("/dashboard");
  return { success: true, message: "บันทึกการแก้ไข Alarm เรียบร้อยแล้ว" };
}
