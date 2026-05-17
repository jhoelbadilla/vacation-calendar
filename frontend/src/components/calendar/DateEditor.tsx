import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Trash2 } from "lucide-react";
import { FormEvent } from "react";
import { CalendarDay } from "../../features/calculations/vacation";
import { api } from "../../lib/api";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";

export function DateEditor({ profileId, day }: { profileId: string; day: CalendarDay | null }) {
  const queryClient = useQueryClient();
  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/profiles/${profileId}/day-overrides/${day?.date}`, { method: "PUT", body }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["year", profileId] })
  });
  const deleteMutation = useMutation({
    mutationFn: () => api(`/profiles/${profileId}/day-overrides/${day?.date}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["year", profileId] })
  });

  if (!day) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/70 p-4 text-sm text-muted-foreground">
        Select a weekday to inspect work hours and configure vacation, personal, public holiday, or unpaid time.
      </section>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    saveMutation.mutate({
      workHours: Number(form.get("workHours")),
      vacationDay: form.get("vacationDay") === "on",
      vacationHours: Number(form.get("vacationHours")),
      personalDay: form.get("personalDay") === "on",
      publicHoliday: form.get("publicHoliday") === "on",
      unpaidDay: form.get("unpaidDay") === "on",
      unpaidHours: Number(form.get("unpaidHours"))
    });
  }

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{day.date}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Works {day.effectiveWorkHours.toFixed(2)}h, accrues {day.dailyAccruedVacationHours.toFixed(2)}h.
          </p>
        </div>
        <button
          title="Reset to default"
          className="rounded-md border border-border p-2 text-muted-foreground hover:text-destructive"
          onClick={() => deleteMutation.mutate()}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <Field label="Working hours">
          <Input name="workHours" type="number" min="0" max="24" step="0.25" defaultValue={day.baseWorkHours} />
        </Field>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input name="vacationDay" type="checkbox" defaultChecked={day.vacationDay} className="h-4 w-4 accent-teal-700" />
          Vacation day
        </label>
        <Field label="Vacation hours">
          <Input name="vacationHours" type="number" min="0" max="24" step="0.25" defaultValue={day.vacationHours || 7.5} />
        </Field>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input name="personalDay" type="checkbox" defaultChecked={day.personalDay} className="h-4 w-4 accent-teal-700" />
          Personal day
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input name="publicHoliday" type="checkbox" defaultChecked={day.publicHoliday} className="h-4 w-4 accent-teal-700" />
          Public holiday
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input name="unpaidDay" type="checkbox" defaultChecked={day.unpaidDay} className="h-4 w-4 accent-teal-700" />
          Unpaid day
        </label>
        <Field label="Unpaid hours">
          <Input name="unpaidHours" type="number" min="0" max="24" step="0.25" defaultValue={day.unpaidHours} />
        </Field>
        <Button disabled={saveMutation.isPending}>
          <Save size={16} />
          {saveMutation.isPending ? "Saving..." : "Save day"}
        </Button>
      </form>
    </section>
  );
}
