"use client";

import type { ReactNode } from "react";

/** ข้อความแจ้งผลลัพธ์ของฟอร์ม (สำเร็จ / ผิดพลาด) */
export function FormMessage({
  success,
  message,
}: {
  success?: boolean;
  message?: string;
}) {
  if (!message) return null;

  return (
    <div
      role={success ? "status" : "alert"}
      className={`rounded-lg px-3.5 py-2.5 text-sm ${
        success
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20"
          : "bg-red-50 text-red-800 ring-1 ring-inset ring-red-600/20"
      }`}
    >
      {message}
    </div>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors || errors.length === 0) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}

/** กรอบฟิลด์พร้อมป้ายกำกับและข้อความแสดงข้อผิดพลาด */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && !error ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
      <FieldError errors={error} />
    </div>
  );
}

/** className มาตรฐานสำหรับ input / select / textarea */
export const controlClass =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 disabled:bg-slate-50 disabled:text-slate-500";
