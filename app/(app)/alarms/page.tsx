import Link from "next/link";

import { Badge, Card, CardHeader } from "@/components/ui/card";
import { controlClass } from "@/components/ui/form";
import {
  ALARM_STATUS_LABELS,
  ALARM_STATUS_STYLES,
  ALARM_STATUS_VALUES,
} from "@/lib/constants";
import { getAlarms, getAlarmCodeFacets } from "@/lib/data/alarms";
import { getMachineOptions } from "@/lib/data/machines";
import { getTechnicians } from "@/lib/data/maintenance";
import { requireApprovedUser } from "@/lib/data/auth";
import { displayName, formatDateTime } from "@/lib/format";
import type { AlarmStatus } from "@/lib/types/database";

import { AlarmCreatePanel, AlarmForm } from "./alarm-form";

function parseStatus(value: string | string[] | undefined): AlarmStatus | "" {
  const raw = Array.isArray(value) ? value[0] : value;
  return ALARM_STATUS_VALUES.includes(raw as AlarmStatus)
    ? (raw as AlarmStatus)
    : "";
}

function parseString(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

export default async function AlarmsPage(props: PageProps<"/alarms">) {
  await requireApprovedUser();
  const searchParams = await props.searchParams;

  const filters = {
    search: parseString(searchParams.q),
    status: parseStatus(searchParams.status),
    machineId: parseString(searchParams.machine),
    alarmCode: parseString(searchParams.code),
    technicianId: parseString(searchParams.technician),
    dateFrom: parseString(searchParams.from),
    dateTo: parseString(searchParams.to),
  };

  const editId = parseString(searchParams.edit);

  const [alarms, machines, technicians, alarmCodes] = await Promise.all([
    getAlarms(filters),
    getMachineOptions(),
    getTechnicians(),
    getAlarmCodeFacets(),
  ]);

  const editing = editId ? (alarms.find((a) => a.id === editId) ?? null) : null;

  const hasFilters = Boolean(
    filters.search ||
      filters.status ||
      filters.machineId ||
      filters.alarmCode ||
      filters.technicianId ||
      filters.dateFrom ||
      filters.dateTo,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Alarm
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Alarm Record — บันทึกและติดตามสถานะการแจ้งเตือนของเครื่องจักร
          </p>
        </div>

        {!editing ? (
          <AlarmCreatePanel machines={machines} technicians={technicians} />
        ) : null}
      </div>

      {/* ฟอร์มแก้ไข */}
      {editing ? (
        <Card>
          <CardHeader
            title={`แก้ไข Alarm: ${editing.alarm_code}`}
            description={`${editing.machine?.machine_name ?? ""} — ${editing.alarm_description}`}
          />
          <div className="px-5 py-5">
            <AlarmForm
              alarm={editing}
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
          description="ค้นหาจาก Alarm Code/คำอธิบาย/เครื่องจักร หรือกรองตามสถานะ เครื่องจักร ช่าง และช่วงวันที่"
        />
        <form
          method="get"
          action="/alarms"
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
              placeholder="Alarm Code, คำอธิบาย, หรือชื่อเครื่องจักร"
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
              {ALARM_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {ALARM_STATUS_LABELS[status]}
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
              htmlFor="code"
              className="block text-sm font-medium text-slate-700"
            >
              Alarm Code
            </label>
            <select
              id="code"
              name="code"
              defaultValue={filters.alarmCode}
              className={`${controlClass} mt-1.5`}
            >
              <option value="">ทุก Alarm Code</option>
              {alarmCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="technician"
              className="block text-sm font-medium text-slate-700"
            >
              ช่างที่รับผิดชอบ
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
                href="/alarms"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                ล้างตัวกรอง
              </Link>
            ) : null}
            <span className="ml-auto text-sm text-slate-500">
              พบ {alarms.length} รายการ
            </span>
          </div>
        </form>
      </Card>

      {/* ตารางข้อมูล */}
      <Card>
        <CardHeader title="รายการ Alarm" />
        {alarms.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">
            {hasFilters
              ? "ไม่พบ Alarm ที่ตรงกับเงื่อนไขที่ค้นหา"
              : "ยังไม่มีข้อมูล Alarm ในระบบ"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-5 py-3">Alarm Code</th>
                  <th scope="col" className="px-5 py-3">เครื่องจักร</th>
                  <th scope="col" className="px-5 py-3">คำอธิบาย</th>
                  <th scope="col" className="px-5 py-3">วันที่/เวลา</th>
                  <th scope="col" className="px-5 py-3">สาเหตุ</th>
                  <th scope="col" className="px-5 py-3">ช่างผู้รับผิดชอบ</th>
                  <th scope="col" className="px-5 py-3">สถานะ</th>
                  <th scope="col" className="px-5 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alarms.map((alarm) => (
                  <tr key={alarm.id} className="align-top hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-slate-900">
                      {alarm.alarm_code}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-900">
                        {alarm.machine?.machine_name ?? "-"}
                      </span>
                      <span className="mt-0.5 block font-mono text-xs text-slate-500">
                        {alarm.machine?.machine_code ?? "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {alarm.alarm_description}
                    </td>
                    <td className="px-5 py-3 text-xs whitespace-nowrap text-slate-600">
                      {formatDateTime(alarm.occurred_at)}
                    </td>
                    <td className="max-w-[14rem] px-5 py-3 text-xs text-slate-600">
                      <span className="line-clamp-3">
                        {alarm.cause ?? "-"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">
                      {displayName(alarm.technician)}
                    </td>
                    <td className="px-5 py-3">
                      <Badge className={ALARM_STATUS_STYLES[alarm.status]}>
                        {ALARM_STATUS_LABELS[alarm.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/alarms?edit=${alarm.id}`}
                        className="inline-block rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        แก้ไข / เปลี่ยนสถานะ
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
