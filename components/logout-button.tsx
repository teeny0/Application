"use client";

import { useFormStatus } from "react-dom";

import { logout } from "@/app/actions/auth";

/** ปุ่มออกจากระบบ (ส่งผ่าน form เพื่อเรียก Server Action) */
export function LogoutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logout}>
      <LogoutSubmit compact={compact} />
    </form>
  );
}

function LogoutSubmit({ compact }: { compact: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={
        compact
          ? "text-xs font-medium text-slate-500 transition hover:text-slate-900 disabled:opacity-60"
          : "inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      }
    >
      {compact ? (pending ? "กำลังออกจากระบบ..." : "ออกจากระบบ") : "ออกจากระบบ"}
    </button>
  );
}
