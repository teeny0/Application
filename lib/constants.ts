import type {
  AlarmStatus,
  AppRole,
  MaintenancePriority,
  MaintenanceStatus,
  MachineStatus,
} from "@/lib/types/database";

/** ระดับสิทธิ์ผู้ใช้ทั้งหมด ใช้ตรวจค่าที่ส่งมาจากฟอร์ม */
export const APP_ROLE_VALUES = [
  "admin",
  "technician",
] as const satisfies readonly AppRole[];

/** ป้ายภาษาไทยของสถานะเครื่องจักร */
export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  running: "กำลังทำงาน",
  stop: "หยุดเครื่อง",
  alarm: "มี Alarm",
  maintenance: "กำลังบำรุง",
};

export const MACHINE_STATUS_VALUES = [
  "running",
  "stop",
  "alarm",
  "maintenance",
] as const satisfies readonly MachineStatus[];

/** สีประจำสถานะเครื่องจักร (Tailwind class) */
export const MACHINE_STATUS_STYLES: Record<MachineStatus, string> = {
  running: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  stop: "bg-slate-100 text-slate-700 ring-slate-600/20",
  alarm: "bg-red-100 text-red-800 ring-red-600/20",
  maintenance: "bg-amber-100 text-amber-800 ring-amber-600/20",
};

/**
 * สีแท่งกราฟของแต่ละสถานะ
 *
 * อ้างผ่าน CSS custom property ของ Tailwind แทน hex ตรง ๆ
 * เพื่อให้สีกราฟเปลี่ยนตามธีมได้เองโดยไม่ต้องเขียนโค้ดซ้ำสองชุด
 * (ค่าใน .dark ถูก override ไว้ใน app/globals.css)
 */
export const MACHINE_STATUS_CHART_COLORS: Record<MachineStatus, string> = {
  running: "var(--color-emerald-600)",
  stop: "var(--color-slate-500)",
  alarm: "var(--color-red-600)",
  maintenance: "var(--color-amber-600)",
};

/** ป้ายภาษาไทยของสถานะ Alarm */
export const ALARM_STATUS_LABELS: Record<AlarmStatus, string> = {
  open: "เปิด",
  in_progress: "กำลังดำเนินการ",
  closed: "ปิดแล้ว",
};

export const ALARM_STATUS_VALUES = [
  "open",
  "in_progress",
  "closed",
] as const satisfies readonly AlarmStatus[];

export const ALARM_STATUS_STYLES: Record<AlarmStatus, string> = {
  open: "bg-red-100 text-red-800 ring-red-600/20",
  in_progress: "bg-amber-100 text-amber-800 ring-amber-600/20",
  closed: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
};

export const ALARM_STATUS_CHART_COLORS: Record<AlarmStatus, string> = {
  open: "var(--color-red-600)",
  in_progress: "var(--color-amber-600)",
  closed: "var(--color-emerald-600)",
};

/** ป้ายภาษาไทยของสถานะงานบำรุง */
export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  pending: "รอดำเนินการ",
  in_progress: "กำลังทำ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

export const MAINTENANCE_STATUS_VALUES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const satisfies readonly MaintenanceStatus[];

export const MAINTENANCE_STATUS_STYLES: Record<MaintenanceStatus, string> = {
  pending: "bg-slate-100 text-slate-700 ring-slate-600/20",
  in_progress: "bg-blue-100 text-blue-800 ring-blue-600/20",
  completed: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  cancelled: "bg-zinc-100 text-zinc-600 ring-zinc-600/20",
};

/** ป้ายภาษาไทยของระดับความสำคัญ */
export const MAINTENANCE_PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  low: "ต่ำ",
  medium: "ปกติ",
  high: "สูง",
  critical: "วิกฤต",
};

export const MAINTENANCE_PRIORITY_VALUES = [
  "low",
  "medium",
  "high",
  "critical",
] as const satisfies readonly MaintenancePriority[];

export const MAINTENANCE_PRIORITY_STYLES: Record<MaintenancePriority, string> = {
  low: "bg-slate-100 text-slate-700 ring-slate-600/20",
  medium: "bg-blue-100 text-blue-800 ring-blue-600/20",
  high: "bg-amber-100 text-amber-800 ring-amber-600/20",
  critical: "bg-red-100 text-red-800 ring-red-600/20",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "ผู้ดูแลระบบ",
  technician: "ช่างเทคนิค",
};
