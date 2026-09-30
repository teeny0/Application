import "server-only";

import { createClient } from "@/lib/supabase/server";
import { escapeLikePattern } from "@/lib/utils/search";
import type { MachineStatus } from "@/lib/types/database";

/** เงื่อนไขการค้นหา/กรองของ Machine Master */
export type MachineFilters = {
  /** ค้นหาจาก Machine ID หรือ Machine Name */
  search?: string;
  status?: MachineStatus | "";
  /** ประเภทเครื่องจักร */
  machineType?: string;
  /** สถานที่ตั้ง */
  location?: string;
};

export type MachineDTO = {
  id: string;
  machine_code: string;
  machine_name: string;
  machine_type: string;
  location: string;
  status: MachineStatus;
  description: string | null;
  created_at: string;
  updated_at: string;
};

const MACHINE_COLUMNS =
  "id, machine_code, machine_name, machine_type, location, status, description, created_at, updated_at";

/**
 * ดึงรายการเครื่องจักรตามเงื่อนไขการค้นหา/กรอง
 * ใช้ `ilike` + `or` เพื่อค้นหาจากทั้งรหัสและชื่อเครื่องพร้อมกัน
 */
export async function getMachines(
  filters: MachineFilters = {},
): Promise<MachineDTO[]> {
  const supabase = await createClient();

  let query = supabase
    .from("machines")
    .select(MACHINE_COLUMNS)
    .order("machine_code", { ascending: true });

  const search = filters.search?.trim();
  if (search) {
    const safe = escapeLikePattern(search);
    query = query.or(
      `machine_code.ilike.%${safe}%,machine_name.ilike.%${safe}%`,
    );
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.machineType) {
    query = query.eq("machine_type", filters.machineType);
  }

  if (filters.location) {
    query = query.eq("location", filters.location);
  }

  const { data, error } = await query;

  if (error) {
    console.error("ดึงข้อมูลเครื่องจักรไม่สำเร็จ:", error.message);
    return [];
  }

  return data ?? [];
}

/** ดึงเครื่องจักรทั้งหมดแบบย่อ ใช้ทำ dropdown เลือกเครื่องจักร */
/**
 * หา id ของเครื่องจักรที่ตรงกับคำค้น (ค้นจากรหัสและชื่อ)
 *
 * PostgREST ไม่รองรับการค้นข้าม relation ภายใน `or()` (เช่น
 * `machine.machine_code.ilike.*x*`) จึงต้องแปลงเป็น `machine_id.in.()`
 * ในตารางลูกแทน ดู `escapeLikePattern` ใน `lib/utils/search.ts`
 */
export async function findMachineIdsBySearch(
  search: string,
): Promise<string[]> {
  const supabase = await createClient();
  const safe = escapeLikePattern(search);

  const { data, error } = await supabase
    .from("machines")
    .select("id")
    .or(`machine_code.ilike.%${safe}%,machine_name.ilike.%${safe}%`);

  if (error) {
    console.error("ค้นหาเครื่องจักรเพื่อกรองข้ามตารางไม่สำเร็จ:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.id);
}

export type MachineOption = {
  id: string;
  machine_code: string;
  machine_name: string;
};

export async function getMachineOptions(): Promise<MachineOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("machines")
    .select("id, machine_code, machine_name")
    .order("machine_code", { ascending: true });

  if (error) {
    console.error("ดึงรายชื่อเครื่องจักรไม่สำเร็จ:", error.message);
    return [];
  }

  return data ?? [];
}

/** ดึงเครื่องจักรครั้งเดียว */
export async function getMachineById(
  id: string,
): Promise<MachineDTO | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("machines")
    .select(MACHINE_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("ดึงข้อมูลเครื่องจักรไม่สำเร็จ:", error.message);
    return null;
  }

  return data;
}

/** รายการค่าที่ใช้จริงของประเภท/สถานที่ เพื่อนำไปแสดงเป็นตัวกรอง */
export async function getMachineFacets(): Promise<{
  types: string[];
  locations: string[];
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("machines")
    .select("machine_type, location");

  if (error) {
    console.error("ดึงตัวกรองเครื่องจักรไม่สำเร็จ:", error.message);
    return { types: [], locations: [] };
  }

  const types = [...new Set((data ?? []).map((r) => r.machine_type))].sort();
  const locations = [...new Set((data ?? []).map((r) => r.location))].sort();

  return { types, locations };
}
