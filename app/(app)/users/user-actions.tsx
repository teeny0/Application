"use client";

import { useState } from "react";

import {
  approveUser,
  changeUserRole,
  revokeUser,
} from "@/app/actions/users";
import { ROLE_LABELS } from "@/lib/constants";
import type { UserDTO } from "@/lib/data/users";
import type { AppRole } from "@/lib/types/database";

/**
 * ปุ่มจัดการสิทธิ์ผู้ใช้ (สำหรับ Admin เท่านั้น)
 *
 * ใช้การยืนยันสองขั้นตอนกับการยกเลิกสิทธิ์ เพราะการกดแล้วผู้นั้นจะ
 * ถูกบล็อกออกจากระบบทันทีจนกว่าจะได้รับอนุมัติอีกครั้ง
 */
export function ApprovalToggle({
  user,
  isSelf,
}: {
  user: UserDTO;
  isSelf: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  // admin เข้าใช้งานได้เสมอ จึงไม่ต้องอนุมัติ — แสดงป้ายสถานะแทน
  if (user.role === "admin") {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-500/20">
        ไม่ต้องอนุมัติ
      </span>
    );
  }

  if (isSelf) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-500/20">
        บัญชีคุณ
      </span>
    );
  }

  const approved = user.isApproved;
  const action = approved ? revokeUser : approveUser;

  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={user.id} />
      <button
        type="submit"
        onClick={(event) => {
          // ยกเลิกสิทธิ์ต้องกดยืนยันก่อน ส่วนการอนุมัติทำได้เลย
          if (approved && !confirming) {
            event.preventDefault();
            setConfirming(true);
          }
        }}
        onBlur={() => setConfirming(false)}
        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
          approved
            ? confirming
              ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
              : "border-red-200 text-red-700 hover:bg-red-50"
            : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
        }`}
      >
        {approved ? (confirming ? "ยืนยันยกเลิกสิทธิ์" : "ยกเลิกสิทธิ์") : "อนุมัติ"}
      </button>
    </form>
  );
}

/** ปุ่มสลับระดับสิทธิ์ระหว่างช่างเทคนิคกับผู้ดูแลระบบ */
export function RoleToggle({ user, isSelf }: { user: UserDTO; isSelf: boolean }) {
  if (isSelf) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-500/20">
        {ROLE_LABELS[user.role]}
      </span>
    );
  }

  const nextRole: AppRole = user.role === "admin" ? "technician" : "admin";

  return (
    <form action={changeUserRole} className="inline">
      <input type="hidden" name="id" value={user.id} />
      <input type="hidden" name="role" value={nextRole} />
      <button
        type="submit"
        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
      >
        ทำเป็น{ROLE_LABELS[nextRole]}
      </button>
    </form>
  );
}
