import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Settings } from "../../types/api";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";

export function SettingsPanel({ profileId, settings }: { profileId: string; settings: Settings }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    vacationHoursPerWorkHour: String(settings.vacationHoursPerWorkHour),
    currentVacationHours: String(settings.currentVacationHours),
    currentVacationAsOfDate: settings.currentVacationAsOfDate,
    weekendsEnabled: settings.weekendsEnabled
  });

  useEffect(() => {
    setForm({
      vacationHoursPerWorkHour: String(settings.vacationHoursPerWorkHour),
      currentVacationHours: String(settings.currentVacationHours),
      currentVacationAsOfDate: settings.currentVacationAsOfDate,
      weekendsEnabled: settings.weekendsEnabled
    });
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (body: Partial<Settings>) => api<{ settings: Settings }>(`/profiles/${profileId}/settings`, { method: "PATCH", body }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["year", profileId] });
    }
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    mutation.mutate({
      vacationHoursPerWorkHour: Number(form.vacationHoursPerWorkHour),
      currentVacationHours: Number(form.currentVacationHours),
      currentVacationAsOfDate: form.currentVacationAsOfDate,
      weekendsEnabled: form.weekendsEnabled
    });
  }

  return (
    <aside className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Simulation Settings</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {mutation.isPending ? "Saving..." : mutation.isSuccess ? "Saved" : "Changes recalculate after save."}
        </p>
      </div>
      <form className="mt-5 grid content-start gap-5" onSubmit={save}>
        <Field label="Vacation hours accrued per hour worked">
          <Input
            type="number"
            min="0"
            max="24"
            step="0.0001"
            value={form.vacationHoursPerWorkHour}
            onChange={(event) => update("vacationHoursPerWorkHour", event.currentTarget.value)}
          />
        </Field>
        <Field label="Current vacation hours">
          <Input
            type="number"
            min="0"
            step="0.25"
            value={form.currentVacationHours}
            onChange={(event) => update("currentVacationHours", event.currentTarget.value)}
          />
        </Field>
        <Field label="Balance as of date">
          <Input
            type="date"
            value={form.currentVacationAsOfDate}
            onChange={(event) => update("currentVacationAsOfDate", event.currentTarget.value)}
          />
        </Field>
        <label className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-3 text-sm font-medium">
          <span>Enable weekends</span>
          <input
            type="checkbox"
            className="h-5 w-5 accent-teal-700"
            checked={form.weekendsEnabled}
            onChange={(event) => update("weekendsEnabled", event.currentTarget.checked)}
          />
        </label>
        <Button disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save settings"}</Button>
      </form>
    </aside>
  );
}
