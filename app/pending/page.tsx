import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser } from "@/lib/data/auth";

export const metadata: Metadata = {
  title: "รอการอนุมัติ | ระบบจัดการการบำรุงเครื่องจักร",
};

export default async function PendingApprovalPage() {
  const user = await requireUser();

  // อนุมัติแล้วหรือเป็น admin — ไม่ต้องอยู่ที่หน้านี้
  if (user.isApproved) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-xl bg-amber-100 text-2xl">
            ⏳
          </div>

          <h1 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">
            อยู่ระหว่างรอการอนุมัติ
          </h1>

          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            บัญชีของคุณถูกสร้างเรียบร้อยแล้ว แต่ยังไม่ได้รับอนุมัติให้เข้าใช้งาน
            ผู้ดูแลระบบ (Admin) จะตรวจสอบและอนุมัติก่อน
          </p>

          <dl className="mt-5 space-y-2 rounded-lg bg-slate-50 px-4 py-3 text-sm ring-1 ring-inset ring-slate-200">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">ชื่อ</dt>
              <dd className="font-medium text-slate-900">
                {user.fullName ?? "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">อีเมล</dt>
              <dd className="truncate font-medium text-slate-900">
                {user.email}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">สิทธิ์ที่ขอ</dt>
              <dd className="font-medium text-slate-900">ช่างเทคนิค</dd>
            </div>
          </dl>

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            เมื่อได้รับอนุมัติแล้ว ให้กดลิงก์เข้าสู่ระบบอีกครั้ง
            หากต้องการตรวจสอบสถานะใหม่ ให้ออกจากระบบแล้วเข้ามาใหม่
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/login"
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              ไปหน้าเข้าสู่ระบบ
            </Link>
            <LogoutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
