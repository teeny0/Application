import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  AlarmStatus,
  MaintenanceStatus,
  MachineStatus,
} from "@/lib/types/database";

export type DashboardSummary = {
  /** จำนวนเครื่องจักรทั้งหมด */
  totalMachines: number;
  /** จำนวนเครื่องจักรแยกตามสถานะ (มีครบทั้ง 4 สถานะเสมอ) */
  machineStatus: Record<MachineStatus, number>;
  /** จำนวน Alarm ทั้งหมด */
  totalAlarms: number;
  /** จำนวน Alarm แยกตามสถานะ */
  alarmStatus: Record<AlarmStatus, number>;
  /** จำนวน Alarm ที่ยังค้างอยู่ (เปิด + กำลังดำเนินการ) */
  openAlarms: number;
  /** จำนวนงานบำรุงทั้งหมด */
  totalMaintenance: number;
  /** จำนวนงานบำรุงแยกตามสถานะ */
  maintenanceStatus: Record<MaintenanceStatus, number>;
  /** งานบำรุงที่ยังไม่เสร็จ */
  pendingMaintenance: number;
  /** จำนวนช่างเทคนิคทั้งหมด */
  totalTechnicians: number;
};

/** จำนวน Alarm แยกตามเครื่องจักร (สำหรับกราฟแท่ง) */
export type AlarmByMachine = {
  machine_id: string;
  machine_code: string;
  machine_name: string;
  open: number;
  in_progress: number;
  closed: number;
  total: number;
};

/** จำนวน Alarm แยกตามวันที่ (7 วันล่าสุด) */
export type AlarmTrendPoint = {
  date: string;
  open: number;
  in_progress: number;
  closed: number;
  total: number;
};

function emptyMachineStatus(): Record<MachineStatus, number> {
  return { running: 0, stop: 0, alarm: 0, maintenance: 0 };
}

function emptyAlarmStatus(): Record<AlarmStatus, number> {
  return { open: 0, in_progress: 0, closed: 0 };
}

function emptyMaintenanceStatus(): Record<MaintenanceStatus, number> {
  return { pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
}

/** นับจำนวนแถวในตาราง */
async function countRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "machines" | "alarms" | "maintenance_records" | "profiles",
): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) {
    console.error(`นับจำนวน ${table} ไม่สำเร็จ:`, error.message);
    return 0;
  }

  return count ?? 0;
}

/** ดึงตัวเลขสรุปทั้งหมดสำหรับ Dashboard */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createClient();

  const machineStatus = emptyMachineStatus();
  const alarmStatus = emptyAlarmStatus();
  const maintenanceStatus = emptyMaintenanceStatus();

  // นับเครื่องจักรแยกตามสถานะ
  const machineCounts = await Promise.all(
    (Object.keys(machineStatus) as MachineStatus[]).map(async (status) => {
      const { count, error } = await supabase
        .from("machines")
        .select("id", { count: "exact", head: true })
        .eq("status", status);

      if (error) {
        console.error(`นับเครื่องจักรสถานะ ${status} ไม่สำเร็จ:`, error.message);
        return 0;
      }
      return count ?? 0;
    }),
  );

  (Object.keys(machineStatus) as MachineStatus[]).forEach((status, i) => {
    machineStatus[status] = machineCounts[i];
  });

  // นับ Alarm แยกตามสถานะ
  const alarmCounts = await Promise.all(
    (Object.keys(alarmStatus) as AlarmStatus[]).map(async (status) => {
      const { count, error } = await supabase
        .from("alarms")
        .select("id", { count: "exact", head: true })
        .eq("status", status);

      if (error) {
        console.error(`นับ Alarm สถานะ ${status} ไม่สำเร็จ:`, error.message);
        return 0;
      }
      return count ?? 0;
    }),
  );

  (Object.keys(alarmStatus) as AlarmStatus[]).forEach((status, i) => {
    alarmStatus[status] = alarmCounts[i];
  });

  // นับงานบำรุงแยกตามสถานะ
  const maintenanceCounts = await Promise.all(
    (Object.keys(maintenanceStatus) as MaintenanceStatus[]).map(
      async (status) => {
        const { count, error } = await supabase
          .from("maintenance_records")
          .select("id", { count: "exact", head: true })
          .eq("status", status);

        if (error) {
          console.error(`นับงานบำรุงสถานะ ${status} ไม่สำเร็จ:`, error.message);
          return 0;
        }
        return count ?? 0;
      },
    ),
  );

  (Object.keys(maintenanceStatus) as MaintenanceStatus[]).forEach(
    (status, i) => {
      maintenanceStatus[status] = maintenanceCounts[i];
    },
  );

  const [totalMachines, totalAlarms, totalMaintenance, totalTechnicians] =
    await Promise.all([
      countRows(supabase, "machines"),
      countRows(supabase, "alarms"),
      countRows(supabase, "maintenance_records"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "technician")
        .then(({ count }) => count ?? 0),
    ]);

  return {
    totalMachines,
    machineStatus,
    totalAlarms,
    alarmStatus,
    openAlarms: alarmStatus.open + alarmStatus.in_progress,
    totalMaintenance,
    maintenanceStatus,
    pendingMaintenance:
      maintenanceStatus.pending + maintenanceStatus.in_progress,
    totalTechnicians,
  };
}

/** จำนวน Alarm แยกตามเครื่องจักร เรียงจากมากไปน้อย ไม่เกิน `limit` เครื่อง */
export async function getAlarmsByMachine(
  limit = 6,
): Promise<AlarmByMachine[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("alarms")
    .select("machine_id, status, machine:machines ( machine_code, machine_name )")
    .order("occurred_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("ดึงข้อมูล Alarm เพื่อทำกราฟไม่สำเร็จ:", error.message);
    return [];
  }

  const grouped = new Map<string, AlarmByMachine>();

  for (const row of data ?? []) {
    const machine = (
      row as unknown as {
        machine: { machine_code: string; machine_name: string } | null;
      }
    ).machine;

    let entry = grouped.get(row.machine_id);

    if (!entry) {
      entry = {
        machine_id: row.machine_id,
        machine_code: machine?.machine_code ?? "-",
        machine_name: machine?.machine_name ?? "ไม่ทราบชื่อ",
        open: 0,
        in_progress: 0,
        closed: 0,
        total: 0,
      };
      grouped.set(row.machine_id, entry);
    }

    const status = row.status as AlarmStatus;
    if (status in entry) {
      entry[status] += 1;
      entry.total += 1;
    }
  }

  return [...grouped.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** จำนวน Alarm แยกตามวันที่ ย้อนหลัง `days` วัน (รวมวันที่ไม่มีข้อมูลด้วย) */
export async function getAlarmTrend(days = 7): Promise<AlarmTrendPoint[]> {
  const supabase = await createClient();

  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  const fromIso = from.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("alarms")
    .select("occurred_at, status")
    .gte("occurred_at", `${fromIso}T00:00:00.000Z`)
    .limit(2000);

  if (error) {
    console.error("ดึงข้อมูลแนวโน้ม Alarm ไม่สำเร็จ:", error.message);
    return [];
  }

  const buckets = new Map<string, AlarmTrendPoint>();

  for (let i = 0; i < days; i += 1) {
    const d = new Date(from);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, {
      date: key,
      open: 0,
      in_progress: 0,
      closed: 0,
      total: 0,
    });
  }

  for (const row of data ?? []) {
    const key = row.occurred_at.slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;

    const status = row.status as AlarmStatus;
    if (status in bucket) {
      bucket[status] += 1;
      bucket.total += 1;
    }
  }

  return [...buckets.values()];
}
