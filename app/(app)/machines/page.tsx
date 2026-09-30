import Link from "next/link";

import { Badge, Card, CardHeader } from "@/components/ui/card";
import { controlClass } from "@/components/ui/form";
import {
  MACHINE_STATUS_LABELS,
  MACHINE_STATUS_STYLES,
  MACHINE_STATUS_VALUES,
} from "@/lib/constants";
import { requireApprovedUser } from "@/lib/data/auth";
import { getMachineFacets, getMachines } from "@/lib/data/machines";
import { formatDate } from "@/lib/format";
import type { MachineStatus } from "@/lib/types/database";

import { DeleteMachineButton } from "./delete-machine-button";
import { MachineCreatePanel, MachineForm } from "./machine-form";

/** อ่านค่าจาก searchParams แล้วตรวจว่าเป็นค่าที่อนุญาตจริง */
function parseStatus(value: string | string[] | undefined): MachineStatus | "" {
  const raw = Array.isArray(value) ? value[0] : value;
  return MACHINE_STATUS_VALUES.includes(raw as MachineStatus)
    ? (raw as MachineStatus)
    : "";
}

function parseString(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

export default async function MachinesPage(props: PageProps<"/machines">) {
  const user = await requireApprovedUser();
  const searchParams = await props.searchParams;

  const isAdmin = user.role === "admin";

  const filters = {
    search: parseString(searchParams.q),
    status: parseStatus(searchParams.status),
    machineType: parseString(searchParams.type),
    location: parseString(searchParams.location),
  };

  const editId = parseString(searchParams.edit);
  const isCreating = parseString(searchParams.new) === "1";

  const [machines, facets] = await Promise.all([
    getMachines(filters),
    getMachineFacets(),
  ]);

  const editing =
    isAdmin && editId ? (machines.find((m) => m.id === editId) ?? null) : null;

  const hasFilters = Boolean(
    filters.search || filters.status || filters.machineType || filters.location,
  );

  // เก็บพารามิเตอร์เดิมไว้ เพื่อไม่ให้หลุดเงื่อนไขการกรองเมื่อกดแก้ไข/ลบ
  const queryString = new URLSearchParams();
  if (filters.search) queryString.set("q", filters.search);
  if (filters.status) queryString.set("status", filters.status);
  if (filters.machineType) queryString.set("type", filters.machineType);
  if (filters.location) queryString.set("location", filters.location);
  const filterQuery = queryString.toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            เครื่องจักร
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Machine Master — ข้อมูลหลักของเครื่องจักรทั้งหมดในระบบ
            {isAdmin ? "" : " (อ่านอย่างเดียว การแก้ไขเป็นหน้าที่ของ Admin)"}
          </p>
        </div>

        {isAdmin && !editing && !isCreating ? <MachineCreatePanel /> : null}
      </div>

      {/* ฟอร์มแก้ไข */}
      {editing ? (
        <Card>
          <CardHeader
            title={`แก้ไขเครื่องจักร: ${editing.machine_code}`}
            description={editing.machine_name}
          />
          <div className="px-5 py-5">
            <MachineForm machine={editing} />
          </div>
        </Card>
      ) : null}

      {/* ค้นหาและกรอง — 4 เงื่อนไข */}
      <Card>
        <CardHeader
          title="ค้นหาและกรองข้อมูล"
          description="ค้นหาจากชื่อ/รหัสเครื่อง หรือกรองตามสถานะ ประเภท และสถานที่"
        />
        <form
          method="get"
          action="/machines"
          className="grid gap-4 px-5 py-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label
              htmlFor="q"
              className="block text-sm font-medium text-slate-700"
            >
              ค้นหา (ชื่อ / Machine ID)
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={filters.search}
              placeholder="พิมพ์เพื่อค้นหา..."
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
              {MACHINE_STATUS_VALUES.map((status) => (
                <option key={status} value={status}>
                  {MACHINE_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="type"
              className="block text-sm font-medium text-slate-700"
            >
              ประเภทเครื่องจักร
            </label>
            <select
              id="type"
              name="type"
              defaultValue={filters.machineType}
              className={`${controlClass} mt-1.5`}
            >
              <option value="">ทุกประเภท</option>
              {facets.types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-slate-700"
            >
              สถานที่ตั้ง
            </label>
            <select
              id="location"
              name="location"
              defaultValue={filters.location}
              className={`${controlClass} mt-1.5`}
            >
              <option value="">ทุกสถานที่</option>
              {facets.locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              ค้นหา
            </button>
            {hasFilters ? (
              <Link
                href="/machines"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                ล้างตัวกรอง
              </Link>
            ) : null}
            <span className="ml-auto text-sm text-slate-500">
              พบ {machines.length} รายการ
            </span>
          </div>
        </form>
      </Card>

      {/* ตารางข้อมูล */}
      <Card>
        <CardHeader title="รายการเครื่องจักร" />
        {machines.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">
            {hasFilters
              ? "ไม่พบเครื่องจักรที่ตรงกับเงื่อนไขที่ค้นหา"
              : "ยังไม่มีข้อมูลเครื่องจักรในระบบ"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-5 py-3">Machine ID</th>
                  <th scope="col" className="px-5 py-3">ชื่อเครื่องจักร</th>
                  <th scope="col" className="px-5 py-3">ประเภท</th>
                  <th scope="col" className="px-5 py-3">สถานที่ตั้ง</th>
                  <th scope="col" className="px-5 py-3">สถานะ</th>
                  <th scope="col" className="px-5 py-3">แก้ไขล่าสุด</th>
                  {isAdmin ? (
                    <th scope="col" className="px-5 py-3 text-right">
                      จัดการ
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {machines.map((machine) => (
                  <tr key={machine.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs font-medium text-slate-900">
                      {machine.machine_code}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {machine.machine_name}
                      {machine.description ? (
                        <span className="mt-0.5 block text-xs font-normal text-slate-500">
                          {machine.description}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {machine.machine_type}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {machine.location}
                    </td>
                    <td className="px-5 py-3">
                      <Badge className={MACHINE_STATUS_STYLES[machine.status]}>
                        {MACHINE_STATUS_LABELS[machine.status]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {formatDate(machine.updated_at)}
                    </td>
                    {isAdmin ? (
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/machines?edit=${machine.id}${
                              filterQuery ? `&${filterQuery}` : ""
                            }`}
                            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            แก้ไข
                          </Link>
                          <DeleteMachineButton machine={machine} />
                        </div>
                      </td>
                    ) : null}
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
