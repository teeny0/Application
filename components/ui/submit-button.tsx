"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** ปุ่ม submit ที่แสดงสถานะกำลังบันทึกอัตโนมัติ */
export function SubmitButton({
  children,
  pendingLabel = "กำลังบันทึก...",
  className = "",
  variant = "primary",
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();

  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    secondary:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
  } as const;

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {pending ? (
        <>
          <span
            aria-hidden
            className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
