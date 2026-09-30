import { z } from "zod";

import {
  ALARM_STATUS_VALUES,
  MAINTENANCE_PRIORITY_VALUES,
  MAINTENANCE_STATUS_VALUES,
  MACHINE_STATUS_VALUES,
} from "@/lib/constants";

/** ข้อความแสดงผลที่ Server Action ส่งกลับมายังฟอร์ม */
export type FormState = {
  success?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
} | null;

const requiredText = (label: string, max = 200) =>
  z
    .string()
    .trim()
    .min(1, { error: `กรุณากรอก${label}` })
    .max(max, { error: `${label}ยาวเกิน ${max} ตัวอักษร` });

const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max, { error: `ข้อความยาวเกิน ${max} ตัวอักษร` })
    .optional()
    .transform((v) => (v ? v : null));

/** ค่าจาก <select> ที่ไม่ได้เลือกจะเป็น "" ต้องแปลงเป็น null */
const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.uuid().safeParse(v).success, {
    error: "รูปแบบรหัสผู้ใช้ไม่ถูกต้อง",
  });

const requiredUuid = z
  .string()
  .trim()
  .min(1, { error: "กรุณาเลือกเครื่องจักร" })
  .refine((v) => z.uuid().safeParse(v).success, {
    error: "รูปแบบรหัสเครื่องจักรไม่ถูกต้อง",
  });

/** ค่าจาก <input type="datetime-local"> อยู่ในรูปแบบ YYYY-MM-DDTHH:mm */
const localDateTime = z
  .string()
  .trim()
  .min(1, { error: "กรุณาเลือกวันที่และเวลา" })
  .refine((v) => !Number.isNaN(new Date(v).getTime()), {
    error: "รูปแบบวันที่ไม่ถูกต้อง",
  });

/* -------------------------------------------------------------------------- */
/*  Machine Master                                                            */
/* -------------------------------------------------------------------------- */

export const machineSchema = z.object({
  machineCode: requiredText("รหัสเครื่องจักร", 50),
  machineName: requiredText("ชื่อเครื่องจักร", 120),
  machineType: requiredText("ประเภทเครื่องจักร", 100),
  location: requiredText("สถานที่ตั้ง", 120),
  status: z.enum(MACHINE_STATUS_VALUES, {
    error: "กรุณาเลือกสถานะเครื่องจักร",
  }),
  description: optionalText(),
});

export type MachineInput = z.infer<typeof machineSchema>;

/* -------------------------------------------------------------------------- */
/*  Alarm Record                                                              */
/* -------------------------------------------------------------------------- */

export const alarmSchema = z.object({
  machineId: requiredUuid,
  alarmCode: requiredText("Alarm Code", 50),
  alarmDescription: requiredText("คำอธิบาย Alarm", 300),
  occurredAt: localDateTime,
  cause: optionalText(1000),
  status: z.enum(ALARM_STATUS_VALUES, {
    error: "กรุณาเลือกสถานะ Alarm",
  }),
  assignedTo: optionalUuid,
});

export type AlarmInput = z.infer<typeof alarmSchema>;

/* -------------------------------------------------------------------------- */
/*  Maintenance Record                                                        */
/* -------------------------------------------------------------------------- */

export const maintenanceSchema = z.object({
  machineId: requiredUuid,
  title: requiredText("หัวข้องานบำรุง", 200),
  description: optionalText(2000),
  scheduledAt: localDateTime,
  status: z.enum(MAINTENANCE_STATUS_VALUES, {
    error: "กรุณาเลือกสถานะงาน",
  }),
  priority: z.enum(MAINTENANCE_PRIORITY_VALUES, {
    error: "กรุณาเลือกระดับความสำคัญ",
  }),
  technicianId: optionalUuid,
  cost: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .refine(
      (v) => v === null || (!Number.isNaN(Number(v)) && Number(v) >= 0),
      { error: "ค่าใช้จ่ายต้องเป็นตัวเลขที่ไม่ติดลบ" },
    ),
  partsUsed: optionalText(1000),
  notes: optionalText(2000),
});

export type MaintenanceInput = z.infer<typeof maintenanceSchema>;

/* -------------------------------------------------------------------------- */
/*  Authentication                                                            */
/* -------------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: z
    .email({ error: "กรุณากรอกอีเมลที่ถูกต้อง" })
    .trim()
    .max(255, { error: "อีเมลยาวเกินไป" }),
  password: z
    .string()
    .min(1, { error: "กรุณากรอกรหัสผ่าน" })
    .max(200, { error: "รหัสผ่านยาวเกินไป" }),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** รหัสผ่านขั้นต่ำที่ยอมรับได้ (ตรงกับข้อกำหนดของ Supabase) */
const MIN_PASSWORD_LENGTH = 8;

export const signupSchema = z
  .object({
    fullName: requiredText("ชื่อ-นามสกุล", 120),
    email: z
      .email({ error: "กรุณากรอกอีเมลที่ถูกต้อง" })
      .trim()
      .max(255, { error: "อีเมลยาวเกินไป" }),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, {
        error: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`,
      })
      .max(200, { error: "รหัสผ่านยาวเกินไป" }),
    confirmPassword: z.string().min(1, { error: "กรุณายืนยันรหัสผ่าน" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;

/* -------------------------------------------------------------------------- */
/*  ตัวช่วยแปลงผลการตรวจสอบ                                                   */
/* -------------------------------------------------------------------------- */

/** แปลงค่าจาก FormData ให้เป็น object ของ string เพื่อส่งเข้า schema */
export function formDataToObject(
  formData: FormData,
): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

/** แปลง ZodError เป็นรูปแบบที่ useActionState นำไปแสดงผลได้ */
export function toFieldErrors(
  error: z.ZodError,
): Record<string, string[] | undefined> {
  return z.flattenError(error).fieldErrors;
}
