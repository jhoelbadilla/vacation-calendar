import { describe, expect, it } from "vitest";
import { buildCalendarTimeline, buildYearCalendar, flattenMonths } from "./vacation";
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
    expect(jan2?.accruedVacationHoursToDate).toBe(0.75);
    expect(jan2?.runningVacationBalanceHours).toBe(10.75);
  });

  it("labels months in calendar order regardless of local timezone", () => {
    const months = buildYearCalendar(2026, settings, []);

    expect(months[0].label).toBe("January");
    expect(months[11].label).toBe("December");
  });

  it("accrues vacation time for vacation days and subtracts used vacation hours", () => {
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
    expect(jan2?.effectiveWorkHours).toBe(7.5);
    expect(jan2?.dailyAccruedVacationHours).toBe(0.75);
    expect(jan2?.accruedVacationHoursToDate).toBe(0.75);
    expect(jan2?.runningVacationBalanceHours).toBe(3.25);
  });

  it("keeps vacation-day accrual based on working hours even when another accruing flag is present", () => {
    const days = flattenMonths(
      buildYearCalendar(2026, settings, [
        {
          date: "2026-01-02",
          workHours: 7.5,
          vacationDay: true,
          vacationHours: 7.5,
          personalDay: true,
          publicHoliday: false,
          unpaidDay: false,
          unpaidHours: 0
        }
      ])
    );

    const jan2 = days.find((day) => day.date === "2026-01-02");
    expect(jan2?.dailyAccruedVacationHours).toBe(0.75);
    expect(jan2?.accruedVacationHoursToDate).toBe(0.75);
    expect(jan2?.runningVacationBalanceHours).toBe(3.25);
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

  it("carries projected balances across years", () => {
    const days = flattenMonths(buildCalendarTimeline(2026, 2027, settings, []));
    const dec31 = days.find((day) => day.date === "2026-12-31");
    const jan1 = days.find((day) => day.date === "2027-01-01");

    expect(dec31?.runningVacationBalanceHours).toBe(205);
    expect(jan1?.runningVacationBalanceHours).toBe(205.75);
  });
});
