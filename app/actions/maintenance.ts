"use server";

import { revalidatePath } from "next/cache";

import { checkUser } from "@/lib/data/auth";
import { createClient } from "@/lib/supabase/server";
import {
  formDataToObject,
  maintenanceSchema,
  toFieldErrors,
  type FormState,
} from "@/lib/validation";

function toIso(localDateTime: string): string {
  const date = new Date(localDateTime);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString();
}

/** เติม completed_at ให้สอดคล้องกับสถานะ (เสร็จสิ้นต้องมีเวลาที่เสร็จ) */
function completedAtFor(
  status: "pending" | "in_progress" | "completed" | "cancelled",
  previousCompletedAt: string | null,
): string | null {
  if (status === "completed") {
    return previousCompletedAt ?? new Date().toISOString();
  }
  return null;
}

/** บันทึกงานบำรุงใหม่ — Admin และ Technician ทำได้ */
export async function createMaintenance(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await checkUser();
  if (denied) return { message: denied };

  const parsed = maintenanceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const status = parsed.data.status;

  const { error } = await supabase.from("maintenance_records").insert({
    machine_id: parsed.data.machineId,
    title: parsed.data.title,
    description: parsed.data.description,
    scheduled_at: toIso(parsed.data.scheduledAt),
    status,
    priority: parsed.data.priority,
    technician_id: parsed.data.technicianId,
    cost: parsed.data.cost === null ? null : Number(parsed.data.cost),
    parts_used: parsed.data.partsUsed,
    notes: parsed.data.notes,
    completed_at: completedAtFor(status, null),
    created_by: userData.user?.id ?? null,
  });

  if (error) {
    console.error("เพิ่มงานบำรุงไม่สำเร็จ:", error.message);
    return { message: "เกิดข้อผิดพลาดในการบันทึกงานบำรุง กรุณาลองใหม่" };
  }

  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  return { success: true, message: "บันทึกงานบำรุงเรียบร้อยแล้ว" };
}

/** แก้ไขงานบำรุง — Admin และ Technician ทำได้ */
export async function updateMaintenance(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const denied = await checkUser();
  if (denied) return { message: denied };

  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "ไม่พบรหัสงานบำรุงที่ต้องการแก้ไข" };

  const parsed = maintenanceSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("maintenance_records")
    .select("completed_at")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return { message: "ไม่พบข้อมูลงานบำรุงที่ต้องการแก้ไข" };
  }

  const status = parsed.data.status;

  const { error } = await supabase
    .from("maintenance_records")
    .update({
      machine_id: parsed.data.machineId,
      title: parsed.data.title,
      description: parsed.data.description,
      scheduled_at: toIso(parsed.data.scheduledAt),
      status,
      priority: parsed.data.priority,
      technician_id: parsed.data.technicianId,
      cost: parsed.data.cost === null ? null : Number(parsed.data.cost),
      parts_used: parsed.data.partsUsed,
      notes: parsed.data.notes,
      completed_at: completedAtFor(status, existing.completed_at),
    })
    .eq("id", id);

  if (error) {
    console.error("แก้ไขงานบำรุงไม่สำเร็จ:", error.message);
    return { message: "เกิดข้อผิดพลาดในการแก้ไขงานบำรุง กรุณาลองใหม่" };
  }

  revalidatePath("/maintenance");
  revalidatePath("/dashboard");
  return { success: true, message: "บันทึกการแก้ไขงานบำรุงเรียบร้อยแล้ว" };
}
