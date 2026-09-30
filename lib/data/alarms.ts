import "server-only";

import { createClient } from "@/lib/supabase/server";
import { findMachineIdsBySearch } from "@/lib/data/machines";
import { escapeLikePattern } from "@/lib/utils/search";
import type { AlarmStatus } from "@/lib/types/database";

/** เงื่อนไขการค้นหา/กรองของ Alarm Record */
export type AlarmFilters = {
  /** ค้นหาจาก Alarm Code, คำอธิบาย หรือชื่อ/รหัสเครื่องจักร */
  search?: string;
  status?: AlarmStatus | "";
  /** กรองตามเครื่องจักร */
  machineId?: string;
  /** กรองตาม Alarm Code แบบตรงตัว */
  alarmCode?: string;
  /** กรองตามช่างที่รับผิดชอบ */
  technicianId?: string;
  /** ช่วงวันที่เกิด Alarm (ISO string) */
  dateFrom?: string;
  dateTo?: string;
};

export type AlarmDTO = {
  id: string;
  machine_id: string;
  alarm_code: string;
  alarm_description: string;
  occurred_at: string;
  cause: string | null;
  status: AlarmStatus;
  reported_by: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  machine: { machine_code: string; machine_name: string } | null;
  reporter: { full_name: string | null; email: string } | null;
  technician: { full_name: string | null; email: string } | null;
};

const ALARM_SELECT = `
  id, machine_id, alarm_code, alarm_description, occurred_at, cause, status,
  reported_by, assigned_to, resolved_at, created_at, updated_at,
  machine:machines ( machine_code, machine_name ),
  reporter:profiles!alarms_reported_by_fkey ( full_name, email ),
  technician:profiles!alarms_assigned_to_fkey ( full_name, email )
`;

/** แปลงผลลัพธ์จาก Supabase ให้อยู่ในรูปแบบ DTO ที่พร้อมใช้งาน */
function toAlarmDTO(rows: unknown): AlarmDTO[] {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const pick = (v: unknown) =>
      v && typeof v === "object"
        ? (v as { full_name: string | null; email: string })
        : null;

    return {
      id: r.id as string,
      machine_id: r.machine_id as string,
      alarm_code: r.alarm_code as string,
      alarm_description: r.alarm_description as string,
      occurred_at: r.occurred_at as string,
      cause: r.cause as string | null,
      status: r.status as AlarmStatus,
      reported_by: r.reported_by as string | null,
      assigned_to: r.assigned_to as string | null,
      resolved_at: r.resolved_at as string | null,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      machine: (r.machine as { machine_code: string; machine_name: string }) ?? null,
      reporter: pick(r.reporter),
      technician: pick(r.technician),
    };
  });
}

/**
 * ดึงรายการ Alarm ตามเงื่อนไขการค้นหา/กรอง
 * ค้นหาได้ทั้งจาก Alarm Code, คำอธิบาย, และชื่อ/รหัสเครื่องจักร
 */
export async function getAlarms(filters: AlarmFilters = {}): Promise<AlarmDTO[]> {
  const supabase = await createClient();

  let query = supabase
    .from("alarms")
    .select(ALARM_SELECT)
    .order("occurred_at", { ascending: false })
    .limit(500);

  const search = filters.search?.trim();
  if (search) {
    const safe = escapeLikePattern(search);
    // PostgREST ไม่รองรับการอ้างคอลัมน์ของตารางที่ embed ใน `or()`
    // จึงต้องหา id เครื่องจักรที่ตรงก่อน แล้วค่อยกรองด้วย machine_id.in.()
    const conditions = [
      `alarm_code.ilike.%${safe}%`,
      `alarm_description.ilike.%${safe}%`,
    ];
    const machineIds = await findMachineIdsBySearch(search);

    if (machineIds.length > 0) {
      conditions.push(`machine_id.in.(${machineIds.join(",")})`);
    }

    query = query.or(conditions.join(","));
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.machineId) {
    query = query.eq("machine_id", filters.machineId);
  }

  if (filters.alarmCode) {
    query = query.ilike("alarm_code", `%${filters.alarmCode}%`);
  }

  if (filters.technicianId) {
    query = query.eq("assigned_to", filters.technicianId);
  }

  if (filters.dateFrom) {
    query = query.gte("occurred_at", `${filters.dateFrom}T00:00:00.000Z`);
  }

  if (filters.dateTo) {
    query = query.lte("occurred_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("ดึงข้อมูล Alarm ไม่สำเร็จ:", error.message);
    return [];
  }

  return toAlarmDTO(data);
}

export async function getAlarmById(id: string): Promise<AlarmDTO | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("alarms")
    .select(ALARM_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("ดึงข้อมูล Alarm ไม่สำเร็จ:", error.message);
    return null;
  }

  return toAlarmDTO(data ? [data] : [])[0] ?? null;
}

/** รหัส Alarm ทั้งหมดที่มีอยู่ เพื่อนำไปแสดงเป็นตัวกรอง */
export async function getAlarmCodeFacets(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("alarms").select("alarm_code");

  if (error) return [];

  return [...new Set((data ?? []).map((r) => r.alarm_code))].sort();
}
