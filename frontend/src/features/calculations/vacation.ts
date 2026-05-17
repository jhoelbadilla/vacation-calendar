import type { DayOverride, Settings } from "../../types/api";

export type CalendarDay = {
  date: string;
  dayOfMonth: number;
  isWeekend: boolean;
  isSelectable: boolean;
  baseWorkHours: number;
  effectiveWorkHours: number;
  vacationDay: boolean;
  vacationHours: number;
  personalDay: boolean;
  publicHoliday: boolean;
  unpaidDay: boolean;
  unpaidHours: number;
  dailyAccruedVacationHours: number;
  runningVacationBalanceHours: number | null;
};

export type MonthModel = {
  month: number;
  label: string;
  leadingBlanks: number;
  days: CalendarDay[];
};

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long" });

export function formatHoursAndDays(hours: number, standardWorkdayHours: number) {
  const days = standardWorkdayHours > 0 ? hours / standardWorkdayHours : 0;
  return `${hours.toFixed(2)} hours (${days.toFixed(2)} days)`;
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayDiff(left: string, right: string) {
  return new Date(`${left}T00:00:00Z`).getTime() - new Date(`${right}T00:00:00Z`).getTime();
}

export function buildYearCalendar(year: number, settings: Settings, overrides: DayOverride[]): MonthModel[] {
  const overrideMap = new Map(overrides.map((override) => [override.date, override]));
  let running = settings.currentVacationHours;
  const months: MonthModel[] = [];

  for (let month = 0; month < 12; month++) {
    const first = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const days: CalendarDay[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(Date.UTC(year, month, day));
      const dateKey = iso(date);
      const dayOfWeek = date.getUTCDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const override = overrideMap.get(dateKey);
      const baseWorkHours = override?.workHours ?? (isWeekend ? 0 : settings.standardWorkdayHours);
      const vacationDay = override?.vacationDay ?? false;
      const vacationHours = override?.vacationHours ?? 0;
      const personalDay = override?.personalDay ?? false;
      const publicHoliday = override?.publicHoliday ?? false;
      const unpaidDay = override?.unpaidDay ?? false;
      const unpaidHours = override?.unpaidHours ?? 0;
      const holidayReduction = publicHoliday ? baseWorkHours : 0;
      const unpaidReduction = unpaidDay ? unpaidHours : 0;
      const effectiveWorkHours = Math.max(0, baseWorkHours - holidayReduction - unpaidReduction);
      const accrualEligibleHours =
        personalDay || publicHoliday ? settings.standardWorkdayHours : vacationDay ? 0 : effectiveWorkHours;
      const dailyAccruedVacationHours = accrualEligibleHours * settings.vacationHoursPerWorkHour;
      const inProjection = dayDiff(dateKey, settings.currentVacationAsOfDate) > 0;

      if (inProjection) {
        running += dailyAccruedVacationHours - (vacationDay ? vacationHours : 0);
      }

      days.push({
        date: dateKey,
        dayOfMonth: day,
        isWeekend,
        isSelectable: settings.weekendsEnabled || !isWeekend,
        baseWorkHours,
        effectiveWorkHours,
        vacationDay,
        vacationHours,
        personalDay,
        publicHoliday,
        unpaidDay,
        unpaidHours,
        dailyAccruedVacationHours,
        runningVacationBalanceHours: dayDiff(dateKey, settings.currentVacationAsOfDate) >= 0 ? running : null
      });
    }

    months.push({
      month,
      label: monthFormatter.format(first),
      leadingBlanks: first.getUTCDay(),
      days
    });
  }

  return months;
}

export function flattenMonths(months: MonthModel[]) {
  return months.flatMap((month) => month.days);
}
