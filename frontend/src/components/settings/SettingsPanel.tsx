import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { Settings } from "../../types/api";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";

export function SettingsPanel({
  profileId,
  settings,
  onClose,
  closeAfterSave = false
}: {
  profileId: string;
  settings: Settings;
  onClose?: () => void;
  closeAfterSave?: boolean;
}) {
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
    mutationFn: (body: Partial<Settings>) => api<{ settings: Settings }>(`/profiles/${profileId}/settings`, { method: "PATCH", body })
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function settingsPayload() {
    return {
      vacationHoursPerWorkHour: Number(form.vacationHoursPerWorkHour),
      currentVacationHours: Number(form.currentVacationHours),
      currentVacationAsOfDate: form.currentVacationAsOfDate,
      weekendsEnabled: form.weekendsEnabled
    };
  }

  function persist(shouldClose = false) {
    mutation.mutate(settingsPayload(), {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ["year", profileId] });
        if (shouldClose) onClose?.();
      }
    });
  }

  function save(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    persist(closeAfterSave);
  }

  return (
    <aside className="rounded-lg border border-border bg-card/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Simulation Settings</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {mutation.isPending ? "Saving..." : mutation.isSuccess ? "Saved" : "Changes recalculate after save."}
          </p>
        </div>
        {onClose ? (
          <button
            title="Close settings"
            className="rounded-md border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={() => persist(true)}
            disabled={mutation.isPending}
            type="button"
          >
            <X size={16} />
          </button>
        ) : null}
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
            step="0.01"
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
            className="h-5 w-5 accent-primary"
            checked={form.weekendsEnabled}
            onChange={(event) => update("weekendsEnabled", event.currentTarget.checked)}
          />
        </label>
        <Button disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save settings"}</Button>
      </form>
    </aside>
  );
}
