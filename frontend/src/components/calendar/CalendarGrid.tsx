import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarDay, MonthModel } from "../../features/calculations/vacation";
import { cn } from "../../lib/utils";

const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarGrid({
  year,
  months,
  selectedDate,
  rangeStart,
  rangeEnd,
  multiDaySelectionEnabled,
  onMultiDaySelectionChange,
  onSelect,
  onYearChange
}: {
  year: number;
  months: MonthModel[];
  selectedDate: string | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  multiDaySelectionEnabled: boolean;
  onMultiDaySelectionChange: (enabled: boolean) => void;
  onSelect: (day: CalendarDay) => void;
  onYearChange: (year: number) => void;
}) {
  const hasRange = multiDaySelectionEnabled && Boolean(rangeStart && rangeEnd && rangeStart !== rangeEnd);

  function isInRange(date: string) {
    if (!hasRange || !rangeStart || !rangeEnd) return false;
    return date >= rangeStart && date <= rangeEnd;
  }

  function dayOfWeek(date: string) {
    return new Date(`${date}T00:00:00Z`).getUTCDay();
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 accent-teal-700"
            checked={multiDaySelectionEnabled}
            onChange={(event) => onMultiDaySelectionChange(event.currentTarget.checked)}
          />
          Enable multi-day selection
        </label>
        <div className="flex items-center gap-3">
        <button title="Previous year" className="rounded-md border border-border p-2" onClick={() => onYearChange(year - 1)}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-xl font-semibold">{year}</h2>
        <button title="Next year" className="rounded-md border border-border p-2" onClick={() => onYearChange(year + 1)}>
          <ChevronRight size={18} />
        </button>
        </div>
      </div>
      <div className="calendar-scrollbar grid max-h-[calc(100vh-12rem)] justify-center gap-4 overflow-auto pr-1 [grid-template-columns:repeat(auto-fit,minmax(22rem,22rem))]">
        {months.map((month) => (
          <article key={month.month} className="w-[22rem] rounded-lg border border-border bg-card p-3 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{month.label}</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-[0.68rem] font-semibold text-muted-foreground">
              {weekDays.map((day, index) => (
                <span key={`${day}-${index}`}>{day}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-y-1 overflow-hidden rounded-md">
              {Array.from({ length: month.leadingBlanks }).map((_, index) => (
                <span key={index} className="h-12" />
              ))}
              {month.days.map((day) => {
                const inRange = isInRange(day.date);
                const isRangeStart = inRange && day.date === rangeStart;
                const isRangeEnd = inRange && day.date === rangeEnd;
                const weekDay = dayOfWeek(day.date);
                const startsVisibleBand = isRangeStart || weekDay === 0;
                const endsVisibleBand = isRangeEnd || weekDay === 6;

                return (
                  <div key={day.date} className="relative h-12 min-w-0 overflow-hidden">
                    {inRange ? (
                      <span
                        className={cn(
                          "pointer-events-none absolute inset-y-1 z-20 bg-emerald-300/45",
                          startsVisibleBand ? "left-1 rounded-l-md" : "left-0",
                          endsVisibleBand ? "right-1 rounded-r-md" : "right-0"
                        )}
                      />
                    ) : null}
                    <button
                      aria-label={`${day.date} balance ${day.runningVacationBalanceHours === null ? "not projected" : `${day.runningVacationBalanceHours.toFixed(1)} hours`}`}
                      disabled={!day.isSelectable}
                      onClick={() => onSelect(day)}
                      className={cn(
                        "relative z-10 mx-0.5 grid h-12 w-[calc(100%-0.25rem)] content-center overflow-hidden rounded-md border border-transparent px-1.5 text-left transition",
                        day.isSelectable ? "hover:border-primary hover:bg-primary/5" : "cursor-not-allowed bg-muted/50 text-muted-foreground",
                        selectedDate === day.date && "border-primary bg-primary/10",
                        (isRangeStart || isRangeEnd) && "z-30 border-primary bg-white/55",
                        inRange && !isRangeStart && !isRangeEnd && "bg-transparent",
                        day.vacationDay && "bg-orange-100 text-orange-950",
                        day.personalDay && "bg-sky-100 text-sky-950",
                        day.publicHoliday && "bg-violet-100 text-violet-950",
                        day.unpaidDay && "bg-amber-100 text-amber-950"
                      )}
                    >
                      <span className="text-xs font-semibold leading-none">{day.dayOfMonth}</span>
                      <span className="mt-1 whitespace-nowrap text-[0.6rem] leading-none text-muted-foreground">
                        {day.runningVacationBalanceHours === null ? "-" : `${day.runningVacationBalanceHours.toFixed(1)}h`}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
