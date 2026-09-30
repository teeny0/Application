import Link from "next/link";

import { Badge, Card, CardHeader } from "@/components/ui/card";
import {
  HorizontalBarChart,
  StackedStatusBar,
  StatCard,
  TrendChart,
} from "@/components/ui/charts";
import {
  ALARM_STATUS_CHART_COLORS,
  ALARM_STATUS_LABELS,
  ALARM_STATUS_VALUES,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_VALUES,
  MACHINE_STATUS_CHART_COLORS,
  MACHINE_STATUS_LABELS,
  MACHINE_STATUS_VALUES,
} from "@/lib/constants";
import {
  getAlarmTrend,
  getAlarmsByMachine,
  getDashboardSummary,
} from "@/lib/data/dashboard";
import { requireApprovedUser } from "@/lib/data/auth";

// อ้างผ่าน CSS custom property ของ Tailwind เพื่อให้สีกราฟเปลี่ยนตามธีมได้เอง
const MAINTENANCE_CHART_COLORS = {
  pending: "var(--color-slate-500)",
  in_progress: "var(--color-blue-600)",
  completed: "var(--color-emerald-600)",
  cancelled: "var(--color-zinc-400)",
} as const;

export default async function DashboardPage() {
  const user = await requireApprovedUser();

  const [summary, alarmsByMachine, trend] = await Promise.all([
    getDashboardSummary(),
    getAlarmsByMachine(6),
    getAlarmTrend(7),
  ]);

  const machineTotal = MACHINE_STATUS_VALUES.reduce(
    (sum, status) => sum + summary.machineStatus[status],
    0,
  );

  const alarmTotal = ALARM_STATUS_VALUES.reduce(
    (sum, status) => sum + summary.alarmStatus[status],
    0,
  );

  const maintenanceTotal = MAINTENANCE_STATUS_VALUES.reduce(
    (sum, status) => sum + summary.maintenanceStatus[status],
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          แดชบอร์ด
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          สวัสดี {user.fullName ?? user.email} — ภาพรวมสถานะเครื่องจักรและงานที่ต้องดูแล
        </p>
      </div>

      {/* ตัวเลขสรุปหลัก */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="เครื่องจักรทั้งหมด"
          value={summary.totalMachines}
          hint={`แบ่งตามสถานะ ${machineTotal} รายการ`}
          accent="var(--color-slate-900)"
        />
        <StatCard
          label="Alarm ทั้งหมด"
          value={summary.totalAlarms}
          hint={`ยังค้างอยู่ ${summary.openAlarms} รายการ`}
          accent="var(--color-red-600)"
        />
        <StatCard
          label="งานบำรุงทั้งหมด"
          value={summary.totalMaintenance}
          hint={`ยังไม่เสร็จ ${summary.pendingMaintenance} งาน`}
          accent="var(--color-blue-600)"
        />
        <StatCard
          label="ช่างเทคนิค"
          value={summary.totalTechnicians}
          hint="ผู้ใช้ที่มีสิทธิ์ระดับช่าง"
          accent="var(--color-emerald-600)"
        />
      </div>

      {/* สัดส่วนเครื่องจักรตามสถานะ */}
      <Card>
        <CardHeader
          title="จำนวนเครื่องจักรแยกตามสถานะ"
          description="Running, Stop, Alarm และ Maintenance"
          action={
            <Link
              href="/machines"
              className="text-xs font-medium text-slate-600 underline-offset-4 hover:underline"
            >
              ดูเครื่องจักรทั้งหมด
            </Link>
          }
        />
        <div className="px-5 py-5">
          <StackedStatusBar
            total={machineTotal}
            segments={MACHINE_STATUS_VALUES.map((status) => ({
              key: status,
              label: MACHINE_STATUS_LABELS[status],
              value: summary.machineStatus[status],
              color: MACHINE_STATUS_CHART_COLORS[status],
            }))}
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* สถานะ Alarm */}
        <Card>
          <CardHeader
            title="สถานะ Alarm"
            description="Open, In Progress และ Closed"
            action={
              <Link
                href="/alarms"
                className="text-xs font-medium text-slate-600 underline-offset-4 hover:underline"
              >
                ดู Alarm ทั้งหมด
              </Link>
            }
          />
          <div className="px-5 py-5">
            <StackedStatusBar
              total={alarmTotal}
              segments={ALARM_STATUS_VALUES.map((status) => ({
                key: status,
                label: ALARM_STATUS_LABELS[status],
                value: summary.alarmStatus[status],
                color: ALARM_STATUS_CHART_COLORS[status],
              }))}
            />
          </div>
        </Card>

        {/* สถานะงานบำรุง */}
        <Card>
          <CardHeader
            title="สถานะงานบำรุง"
            description="งานทั้งหมดแยกตามความคืบหน้า"
            action={
              <Link
                href="/maintenance"
                className="text-xs font-medium text-slate-600 underline-offset-4 hover:underline"
              >
                ดูงานบำรุงทั้งหมด
              </Link>
            }
          />
          <div className="px-5 py-5">
            <StackedStatusBar
              total={maintenanceTotal}
              segments={MAINTENANCE_STATUS_VALUES.map((status) => ({
                key: status,
                label: MAINTENANCE_STATUS_LABELS[status],
                value: summary.maintenanceStatus[status],
                color: MAINTENANCE_CHART_COLORS[status],
              }))}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alarm รายเครื่องจักร */}
        <Card>
          <CardHeader
            title="เครื่องจักรที่มี Alarm มากที่สุด"
            description="เรียงจากมากไปน้อย 6 อันดับแรก"
          />
          <div className="px-5 py-5">
            <HorizontalBarChart
              emptyMessage="ยังไม่มีข้อมูล Alarm"
              items={alarmsByMachine.map((m) => ({
                label: m.machine_code,
                sublabel: m.machine_name,
                value: m.total,
                color: "var(--color-slate-900)",
              }))}
            />
          </div>
        </Card>

        {/* แนวโน้ม 7 วัน */}
        <Card>
          <CardHeader
            title="Alarm ที่เกิดขึ้น 7 วันล่าสุด"
            description={`รวม ${trend.reduce((sum, p) => sum + p.total, 0)} รายการ`}
          />
          <div className="px-5 py-5">
            <TrendChart
              points={trend.map((p) => ({ date: p.date, value: p.total }))}
            />
          </div>
        </Card>
      </div>

      {/* สรุปสถานะที่ต้องให้ความสนใจ */}
      <Card>
        <CardHeader
          title="รายการที่ควรติดตาม"
          description="เครื่องจักรที่หยุดทำงาน และ Alarm ที่ยังไม่ปิด"
        />
        <div className="flex flex-wrap gap-2 px-5 py-4">
          <Badge className="bg-red-100 text-red-800 ring-red-600/20">
            Alarm ที่ยังเปิด: {summary.alarmStatus.open}
          </Badge>
          <Badge className="bg-amber-100 text-amber-800 ring-amber-600/20">
            Alarm กำลังดำเนินการ: {summary.alarmStatus.in_progress}
          </Badge>
          <Badge className="bg-slate-100 text-slate-700 ring-slate-600/20">
            เครื่องจักรหยุด: {summary.machineStatus.stop}
          </Badge>
          <Badge className="bg-amber-100 text-amber-800 ring-amber-600/20">
            เครื่องจักรกำลังบำรุง: {summary.machineStatus.maintenance}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
