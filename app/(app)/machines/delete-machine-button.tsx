"use client";

import { useEffect, useState } from "react";

import { deleteMachine } from "@/app/actions/machines";
import type { MachineDTO } from "@/lib/data/machines";

/**
 * ปุ่มลบเครื่องจักร (สำหรับ Admin เท่านั้น)
 *
 * ใช้การยืนยันสองขั้นตอน เพราะการลบเครื่องจักรจะลบ Alarm
 * และงานบำรุงของเครื่องนั้นทิ้งไปด้วย (on delete cascade)
 */
export function DeleteMachineButton({ machine }: { machine: MachineDTO }) {
  const [confirming, setConfirming] = useState(false);

  // ยกเลิกการยืนยันอัตโนมัติถ้าผู้ใช้ไม่กดอะไรภายใน 5 วินาที
  useEffect(() => {
    if (!confirming) return;

    const timer = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(timer);
  }, [confirming]);

  return (
    <form action={deleteMachine} className="inline">
      <input type="hidden" name="id" value={machine.id} />
      <button
        type="submit"
        onClick={(event) => {
          // คลิกครั้งแรกเพียงเปิดสถานะยืนยัน ไม่ยังส่งฟอร์ม
          if (!confirming) {
            event.preventDefault();
            setConfirming(true);
          }
        }}
        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
          confirming
            ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
            : "border-red-200 text-red-700 hover:bg-red-50"
        }`}
      >
        {confirming ? "ยืนยันลบ" : "ลบ"}
      </button>
    </form>
  );
}
