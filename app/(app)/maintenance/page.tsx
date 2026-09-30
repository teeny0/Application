import Link from "next/link";

import { Badge, Card, CardHeader } from "@/components/ui/card";
import { controlClass } from "@/components/ui/form";
import {
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_PRIORITY_STYLES,
  MAINTENANCE_PRIORITY_VALUES,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_STYLES,
  MAINTENANCE_STATUS_VALUES,
} from "@/lib/constants";
import { requireApprovedUser } from "@/lib/data/auth";
import { getMachineOptions } from "@/lib/data/machines";
import {
  getMaintenanceRecords,
  getTechnicians,
} from "@/lib/data/maintenance";
import { displayName, formatCurrency, formatDateTime } from "@/lib/format";
import type {
  MaintenancePriority,
  MaintenanceStatus,
} from "@/lib/types/database";

import {
  MaintenanceCreatePanel,
  MaintenanceForm,
} from "./maintenance-form";

function parseStatus(
  value: string | string[] | undefined,
): MaintenanceStatus | "" {
  const raw = Array.isArray(value) ? value[0] : value;
  return MAINTENANCE_STATUS_VALUES.includes(raw as MaintenanceStatus)
    ? (raw as MaintenanceStatus)
    : "";
}

function parsePriority(
  value: string | string[] | undefined,
): MaintenancePriority | "" {
  const raw = Array.isArray(value) ? value[0] : value;
  return MAINTENANCE_PRIORITY_VALUES.includes(raw as MaintenancePriority)
    ? (raw as MaintenancePriority)
    : "";
}

function parseString(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

export default async function MaintenancePage(
  props: PageProps<"/maintenance">,
) {
  await requireApprovedUser();
  const searchParams = await props.searchParams;

  const filters = {
    search: parseString(searchParams.q),
    status: parseStatus(searchParams.status),
    priority: parsePriority(searchParams.priority),
    machineId: parseString(searchParams.machine),
    technicianId: parseString(searchParams.technician),
    dateFrom: parseString(searchParams.from),
    dateTo: parseString(searchParams.to),
  };

  const editId = parseString(searchParams.edit);

  const [records, machines, technicians] = await Promise.all([
    getMaintenanceRecords(filters),
    getMachineOptions(),
    getTechnicians(),
  ]);

  const editing = editId
    ? (records.find((r) => r.id === editId) ?? null)
    : null;

  const hasFilters = Boolean(
    filters.search ||
      filters.status ||
      filters.priority ||
      filters.machineId ||
      filters.technicianId ||
      filters.dateFrom ||
      filters.dateTo,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            งานบำรุง
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Maintenance Record — บันทึกและติดตามงานซ่อมบำรุงเครื่องจักร
          </p>
        </div>

        {!editing ? (
          <MaintenanceCreatePanel
            machines={machines}
            technicians={technicians}
          />
        ) : null}
      </div>

      {/* ฟอร์มแก้ไข */}
      {editing ? (
        <Card>
          <CardHeader
            title={`แก้ไขงานบำรุง: ${editing.title}`}
            description={`${editing.machine?.machine_name ?? ""} — ${editing.machine?.machine_code ?? ""}`}
          />
          <div className="px-5 py-5">
            <MaintenanceForm
              record={editing}
              machines={machines}
              technicians={technicians}
            />
          </div>
        </Card>
      ) : null}

      {/* ค้นหาและกรอง — 6 เงื่อนไข */}
      <Card>
        <CardHeader
          title="ค้นหาและกรองข้อมูล"
          description="ค้นหาจากหัวข้องาน/รายละเอียด/เครื่องจักร หรือกรองตามสถานะ ความสำคัญ เครื่องจักร ช่าง และช่วงวันที่"
        />
        <form
          method="get"
          action="/maintenance"
          className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div className="lg:col-span-2">
            <label
              htmlFor="q"
              className="block text-sm font-medium text-slate-700"
            >
              ค้นหา
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={filters.search}
              placeholder="หัวข้องาน, รายละเอียด, หรือชื่อเครื่องจักร"
              className={`${controlClass} mt-1.5`}
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-slate-700"
            >
              สถานะ
            </label>
            <select
              id="status"
              name="status"
              defaultValue={filters.status}
              className={`${controlClass} mt-1.5`}
            >
              <option value="">ทุกสถานะ</option>
              {MAINTENANCE_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {MAINTENANCE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="priority"
              className="block text-sm font-medium text-slate-700"
            >
              ระดับความสำคัญ
            </label>
            <select
              id="priority"
              name="priority"
              defaultValue={filters.priority}
              className={`${controlClass} mt-1.5`}
            >
              <option value="">ทุกระดับ</option>
              {MAINTENANCE_PRIORITY_VALUES.map((priority) => (
                <option key={priority} value={priority}>
                  {MAINTENANCE_PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="machine"
              className="block text-sm font-medium text-slate-700"
            >
              เครื่องจักร
            </label>
            <select
              id="machine"
              name="machine"
              defaultValue={filters.machineId}
              className={`${controlClass} mt-1.5`}
            >
              <option value="">ทุกเครื่องจักร</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.machine_code} — {machine.machine_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="technician"
              className="block text-sm font-medium text-slate-700"
            >
              ช่างผู้ดำเนินงาน
            </label>
            <select
              id="technician"
              name="technician"
              defaultValue={filters.technicianId}
              className={`${controlClass} mt-1.5`}
            >
              <option value="">ทุกคน</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.full_name ?? tech.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="from"
              className="block text-sm font-medium text-slate-700"
            >
              ตั้งแต่วันที่
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={filters.dateFrom}
              className={`${controlClass} mt-1.5`}
            />
          </div>

          <div>
            <label
              htmlFor="to"
              className="block text-sm font-medium text-slate-700"
            >
              ถึงวันที่
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={filters.dateTo}
              className={`${controlClass} mt-1.5`}
            />
          </div>

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              ค้นหา
            </button>
            {hasFilters ? (
              <Link
                href="/maintenance"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                ล้างตัวกรอง
              </Link>
            ) : null}
            <span className="ml-auto text-sm text-slate-500">
              พบ {records.length} รายการ
            </span>
          </div>
        </form>
      </Card>

      {/* ตารางข้อมูล */}
      <Card>
        <CardHeader title="รายการงานบำรุง" />
        {records.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">
            {hasFilters
              ? "ไม่พบงานบำรุงที่ตรงกับเงื่อนไขที่ค้นหา"
              : "ยังไม่มีข้อมูลงานบำรุงในระบบ"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-5 py-3">หัวข้องาน</th>
                  <th scope="col" className="px-5 py-3">เครื่องจักร</th>
                  <th scope="col" className="px-5 py-3">วันที่วางแผน</th>
                  <th scope="col" className="px-5 py-3">ช่างผู้ดำเนินงาน</th>
                  <th scope="col" className="px-5 py-3">ความสำคัญ</th>
                  <th scope="col" className="px-5 py-3">สถานะ</th>
                  <th scope="col" className="px-5 py-3 text-right">ค่าใช้จ่าย</th>
                  <th scope="col" className="px-5 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.id} className="align-top hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-900">
                        {record.title}
                      </span>
                      {record.description ? (
                        <span className="mt-0.5 block max-w-[18rem] text-xs text-slate-500">
                          {record.description}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-slate-700">
                        {record.machine?.machine_name ?? "-"}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-slate-500">
                        {record.machine?.machine_code ?? "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap text-slate-600">
                      {formatDateTime(record.scheduled_at)}
                      {record.completed_at ? (
                        <span className="mt-0.5 block text-emerald-700">
                          เสร็จ: {formatDateTime(record.completed_at)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">
                      {displayName(record.technician)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        className={MAINTENANCE_PRIORITY_STYLES[record.priority]}
                      >
                        {MAINTENANCE_PRIORITY_LABELS[record.priority]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        className={MAINTENANCE_STATUS_STYLES[record.status]}
                      >
                        {MAINTENANCE_STATUS_LABELS[record.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right text-xs whitespace-nowrap text-slate-700">
                      {formatCurrency(record.cost)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/maintenance?edit=${record.id}`}
                        className="inline-block rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        แก้ไข
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
