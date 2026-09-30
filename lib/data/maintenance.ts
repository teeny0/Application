import "server-only";

import { createClient } from "@/lib/supabase/server";
import { findMachineIdsBySearch } from "@/lib/data/machines";
import { escapeLikePattern } from "@/lib/utils/search";
import type {
  MaintenancePriority,
  MaintenanceStatus,
} from "@/lib/types/database";

/** เงื่อนไขการค้นหา/กรองของ Maintenance Record */
export type MaintenanceFilters = {
  /** ค้นหาจากหัวข้องงาน, รายละเอียด หรือชื่อ/รหัสเครื่องจักร */
  search?: string;
  status?: MaintenanceStatus | "";
  priority?: MaintenancePriority | "";
  machineId?: string;
  /** กรองตามช่างผู้ดำเนินงาน */
  technicianId?: string;
  /** ช่วงวันที่วางแผน */
  dateFrom?: string;
  dateTo?: string;
};

export type MaintenanceDTO = {
  id: string;
  machine_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  completed_at: string | null;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  cost: number | null;
  parts_used: string | null;
  notes: string | null;
  created_by: string | null;
  technician_id: string | null;
  created_at: string;
  updated_at: string;
  machine: { machine_code: string; machine_name: string } | null;
  technician: { full_name: string | null; email: string } | null;
};

const MAINTENANCE_SELECT = `
  id, machine_id, title, description, scheduled_at, completed_at, status,
  priority, cost, parts_used, notes, created_by, technician_id,
  created_at, updated_at,
  machine:machines ( machine_code, machine_name ),
  technician:profiles!maintenance_records_technician_id_fkey ( full_name, email )
`;

function toMaintenanceDTO(rows: unknown): MaintenanceDTO[] {
  if (!Array.isArray(rows)) return [];

  return rows.map((row) => {
    const r = row as Record<string, unknown>;
    const technician =
      r.technician && typeof r.technician === "object"
        ? (r.technician as { full_name: string | null; email: string })
        : null;

    return {
      id: r.id as string,
      machine_id: r.machine_id as string,
      title: r.title as string,
      description: r.description as string | null,
      scheduled_at: r.scheduled_at as string,
      completed_at: r.completed_at as string | null,
      status: r.status as MaintenanceStatus,
      priority: r.priority as MaintenancePriority,
      cost: r.cost as number | null,
      parts_used: r.parts_used as string | null,
      notes: r.notes as string | null,
      created_by: r.created_by as string | null,
      technician_id: r.technician_id as string | null,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
      machine: (r.machine as {
        machine_code: string;
        machine_name: string;
      }) ?? null,
      technician,
    };
  });
}

/** ดึงรายการงานบำรุงตามเงื่อนไขการค้นหา/กรอง */
export async function getMaintenanceRecords(
  filters: MaintenanceFilters = {},
): Promise<MaintenanceDTO[]> {
  const supabase = await createClient();

  let query = supabase
    .from("maintenance_records")
    .select(MAINTENANCE_SELECT)
    .order("scheduled_at", { ascending: false })
    .limit(500);

  const search = filters.search?.trim();
  if (search) {
    const safe = escapeLikePattern(search);
    // PostgREST ไม่รองรับการอ้างคอลัมน์ของตารางที่ embed ใน `or()`
    // จึงต้องหา id เครื่องจักรที่ตรงก่อน แล้วค่อยกรองด้วย machine_id.in.()
    const conditions = [
      `title.ilike.%${safe}%`,
      `description.ilike.%${safe}%`,
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

  if (filters.priority) {
    query = query.eq("priority", filters.priority);
  }

  if (filters.machineId) {
    query = query.eq("machine_id", filters.machineId);
  }

  if (filters.technicianId) {
    query = query.eq("technician_id", filters.technicianId);
  }

  if (filters.dateFrom) {
    query = query.gte("scheduled_at", `${filters.dateFrom}T00:00:00.000Z`);
  }

  if (filters.dateTo) {
    query = query.lte("scheduled_at", `${filters.dateTo}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("ดึงข้อมูลงานบำรุงไม่สำเร็จ:", error.message);
    return [];
  }

  return toMaintenanceDTO(data);
}

export async function getMaintenanceById(
  id: string,
): Promise<MaintenanceDTO | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("maintenance_records")
    .select(MAINTENANCE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("ดึงข้อมูลงานบำรุงไม่สำเร็จ:", error.message);
    return null;
  }

  return toMaintenanceDTO(data ? [data] : [])[0] ?? null;
}

export type TechnicianOption = {
  id: string;
  full_name: string | null;
  email: string;
};

/**
 * รายชื่อช่างที่ได้รับอนุมัติแล้ว ใช้ทำตัวกรองและ dropdown เลือกช่าง
 *
 * กรองด้วย `is_approved = true` เสมอ เพื่อไม่ให้ผู้ที่ยังรออนุมัติ
 * หรือผู้ดูแลระบบโผล่มาเป็นตัวเลือกในช่อง "ช่างผู้รับผิดชอบ"
 */
export async function getTechnicians(): Promise<TechnicianOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "technician")
    .eq("is_approved", true)
    .order("full_name", { ascending: true });

  if (error) {
    console.error("ดึงรายชื่อช่างไม่สำเร็จ:", error.message);
    return [];
  }

  return data ?? [];
}
