import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useState } from "react";
import { api } from "../../lib/api";
import type { Profile, Settings } from "../../types/api";
import { Button } from "../ui/Button";
import { Field, Input, Textarea } from "../ui/Field";

export function CreateProfileModal({
  required,
  onCancel,
  onCreated
}: {
  required: boolean;
  onCancel?: () => void;
  onCreated?: (profile: Profile) => void;
}) {
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: { name: string; description: string }) =>
      api<{ profile: Profile; settings: Settings }>("/profiles", { method: "POST", body }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
      onCreated?.(data.profile);
    },
    onError: (err) => setError(err.message)
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      name: String(form.get("name") ?? ""),
      description: String(form.get("description") ?? "")
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 px-4 backdrop-blur-sm">
      <section className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{required ? "Create your first simulation profile" : "Create simulation profile"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Profiles keep separate vacation assumptions and calendar overrides.</p>
          </div>
          {!required ? (
            <button className="rounded-md border border-border px-3 py-2 text-sm font-medium" onClick={onCancel}>
              Cancel
            </button>
          ) : null}
        </div>
        <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
          <Field label="Profile name">
            <Input name="name" maxLength={80} required autoFocus />
          </Field>
          <Field label="Description">
            <Textarea name="description" maxLength={500} />
          </Field>
          {error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          <Button disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create profile"}</Button>
        </form>
      </section>
    </div>
  );
}
