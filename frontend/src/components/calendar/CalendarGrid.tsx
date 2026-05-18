import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { CalendarDay, MonthModel } from "../../features/calculations/vacation";
import { cn } from "../../lib/utils";

const weekDays = ["S", "M", "T", "W", "T", "F", "S"];
const swipeThreshold = 48;

export function CalendarGrid({
  year,
  maxYear,
  visibleMonth,
  months,
  selectedDate,
  rangeStart,
  rangeEnd,
  multiDaySelectionEnabled,
  onMultiDaySelectionChange,
  onMonthChange,
  onSelect,
  onYearChange
}: {
  year: number;
  maxYear: number;
  visibleMonth: number;
  months: MonthModel[];
  selectedDate: string | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  multiDaySelectionEnabled: boolean;
  onMultiDaySelectionChange: (enabled: boolean) => void;
  onMonthChange: (month: number) => void;
  onSelect: (day: CalendarDay) => void;
  onYearChange: (year: number) => void;
}) {
  const hasRange = multiDaySelectionEnabled && Boolean(rangeStart && rangeEnd && rangeStart !== rangeEnd);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const visibleMobileMonth = months.find((month) => month.month === visibleMonth) ?? months[0];
  const monthOptions = useMemo(() => months.map((month) => ({ value: month.month, label: month.label })), [months]);

  function isInRange(date: string) {
    if (!hasRange || !rangeStart || !rangeEnd) return false;
    return date >= rangeStart && date <= rangeEnd;
  }

  function dayOfWeek(date: string) {
    return new Date(`${date}T00:00:00Z`).getUTCDay();
  }

  function moveMonth(delta: number) {
    const nextMonth = visibleMonth + delta;
    if (nextMonth < 0) {
      onYearChange(year - 1);
      onMonthChange(11);
      return;
    }
    if (nextMonth > 11) {
      if (year >= maxYear) return;
      onYearChange(year + 1);
      onMonthChange(0);
      return;
    }
    onMonthChange(nextMonth);
  }

  function onDragEnd(clientX: number) {
    if (dragStartX === null) return;
    const delta = clientX - dragStartX;
    setDragStartX(null);
    if (Math.abs(delta) < swipeThreshold) return;
    moveMonth(delta < 0 ? 1 : -1);
  }

  function renderMonth(month: MonthModel, compact = false) {
    return (
      <article key={`${month.year}-${month.month}`} className={cn("rounded-lg border border-border bg-card/95 p-3 shadow-sm transition md:p-4", compact ? "w-full" : "w-[26rem]")}>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{month.label}</h3>
        <div className="grid grid-cols-7 gap-1 text-center text-[0.68rem] font-semibold text-muted-foreground">
          {weekDays.map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-y-1 overflow-hidden rounded-md">
          {Array.from({ length: month.leadingBlanks }).map((_, index) => (
            <span key={index} className="h-14" />
          ))}
          {month.days.map((day) => {
            const inRange = isInRange(day.date);
            const isRangeStart = inRange && day.date === rangeStart;
            const isRangeEnd = inRange && day.date === rangeEnd;
            const weekDay = dayOfWeek(day.date);
            const startsVisibleBand = isRangeStart || weekDay === 0;
            const endsVisibleBand = isRangeEnd || weekDay === 6;

            return (
              <div key={day.date} className="relative h-14 min-w-0 overflow-hidden">
                <button
                  aria-label={`${day.date} balance ${day.runningVacationBalanceHours === null ? "not projected" : `${day.runningVacationBalanceHours.toFixed(2)} hours`}`}
                  disabled={!day.isSelectable}
                  onClick={() => onSelect(day)}
                  className={cn(
                    "relative z-10 mx-0.5 grid h-14 w-[calc(100%-0.25rem)] content-center overflow-hidden rounded-md border border-transparent px-1 text-left transition duration-200",
                    day.isSelectable ? "hover:border-primary hover:bg-primary/10" : "cursor-not-allowed bg-muted/70 text-muted-foreground",
                    selectedDate === day.date && "border-primary bg-primary/10",
                    (isRangeStart || isRangeEnd) && "z-30 border-primary bg-card/75",
                    inRange && !isRangeStart && !isRangeEnd && "bg-transparent",
                    day.vacationDay && "bg-orange-100 text-orange-950 dark:bg-orange-400/20 dark:text-orange-100",
                    day.personalDay && "bg-sky-100 text-sky-950 dark:bg-sky-400/20 dark:text-sky-100",
                    day.publicHoliday && "bg-violet-100 text-violet-950 dark:bg-violet-400/20 dark:text-violet-100",
                    day.unpaidDay && "bg-amber-100 text-amber-950 dark:bg-amber-400/20 dark:text-amber-100"
                  )}
                >
                  <span className="text-sm font-semibold leading-none">{day.dayOfMonth}</span>
                  <span className="mt-1 whitespace-nowrap text-[0.64rem] leading-none text-muted-foreground">
                    {day.runningVacationBalanceHours === null ? "-" : day.runningVacationBalanceHours.toFixed(2)}
                  </span>
                </button>
                {inRange ? (
                  <span
                    className={cn(
                      "pointer-events-none absolute inset-y-1 z-40 bg-emerald-300/50 ring-1 ring-emerald-400/40 dark:bg-emerald-300/30 dark:ring-emerald-300/30",
                      startsVisibleBand ? "left-1 rounded-l-md" : "left-0",
                      endsVisibleBand ? "right-1 rounded-r-md" : "right-0"
                    )}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </article>
    );
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card/95 p-3 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={multiDaySelectionEnabled}
            onChange={(event) => onMultiDaySelectionChange(event.currentTarget.checked)}
          />
          Enable multi-day selection
        </label>
        <div className="flex items-center gap-3">
          <button title="Previous year" className="rounded-md border border-border p-2 transition hover:bg-muted" onClick={() => onYearChange(year - 1)}>
            <ChevronLeft size={18} />
          </button>
          <h2 className="min-w-16 text-center text-xl font-semibold">{year}</h2>
          <button
            title="Next year"
            className="rounded-md border border-border p-2 transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => onYearChange(Math.min(year + 1, maxYear))}
            disabled={year >= maxYear}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:hidden">
        <select
          className="h-10 rounded-md border border-border bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          value={visibleMonth}
          onChange={(event) => onMonthChange(Number(event.currentTarget.value))}
        >
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
        <div
          className="touch-pan-y"
          onPointerDown={(event) => setDragStartX(event.clientX)}
          onPointerUp={(event) => onDragEnd(event.clientX)}
          onPointerCancel={() => setDragStartX(null)}
        >
          {visibleMobileMonth ? renderMonth(visibleMobileMonth, true) : null}
        </div>
      </div>
      <div className="calendar-scrollbar hidden max-h-[calc(100vh-12rem)] justify-center gap-4 overflow-auto pr-1 md:grid [grid-template-columns:repeat(auto-fit,minmax(26rem,26rem))]">
        {months.map((month) => renderMonth(month))}
      </div>
    </section>
  );
}
