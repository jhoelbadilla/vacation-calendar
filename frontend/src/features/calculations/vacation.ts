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
  accruedVacationHoursToDate: number | null;
  vacationHoursUsedToDate: number | null;
  runningVacationBalanceHours: number | null;
};

export type MonthModel = {
  year: number;
  month: number;
  label: string;
  leadingBlanks: number;
  days: CalendarDay[];
};

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", timeZone: "UTC" });

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
  return buildCalendarTimeline(year, year, settings, overrides);
}

export function buildCalendarTimeline(startYear: number, endYear: number, settings: Settings, overrides: DayOverride[]): MonthModel[] {
  const overrideMap = new Map(overrides.map((override) => [override.date, override]));
  let running = settings.currentVacationHours;
  let accruedToDate = 0;
  let usedToDate = 0;
  const months: MonthModel[] = [];

  for (let year = startYear; year <= endYear; year++) {
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
        const accrualEligibleHours = vacationDay || personalDay || publicHoliday ? settings.standardWorkdayHours : effectiveWorkHours;
        const dailyAccruedVacationHours = accrualEligibleHours * settings.vacationHoursPerWorkHour;
        const inProjection = dayDiff(dateKey, settings.currentVacationAsOfDate) > 0;

        if (inProjection) {
          accruedToDate += dailyAccruedVacationHours;
          usedToDate += vacationDay ? vacationHours : 0;
          running = settings.currentVacationHours + accruedToDate - usedToDate;
        }

        const atOrAfterBaseline = dayDiff(dateKey, settings.currentVacationAsOfDate) >= 0;

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
          accruedVacationHoursToDate: atOrAfterBaseline ? accruedToDate : null,
          vacationHoursUsedToDate: atOrAfterBaseline ? usedToDate : null,
          runningVacationBalanceHours: atOrAfterBaseline ? running : null
        });
      }

      months.push({
        year,
        month,
        label: monthFormatter.format(first),
        leadingBlanks: first.getUTCDay(),
        days
      });
    }
  }

  return months;
}

export function flattenMonths(months: MonthModel[]) {
  return months.flatMap((month) => month.days);
}
