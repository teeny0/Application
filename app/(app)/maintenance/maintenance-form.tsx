"use client";

import { useActionState, useState } from "react";

import { createMaintenance, updateMaintenance } from "@/app/actions/maintenance";
import { SubmitButton } from "@/components/ui/submit-button";
import { controlClass, Field, FormMessage } from "@/components/ui/form";
import {
  MAINTENANCE_PRIORITY_LABELS,
  MAINTENANCE_PRIORITY_VALUES,
  MAINTENANCE_STATUS_LABELS,
  MAINTENANCE_STATUS_VALUES,
} from "@/lib/constants";
import { nowForDateTimeLocal, toDateTimeLocalValue } from "@/lib/format";
import type { MachineOption } from "@/lib/data/machines";
import type {
  MaintenanceDTO,
  TechnicianOption,
} from "@/lib/data/maintenance";

/** ฟอร์มบันทึก/แก้ไขงานบำรุง — Admin และ Technician ใช้ได้ */
export function MaintenanceForm({
  record,
  machines,
  technicians,
}: {
  record?: MaintenanceDTO;
  machines: MachineOption[];
  technicians: TechnicianOption[];
}) {
  const isEdit = Boolean(record);

  const [state, formAction] = useActionState(
    isEdit ? updateMaintenance : createMaintenance,
    null,
  );

  const values = {
    machineId: record?.machine_id ?? machines[0]?.id ?? "",
    title: record?.title ?? "",
    description: record?.description ?? "",
    scheduledAt: record
      ? toDateTimeLocalValue(record.scheduled_at)
      : nowForDateTimeLocal(),
    status: record?.status ?? "pending",
    priority: record?.priority ?? "medium",
    technicianId: record?.technician_id ?? "",
    cost: record?.cost !== null && record?.cost !== undefined
      ? String(record.cost)
      : "",
    partsUsed: record?.parts_used ?? "",
    notes: record?.notes ?? "",
  };

  return (
    <form action={formAction} className="space-y-4">
      {record ? <input type="hidden" name="id" value={record.id} /> : null}

      <FormMessage success={state?.success} message={state?.message} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="เครื่องจักร"
          htmlFor="machineId"
          required
          error={state?.fieldErrors?.machineId}
        >
          <select
            id="machineId"
            name="machineId"
            defaultValue={values.machineId}
            required
            className={controlClass}
          >
            <option value="">— เลือกเครื่องจักร —</option>
            {machines.map((machine) => (
              <option key={machine.id} value={machine.id}>
                {machine.machine_code} — {machine.machine_name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="วันที่/เวลาที่วางแผน"
          htmlFor="scheduledAt"
          required
          error={state?.fieldErrors?.scheduledAt}
        >
          <input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            defaultValue={values.scheduledAt}
            required
            className={controlClass}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field
            label="หัวข้องาน"
            htmlFor="title"
            required
            error={state?.fieldErrors?.title}
          >
            <input
              id="title"
              name="title"
              defaultValue={values.title}
              required
              placeholder="เช่น เปลี่ยนเบรกและตรวจระดับน้ำมัน"
              className={controlClass}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field
            label="รายละเอียดงาน"
            htmlFor="description"
            error={state?.fieldErrors?.description}
          >
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={values.description ?? ""}
              placeholder="รายละเอียดขอบเขตงาน"
              className={controlClass}
            />
          </Field>
        </div>

        <Field
          label="สถานะ"
          htmlFor="status"
          required
          error={state?.fieldErrors?.status}
        >
          <select
            id="status"
            name="status"
            defaultValue={values.status}
            required
            className={controlClass}
          >
            {MAINTENANCE_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {MAINTENANCE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="ระดับความสำคัญ"
          htmlFor="priority"
          required
          error={state?.fieldErrors?.priority}
        >
          <select
            id="priority"
            name="priority"
            defaultValue={values.priority}
            required
            className={controlClass}
          >
            {MAINTENANCE_PRIORITY_VALUES.map((priority) => (
              <option key={priority} value={priority}>
                {MAINTENANCE_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="ช่างผู้ดำเนินงาน"
          htmlFor="technicianId"
          error={state?.fieldErrors?.technicianId}
        >
          <select
            id="technicianId"
            name="technicianId"
            defaultValue={values.technicianId}
            className={controlClass}
          >
            <option value="">— ยังไม่กำหนด —</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.full_name ?? tech.email}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="ค่าใช้จ่าย (บาท)"
          htmlFor="cost"
          error={state?.fieldErrors?.cost}
          hint="ใส่ได้หลังจากดำเนินงานเสร็จ"
        >
          <input
            id="cost"
            name="cost"
            type="number"
            step="0.01"
            min="0"
            defaultValue={values.cost}
            placeholder="0.00"
            className={controlClass}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field
            label="อะไหล่ที่ใช้"
            htmlFor="partsUsed"
            error={state?.fieldErrors?.partsUsed}
          >
            <input
              id="partsUsed"
              name="partsUsed"
              defaultValue={values.partsUsed ?? ""}
              placeholder="เช่น เบรกผ้า 2 ชิ้น, น้ำมันเครื่อง 5 ลิตร"
              className={controlClass}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field
            label="บันทึกเพิ่มเติม"
            htmlFor="notes"
            error={state?.fieldErrors?.notes}
          >
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={values.notes ?? ""}
              placeholder="ผลการดำเนินงาน ปัญหาที่พบ หรือข้อเสนอแนะ"
              className={controlClass}
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>
          {isEdit ? "บันทึกการแก้ไข" : "บันทึกงานบำรุง"}
        </SubmitButton>
        {isEdit ? (
          <a
            href="/maintenance"
            className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
          >
            ยกเลิก
          </a>
        ) : null}
      </div>
    </form>
  );
}

/** ปุ่มเปิด/ปิดฟอร์มบันทึกงานบำรุงใหม่ */
export function MaintenanceCreatePanel(props: {
  machines: MachineOption[];
  technicians: TechnicianOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          <span aria-hidden>+</span>
          บันทึกงานบำรุงใหม่
        </button>
      ) : (
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              บันทึกงานบำรุงใหม่
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-slate-500 underline-offset-4 hover:underline"
            >
              ปิด
            </button>
          </div>
          <MaintenanceForm {...props} />
        </div>
      )}
    </div>
  );
}
