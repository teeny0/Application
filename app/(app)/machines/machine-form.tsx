"use client";

import { useActionState, useState } from "react";

import { createMachine, updateMachine } from "@/app/actions/machines";
import { SubmitButton } from "@/components/ui/submit-button";
import { controlClass, Field, FormMessage } from "@/components/ui/form";
import { MACHINE_STATUS_LABELS, MACHINE_STATUS_VALUES } from "@/lib/constants";
import type { MachineDTO } from "@/lib/data/machines";

type MachineFormFields = {
  machineCode?: string;
  machineName?: string;
  machineType?: string;
  location?: string;
  status?: string;
  description?: string;
};

/**
 * ฟอร์มเพิ่ม/แก้ไขเครื่องจักร (สำหรับ Admin เท่านั้น)
 * เมื่อส่ง machine จะทำการแก้ไขข้อมูลเดิม ถ้าไม่ส่งจะเป็นการเพิ่มใหม่
 */
export function MachineForm({
  machine,
  defaultValues,
}: {
  machine?: MachineDTO;
  defaultValues?: MachineFormFields;
}) {
  const isEdit = Boolean(machine);

  const [state, formAction] = useActionState(
    isEdit ? updateMachine : createMachine,
    null,
  );

  const values = {
    machineCode: machine?.machine_code ?? defaultValues?.machineCode ?? "",
    machineName: machine?.machine_name ?? defaultValues?.machineName ?? "",
    machineType: machine?.machine_type ?? defaultValues?.machineType ?? "",
    location: machine?.location ?? defaultValues?.location ?? "",
    status: machine?.status ?? defaultValues?.status ?? "running",
    description: machine?.description ?? defaultValues?.description ?? "",
  };

  return (
    <form action={formAction} className="space-y-4">
      {machine ? <input type="hidden" name="id" value={machine.id} /> : null}

      <FormMessage success={state?.success} message={state?.message} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Machine ID (รหัสเครื่องจักร)"
          htmlFor="machineCode"
          required
          error={state?.fieldErrors?.machineCode}
        >
          <input
            id="machineCode"
            name="machineCode"
            defaultValue={values.machineCode}
            required
            placeholder="เช่น MC-001"
            className={controlClass}
          />
        </Field>

        <Field
          label="Machine Name (ชื่อเครื่องจักร)"
          htmlFor="machineName"
          required
          error={state?.fieldErrors?.machineName}
        >
          <input
            id="machineName"
            name="machineName"
            defaultValue={values.machineName}
            required
            placeholder="เช่น เครื่องผลิตกระดาษ A"
            className={controlClass}
          />
        </Field>

        <Field
          label="Machine Type (ประเภท)"
          htmlFor="machineType"
          required
          error={state?.fieldErrors?.machineType}
        >
          <input
            id="machineType"
            name="machineType"
            defaultValue={values.machineType}
            required
            placeholder="เช่น สายพาน, เครื่องอัด, เตาเผา"
            className={controlClass}
          />
        </Field>

        <Field
          label="Location (สถานที่ตั้ง)"
          htmlFor="location"
          required
          error={state?.fieldErrors?.location}
        >
          <input
            id="location"
            name="location"
            defaultValue={values.location}
            required
            placeholder="เช่น โรงงาน 1 / บริเวณผลิต A"
            className={controlClass}
          />
        </Field>

        <Field
          label="Status (สถานะ)"
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
            {MACHINE_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {MACHINE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="รายละเอียดเพิ่มเติม"
          htmlFor="description"
          error={state?.fieldErrors?.description}
        >
          <input
            id="description"
            name="description"
            defaultValue={values.description ?? ""}
            placeholder="ไม่บังคับ"
            className={controlClass}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <SubmitButton>{isEdit ? "บันทึกการแก้ไข" : "เพิ่มเครื่องจักร"}</SubmitButton>
        {isEdit ? <CancelEditLink /> : null}
      </div>
    </form>
  );
}

function CancelEditLink() {
  return (
    <a
      href="/machines"
      className="text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
    >
      ยกเลิก
    </a>
  );
}

/** ปุ่มเปิด/ปิดฟอร์มเพิ่มเครื่องจักรใหม่ */
export function MachineCreatePanel({
  defaultValues,
}: {
  defaultValues?: MachineFormFields;
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
          เพิ่มเครื่องจักรใหม่
        </button>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900">
              เพิ่มเครื่องจักรใหม่
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-slate-500 underline-offset-4 hover:underline"
            >
              ปิด
            </button>
          </div>
          <MachineForm defaultValues={defaultValues} />
        </div>
      )}
    </div>
  );
}
