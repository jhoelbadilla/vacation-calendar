import { describe, expect, it } from "vitest";
import { buildYearCalendar, flattenMonths } from "./vacation";
import type { Settings } from "../../types/api";

const settings: Settings = {
  currentVacationHours: 10,
  currentVacationAsOfDate: "2026-01-01",
  standardWorkdayHours: 7.5,
  vacationHoursPerWorkHour: 0.1,
  weekendsEnabled: false
};

describe("buildYearCalendar", () => {
  it("accrues vacation for normal weekdays after the balance date", () => {
    const days = flattenMonths(buildYearCalendar(2026, settings, []));
    const jan2 = days.find((day) => day.date === "2026-01-02");

    expect(jan2?.dailyAccruedVacationHours).toBe(0.75);
    expect(jan2?.runningVacationBalanceHours).toBe(10.75);
  });

  it("does not accrue on vacation days and subtracts vacation hours", () => {
    const days = flattenMonths(
      buildYearCalendar(2026, settings, [
        {
          date: "2026-01-02",
          workHours: 7.5,
          vacationDay: true,
          vacationHours: 7.5,
          personalDay: false,
          publicHoliday: false,
          unpaidDay: false,
          unpaidHours: 0
        }
      ])
    );

    const jan2 = days.find((day) => day.date === "2026-01-02");
    expect(jan2?.dailyAccruedVacationHours).toBe(0);
    expect(jan2?.runningVacationBalanceHours).toBe(2.5);
  });

  it("accrues for public holidays as if the user worked a standard day", () => {
    const days = flattenMonths(
      buildYearCalendar(2026, settings, [
        {
          date: "2026-01-02",
          workHours: 7.5,
          vacationDay: false,
          vacationHours: 0,
          personalDay: false,
          publicHoliday: true,
          unpaidDay: false,
          unpaidHours: 0
        }
      ])
    );

    const jan2 = days.find((day) => day.date === "2026-01-02");
    expect(jan2?.effectiveWorkHours).toBe(0);
    expect(jan2?.dailyAccruedVacationHours).toBe(0.75);
  });
});
