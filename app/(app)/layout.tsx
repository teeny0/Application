import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppNav } from "@/components/app-nav";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ROLE_LABELS } from "@/lib/constants";
import { requireApprovedUser } from "@/lib/data/auth";

export const metadata: Metadata = {
  title: "ระบบจัดการการบำรุงเครื่องจักร",
};

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  // ตรวจสอบการเข้าสู่ระบบและสถานะอนุมัติที่ชั้น layout
  // — Server Action และ DAL จะตรวจซ้ำอีกครั้ง
  const user = await requireApprovedUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-slate-900 text-sm font-semibold text-white">
                MC
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-900">
                  ระบบจัดการการบำรุงเครื่องจักร
                </p>
                <p className="text-xs text-slate-500">
                  Machine Maintenance Management
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">
                  {user.fullName ?? user.email}
                </p>
                <p className="text-xs text-slate-500">
                  {ROLE_LABELS[user.role]}
                </p>
              </div>
              <ThemeToggle />
              <LogoutButton compact />
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-2 sm:px-6">
          <AppNav isAdmin={user.isAdmin} />
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
