"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signUp } from "@/app/actions/auth";
import { controlClass, Field, FormMessage } from "@/components/ui/form";

function SignUpSubmit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <span
            aria-hidden
            className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          กำลังส่งคำขอ...
        </>
      ) : (
        "สมัครบัญชี"
      )}
    </button>
  );
}

export function SignUpForm() {
  const [state, formAction] = useActionState(signUp, null);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage success={state?.success} message={state?.message} />

      <Field
        label="ชื่อ-นามสกุล"
        htmlFor="fullName"
        required
        error={state?.fieldErrors?.fullName}
      >
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          placeholder="สมชาย ใจดี"
          className={controlClass}
        />
      </Field>

      <Field
        label="อีเมล"
        htmlFor="email"
        required
        error={state?.fieldErrors?.email}
      >
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={controlClass}
        />
      </Field>

      <Field
        label="รหัสผ่าน"
        htmlFor="password"
        required
        error={state?.fieldErrors?.password}
        hint="อย่างน้อย 8 ตัวอักษร"
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={controlClass}
        />
      </Field>

      <Field
        label="ยืนยันรหัสผ่าน"
        htmlFor="confirmPassword"
        required
        error={state?.fieldErrors?.confirmPassword}
      >
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={controlClass}
        />
      </Field>

      <SignUpSubmit />
    </form>
  );
}
