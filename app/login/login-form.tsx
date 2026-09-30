"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { login } from "@/app/actions/auth";
import { controlClass, Field, FormMessage } from "@/components/ui/form";

function LoginSubmit() {
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
          กำลังเข้าสู่ระบบ...
        </>
      ) : (
        "เข้าสู่ระบบ"
      )}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, null);

  return (
    <form action={formAction} className="space-y-4">
      <FormMessage success={state?.success} message={state?.message} />

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
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={controlClass}
        />
      </Field>

      <LoginSubmit />
    </form>
  );
}
