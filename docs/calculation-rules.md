# Calculation Rules

## Constants and defaults

| Setting | Default | Description |
| --- | ---: | --- |
| Standard workday hours | 7.5 | Used for default weekday work and hours-to-days display. |
| Standard workdays per week | 5 | Monday through Friday by default. |
| Default weekend work hours | 0 | Saturday and Sunday are non-working by default. |
| Default accrual rate | 0.1 | Vacation hours accrued per hour worked. |
| Default vacation-day consumption | 7.5 | Initial value when Vacation day is toggled on. |

## Core formulas

### Vacation days display

```text
vacationDays = vacationHours / standardWorkdayHours
```

Display recommendation:

- Hours: 2 decimal places when needed.
- Days: 2 decimal places in brackets, such as `15.00 hours (2.00 days)`.

### Daily effective work hours

```text
baseWorkHours = weekday ? standardWorkdayHours : defaultWeekendWorkHours
holidayWorkReduction = publicHoliday ? baseWorkHours : 0
unpaidReduction = unpaidDay ? unpaidHours : 0
effectiveWorkHours = max(0, baseWorkHours - holidayWorkReduction - unpaidReduction)
```

### Daily accrual hours

```text
dailyAccruedVacationHours = accrualEligibleHours * vacationHoursPerWorkHour
```

The definition of `accrualEligibleHours` depends on day type:

| Day type | Accrual behavior | Consumption behavior |
| --- | --- | --- |
| Normal weekday | Accrues based on effective worked hours. | Does not consume vacation. |
| Vacation day | Should usually not accrue unless explicitly combined with a type that accrues. | Consumes entered vacation hours. |
| Personal day | Accrues as if working the standard day. | Does not consume vacation. |
| Public holiday | Accrues as if working the standard day. | Does not consume vacation. |
| Unpaid day | Accrues based on reduced effective work hours. | Does not consume vacation. |
| Weekend disabled | Not selectable and normally accrues 0. | Does not consume vacation. |

Recommended implementation rule:

```text
if personalDay or publicHoliday:
  accrualEligibleHours = standardWorkdayHours for weekdays, or standardWorkdayHours for enabled weekend dates if explicitly marked
else if vacationDay:
  accrualEligibleHours = 0
else:
  accrualEligibleHours = effectiveWorkHours
```

This rule matches the stated requirement that personal days and public holidays still accrue vacation, while vacation days consume vacation.

### Running vacation balance

```text
startingBalance = currentVacationHours as of currentVacationAsOfDate
runningBalance(date) = startingBalance
  + sum(dailyAccruedVacationHours for days after currentVacationAsOfDate through date)
  - sum(vacationHoursUsed for vacation days after currentVacationAsOfDate through date)
```

If the selected calendar year begins before the balance effective date, the app should either:

1. Calculate backward only if historical data exists, or
2. Show values as projections from the effective date and label dates before the effective date as outside the projection baseline.

Recommended first version: require or default `currentVacationAsOfDate` to today, calculate forward projections from that date, and show historical dates as informational with no projected balance unless configured.

## Day-setting validation

### Vacation day

- Vacation hours must be greater than or equal to 0.
- Vacation hours should default to 7.5.
- Vacation hours should not exceed 24.
- Warning if vacation hours exceed the day's base work hours.

### Personal day

- Can be selected independently.
- Recommended conflict rule: personal day and vacation day should not both be enabled because personal days do not consume vacation and vacation days do.
- If both are allowed, calculation precedence must be explicit in the UI.

### Public holiday

- Can be selected independently.
- Public holiday means the user does not work that day but still accrues vacation.
- Recommended conflict rule: public holiday and unpaid day should not both be enabled because unpaid hours imply reduced paid work while public holiday implies no required work.

### Unpaid day

- Unpaid hours must be greater than or equal to 0.
- Unpaid hours should not exceed the base work hours for the date.
- If unpaid hours equal base work hours, effective worked hours are 0 and accrual is 0 unless personal day or public holiday rules override it.

## Range-editing behavior

When applying settings to a selected range:

1. Build the inclusive list of dates from start to end.
2. Remove disabled dates, such as weekends when weekend selection is off.
3. Apply the chosen setting patch to each remaining date.
4. Recalculate running balances for the affected year immediately.
5. Persist changed overrides in a batch API call.

## Recalculation strategy

For a one-year view, client-side recalculation is straightforward:

1. Fetch active profile settings and day overrides for the selected year.
2. Generate all dates in the selected year.
3. Apply defaults and overrides to produce normalized day models.
4. Calculate daily accrual, daily consumption, and running balance in chronological order.
5. Memoize results by profile ID, selected year, settings version, and overrides version.

The backend should still validate and store authoritative settings, but the frontend can optimistically recalculate immediately for responsive UX.
