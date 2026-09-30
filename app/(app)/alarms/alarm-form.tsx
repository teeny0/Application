"use client";

import { useActionState, useState } from "react";

import { createAlarm, updateAlarm } from "@/app/actions/alarms";
import { SubmitButton } from "@/components/ui/submit-button";
import { controlClass, Field, FormMessage } from "@/components/ui/form";
import { ALARM_STATUS_LABELS, ALARM_STATUS_VALUES } from "@/lib/constants";
import { nowForDateTimeLocal, toDateTimeLocalValue } from "@/lib/format";
import type { AlarmDTO } from "@/lib/data/alarms";
import type { MachineOption } from "@/lib/data/machines";
import type { TechnicianOption } from "@/lib/data/maintenance";

/** ฟอร์มบันทึก/แก้ไข Alarm — Admin และ Technician ใช้ได้ */
export function AlarmForm({
  alarm,
  machines,
  technicians,
}: {
  alarm?: AlarmDTO;
  machines: MachineOption[];
  technicians: TechnicianOption[];
}) {
  const isEdit = Boolean(alarm);

  const [state, formAction] = useActionState(
    isEdit ? updateAlarm : createAlarm,
    null,
  );

  const values = {
    machineId: alarm?.machine_id ?? machines[0]?.id ?? "",
    alarmCode: alarm?.alarm_code ?? "",
    alarmDescription: alarm?.alarm_description ?? "",
    occurredAt: alarm
      ? toDateTimeLocalValue(alarm.occurred_at)
      : nowForDateTimeLocal(),
    cause: alarm?.cause ?? "",
    status: alarm?.status ?? "open",
    assignedTo: alarm?.assigned_to ?? "",
  };

  return (
    <form action={formAction} className="space-y-4">
      {alarm ? <input type="hidden" name="id" value={alarm.id} /> : null}

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
          label="Alarm Code"
          htmlFor="alarmCode"
          required
          error={state?.fieldErrors?.alarmCode}
        >
          <input
            id="alarmCode"
            name="alarmCode"
            defaultValue={values.alarmCode}
            required
            placeholder="เช่น ALM-1024"
            className={controlClass}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field
            label="Alarm Description (คำอธิบาย)"
            htmlFor="alarmDescription"
            required
            error={state?.fieldErrors?.alarmDescription}
          >
            <input
              id="alarmDescription"
              name="alarmDescription"
              defaultValue={values.alarmDescription}
              required
              placeholder="เช่น อุณหภูมิสูงเกินกำหนด"
              className={controlClass}
            />
          </Field>
        </div>

        <Field
          label="วันที่และเวลาที่เกิด"
          htmlFor="occurredAt"
          required
          error={state?.fieldErrors?.occurredAt}
        >
          <input
            id="occurredAt"
            name="occurredAt"
            type="datetime-local"
            defaultValue={values.occurredAt}
            required
            className={controlClass}
          />
        </Field>

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
            {ALARM_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {ALARM_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field
            label="Cause (สาเหตุ)"
            htmlFor="cause"
            error={state?.fieldErrors?.cause}
            hint="ระบุสาเหตุที่พบ ถ้ายังไม่ทราบสามารถเว้นว่างไว้ก่อน"
          >
            <textarea
              id="cause"
              name="cause"
              rows={3}
              defaultValue={values.cause ?? ""}
              placeholder="เช่น สายพานขาดความตึง"
              className={controlClass}
            />
          </Field>
        </div>

        <Field
          label="มอบหมายให้ช่าง (Technician)"
          htmlFor="assignedTo"
          error={state?.fieldErrors?.assignedTo}
        >
          <select
            id="assignedTo"
            name="assignedTo"
            defaultValue={values.assignedTo}
            className={controlClass}
          >
            <option value="">— ยังไม่มอบหมาย —</option>
            {technicians.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.full_name ?? tech.email}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>
          {isEdit ? "บันทึกการแก้ไข" : "บันทึก Alarm"}
        </SubmitButton>
        {isEdit ? (
          <a
            href="/alarms"
            className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
          >
            ยกเลิก
          </a>
        ) : null}
      </div>
    </form>
  );
}

/** ปุ่มเปิด/ปิดฟอร์มบันทึก Alarm ใหม่ */
export function AlarmCreatePanel(props: {
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
          บันทึก Alarm ใหม่
        </button>
      ) : (
        <div className="w-full space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              บันทึก Alarm ใหม่
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-slate-500 underline-offset-4 hover:underline"
            >
              ปิด
            </button>
          </div>
          <AlarmForm {...props} />
        </div>
      )}
    </div>
  );
}
