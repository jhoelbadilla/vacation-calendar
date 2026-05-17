import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDay, formatHoursAndDays } from "../../features/calculations/vacation";
import { api } from "../../lib/api";
import { Button } from "../ui/Button";
import { Field, Input } from "../ui/Field";

type DayForm = {
  workHours: string;
  vacationDay: boolean;
  vacationHours: string;
  personalDay: boolean;
  publicHoliday: boolean;
  unpaidDay: boolean;
  unpaidHours: string;
};

function formFromDay(day: CalendarDay): DayForm {
  return {
    workHours: String(day.baseWorkHours),
    vacationDay: day.vacationDay,
    vacationHours: String(day.vacationHours || 7.5),
    personalDay: day.personalDay,
    publicHoliday: day.publicHoliday,
    unpaidDay: day.unpaidDay,
    unpaidHours: String(day.unpaidHours)
  };
}

function payloadFromForm(form: DayForm) {
  return {
    workHours: Number(form.workHours),
    vacationDay: form.vacationDay,
    vacationHours: Number(form.vacationHours),
    personalDay: form.vacationDay ? false : form.personalDay,
    publicHoliday: form.vacationDay ? false : form.publicHoliday,
    unpaidDay: form.unpaidDay,
    unpaidHours: Number(form.unpaidHours)
  };
}

export function DateEditor({
  profileId,
  day,
  selectedDays,
  standardWorkdayHours,
  onClearRange
}: {
  profileId: string;
  day: CalendarDay | null;
  selectedDays: CalendarDay[];
  standardWorkdayHours: number;
  onClearRange: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DayForm | null>(day ? formFromDay(day) : null);
  const selectedEditableDays = useMemo(() => selectedDays.filter((selectedDay) => selectedDay.isSelectable), [selectedDays]);
  const isRange = selectedEditableDays.length > 1;

  useEffect(() => {
    setForm(day ? formFromDay(day) : null);
  }, [day?.date]);

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => {
      if (isRange) {
        return api(`/profiles/${profileId}/day-overrides/batch/apply`, {
          method: "PATCH",
          body: {
            dates: selectedEditableDays.map((selectedDay) => selectedDay.date),
            skipDisabledWeekends: true,
            patch: body
          }
        });
      }
      return api(`/profiles/${profileId}/day-overrides/${day?.date}`, { method: "PUT", body });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["year", profileId] })
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (isRange) {
        await Promise.all(
          selectedEditableDays.map((selectedDay) => api(`/profiles/${profileId}/day-overrides/${selectedDay.date}`, { method: "DELETE" }))
        );
        return;
      }
      return api(`/profiles/${profileId}/day-overrides/${day?.date}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["year", profileId] })
  });

  if (!day || !form) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-card/70 p-4 text-sm text-muted-foreground">
        Select a weekday to inspect work hours and configure vacation, personal, public holiday, or unpaid time.
      </section>
    );
  }

  function update<K extends keyof DayForm>(key: K, value: DayForm[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateVacationDay(checked: boolean) {
    setForm((current) =>
      current
        ? {
            ...current,
            vacationDay: checked,
            personalDay: checked ? false : current.personalDay,
            publicHoliday: checked ? false : current.publicHoliday
          }
        : current
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    saveMutation.mutate(payloadFromForm(form));
  }

  const rangeLabel = isRange
    ? `${selectedEditableDays[0].date} to ${selectedEditableDays[selectedEditableDays.length - 1].date}`
    : day.date;

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{rangeLabel}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRange
              ? `${selectedEditableDays.length} selected weekdays.`
              : `Works ${day.effectiveWorkHours.toFixed(2)}h, accrues ${day.dailyAccruedVacationHours.toFixed(2)}h.`}
          </p>
          {!isRange ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Balance: {day.runningVacationBalanceHours === null ? "-" : formatHoursAndDays(day.runningVacationBalanceHours, standardWorkdayHours)}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          {isRange ? (
            <button title="Clear range" className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground" onClick={onClearRange}>
              <X size={16} />
            </button>
          ) : null}
          <button
            title={isRange ? "Reset selected days to default" : "Reset to default"}
            className="rounded-md border border-border p-2 text-muted-foreground hover:text-destructive"
            onClick={() => deleteMutation.mutate()}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
        <Field label="Working hours">
          <Input name="workHours" type="number" min="0" max="24" step="0.25" value={form.workHours} onChange={(event) => update("workHours", event.currentTarget.value)} />
        </Field>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            name="vacationDay"
            type="checkbox"
            checked={form.vacationDay}
            onChange={(event) => updateVacationDay(event.currentTarget.checked)}
            className="h-4 w-4 accent-teal-700"
          />
          Vacation day
        </label>
        <Field label="Vacation hours">
          <Input
            name="vacationHours"
            type="number"
            min="0"
            max="24"
            step="0.25"
            value={form.vacationHours}
            onChange={(event) => update("vacationHours", event.currentTarget.value)}
          />
        </Field>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            name="personalDay"
            type="checkbox"
            checked={form.personalDay}
            disabled={form.vacationDay}
            onChange={(event) => update("personalDay", event.currentTarget.checked)}
            className="h-4 w-4 accent-teal-700 disabled:opacity-50"
          />
          Personal day
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            name="publicHoliday"
            type="checkbox"
            checked={form.publicHoliday}
            disabled={form.vacationDay}
            onChange={(event) => update("publicHoliday", event.currentTarget.checked)}
            className="h-4 w-4 accent-teal-700 disabled:opacity-50"
          />
          Public holiday
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            name="unpaidDay"
            type="checkbox"
            checked={form.unpaidDay}
            onChange={(event) => update("unpaidDay", event.currentTarget.checked)}
            className="h-4 w-4 accent-teal-700"
          />
          Unpaid day
        </label>
        <Field label="Unpaid hours">
          <Input
            name="unpaidHours"
            type="number"
            min="0"
            max="24"
            step="0.25"
            value={form.unpaidHours}
            onChange={(event) => update("unpaidHours", event.currentTarget.value)}
          />
        </Field>
        <Button disabled={saveMutation.isPending}>
          <Save size={16} />
          {saveMutation.isPending ? "Saving..." : isRange ? "Save selected days" : "Save day"}
        </Button>
      </form>
    </section>
  );
}
