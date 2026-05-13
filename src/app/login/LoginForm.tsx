"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LockKeyhole, LogIn, Mail } from "lucide-react";
import { loginAction, type LoginActionState } from "@/app/login/actions";
import { cn } from "@/lib/utils";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#d6b15f] px-5 text-sm font-semibold text-black shadow-[0_0_34px_rgba(214,177,95,0.24)] transition hover:bg-[#f0cf79] focus:outline-none focus:ring-2 focus:ring-[#d6b15f] focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      <LogIn aria-hidden className="size-4" />
      {pending ? "Signing in..." : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginActionState | null, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
          Email
        </span>
        <span className="mt-2 flex h-12 items-center gap-3 rounded-md border border-white/12 bg-black/55 px-4 text-white focus-within:border-[#d6b15f]/70 focus-within:ring-2 focus-within:ring-[#d6b15f]/20">
          <Mail aria-hidden className="size-4 text-[#d6b15f]" />
          <input
            autoComplete="email"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            name="email"
            placeholder="agent@hbrealstate.com"
            required
            type="email"
          />
        </span>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
          Password
        </span>
        <span className="mt-2 flex h-12 items-center gap-3 rounded-md border border-white/12 bg-black/55 px-4 text-white focus-within:border-[#d6b15f]/70 focus-within:ring-2 focus-within:ring-[#d6b15f]/20">
          <LockKeyhole aria-hidden className="size-4 text-[#d6b15f]" />
          <input
            autoComplete="current-password"
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            name="password"
            placeholder="Enter your password"
            required
            type="password"
          />
        </span>
      </label>

      {state ? (
        <div
          className={cn(
            "rounded-md border px-4 py-3 text-sm",
            state.tone === "error"
              ? "border-rose-400/30 bg-rose-400/10 text-rose-100"
              : "border-[#d6b15f]/35 bg-[#d6b15f]/10 text-[#f0cf79]",
          )}
          role="status"
        >
          {state.message}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
