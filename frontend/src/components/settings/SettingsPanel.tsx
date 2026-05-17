import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { Settings } from "../../types/api";
import { Field, Input } from "../ui/Field";

export function SettingsPanel({ profileId, settings }: { profileId: string; settings: Settings }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (body: Partial<Settings>) => api<{ settings: Settings }>(`/profiles/${profileId}/settings`, { method: "PATCH", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["year", profileId] });
    }
  });

  return (
    <aside className="grid content-start gap-5 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Simulation Settings</h2>
        {mutation.isPending ? <p className="mt-1 text-xs text-muted-foreground">Saving...</p> : null}
      </div>
      <Field label="Vacation hours accrued per hour worked">
        <Input
          type="number"
          min="0"
          max="24"
          step="0.0001"
          defaultValue={settings.vacationHoursPerWorkHour}
          onBlur={(event) => mutation.mutate({ vacationHoursPerWorkHour: Number(event.currentTarget.value) })}
        />
      </Field>
      <Field label="Current vacation hours">
        <Input
          type="number"
          min="0"
          step="0.25"
          defaultValue={settings.currentVacationHours}
          onBlur={(event) => mutation.mutate({ currentVacationHours: Number(event.currentTarget.value) })}
        />
      </Field>
      <Field label="Balance as of date">
        <Input
          type="date"
          defaultValue={settings.currentVacationAsOfDate}
          onBlur={(event) => mutation.mutate({ currentVacationAsOfDate: event.currentTarget.value })}
        />
      </Field>
      <label className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-3 text-sm font-medium">
        <span>Enable weekends</span>
        <input
          type="checkbox"
          className="h-5 w-5 accent-teal-700"
          defaultChecked={settings.weekendsEnabled}
          onChange={(event) => mutation.mutate({ weekendsEnabled: event.currentTarget.checked })}
        />
      </label>
    </aside>
  );
}
