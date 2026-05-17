import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { FormEvent, useState } from "react";
import { api } from "../../lib/api";
import type { User } from "../../types/api";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";

type Mode = "login" | "register";

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (form: Record<string, string>) => {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      return api<{ user: User }>(path, { method: "POST", body: form });
    },
    onSuccess: (data) => queryClient.setQueryData(["me"], data),
    onError: (err) => setError(err.message)
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> =
      mode === "login"
        ? {
            identifier: String(form.get("identifier") ?? ""),
            password: String(form.get("password") ?? "")
          }
        : {
            username: String(form.get("username") ?? ""),
            email: String(form.get("email") ?? ""),
            password: String(form.get("password") ?? "")
          };
    mutation.mutate(payload);
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="grid w-full max-w-md gap-6 rounded-lg border border-border bg-card p-8 shadow-panel">
        <div className="grid gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CalendarDays size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Vacation Calendar</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" ? "Sign in to your simulation workspace." : "Create your account to begin."}
            </p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={onSubmit}>
          {mode === "register" ? (
            <>
              <Field label="Username">
                <Input name="username" autoComplete="username" pattern="[A-Za-z0-9_\\-]+" minLength={3} maxLength={32} required />
              </Field>
              <p className="-mt-2 text-xs text-muted-foreground">Only letters, numbers, dash, and underscore are allowed.</p>
              <Field label="Email">
                <Input name="email" type="email" autoComplete="email" required />
              </Field>
            </>
          ) : (
            <Field label="Username or email">
              <Input name="identifier" autoComplete="username" required />
            </Field>
          )}
          <Field label="Password">
            <Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={12} required />
          </Field>
          {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <Button disabled={mutation.isPending}>{mutation.isPending ? "Working..." : mode === "login" ? "Log in" : "Create account"}</Button>
        </form>

        <button className="text-left text-sm font-medium text-primary" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Create an account" : "Already have an account? Log in"}
        </button>
      </section>
    </main>
  );
}
