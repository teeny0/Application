import type { Metadata } from "next";
import Link from "next/link";

import { SUPABASE_MISSING_ENV_MESSAGE, isSupabaseConfigured } from "@/lib/env";

import { ThemeToggle } from "@/components/theme-toggle";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | ระบบจัดการการบำรุงเครื่องจักร",
};

export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-slate-900 text-lg font-semibold text-white">
            MC
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            ระบบจัดการการบำรุงเครื่องจักร
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            เข้าสู่ระบบเพื่อดูข้อมูลเครื่องจักรและงานบำรุง
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {configured ? (
            <LoginForm />
          ) : (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20">
              <p className="font-medium">ยังไม่ได้ตั้งค่า Supabase</p>
              <p className="mt-1.5 leading-relaxed">
                {SUPABASE_MISSING_ENV_MESSAGE}
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-amber-100/60 px-3 py-2 text-xs text-amber-900">
                {`cp .env.example .env.local`}
              </pre>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
          <Link
            href="/signup"
            className="font-medium text-slate-700 underline underline-offset-4 hover:text-slate-900"
          >
            ยังไม่มีบัญชี? สมัครเป็นช่างเทคนิค
          </Link>
          <br />
          <span className="text-slate-400">
            บัญชีใหม่ต้องรอผู้ดูแลระบบอนุมัติก่อนจึงจะเข้าใช้งานได้
          </span>
        </p>
      </div>
    </main>
  );
}
