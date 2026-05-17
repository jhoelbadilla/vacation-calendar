import { ChevronLeft, ChevronRight } from "lucide-react";
import { CalendarDay, MonthModel } from "../../features/calculations/vacation";
import { cn } from "../../lib/utils";

const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarGrid({
  year,
  months,
  selectedDate,
  onSelect,
  onYearChange
}: {
  year: number;
  months: MonthModel[];
  selectedDate: string | null;
  onSelect: (day: CalendarDay) => void;
  onYearChange: (year: number) => void;
}) {
  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-sm">
        <button title="Previous year" className="rounded-md border border-border p-2" onClick={() => onYearChange(year - 1)}>
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-xl font-semibold">{year}</h2>
        <button title="Next year" className="rounded-md border border-border p-2" onClick={() => onYearChange(year + 1)}>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="calendar-scrollbar grid max-h-[calc(100vh-12rem)] gap-4 overflow-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
        {months.map((month) => (
          <article key={month.month} className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{month.label}</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-[0.68rem] font-semibold text-muted-foreground">
              {weekDays.map((day, index) => (
                <span key={`${day}-${index}`}>{day}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {Array.from({ length: month.leadingBlanks }).map((_, index) => (
                <span key={index} className="aspect-square" />
              ))}
              {month.days.map((day) => (
                <button
                  key={day.date}
                  disabled={!day.isSelectable}
                  onClick={() => onSelect(day)}
                  className={cn(
                    "grid aspect-square min-h-12 content-center rounded-md border border-transparent p-1 text-left transition",
                    day.isSelectable ? "hover:border-primary hover:bg-primary/5" : "cursor-not-allowed bg-muted/50 text-muted-foreground opacity-60",
                    selectedDate === day.date && "border-primary bg-primary/10",
                    day.vacationDay && "bg-orange-100 text-orange-950",
                    day.personalDay && "bg-sky-100 text-sky-950",
                    day.publicHoliday && "bg-violet-100 text-violet-950",
                    day.unpaidDay && "bg-amber-100 text-amber-950"
                  )}
                >
                  <span className="text-xs font-semibold">{day.dayOfMonth}</span>
                  <span className="mt-1 truncate text-[0.62rem] text-muted-foreground">
                    {day.runningVacationBalanceHours === null ? "-" : `${day.runningVacationBalanceHours.toFixed(1)}h`}
                  </span>
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
