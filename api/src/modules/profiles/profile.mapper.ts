export function toProfile(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function toSettings(row: any) {
  return {
    currentVacationHours: Number(row.current_vacation_hours),
    currentVacationAsOfDate: row.current_vacation_as_of_date,
    standardWorkdayHours: Number(row.standard_workday_hours),
    vacationHoursPerWorkHour: Number(row.vacation_hours_per_work_hour),
    weekendsEnabled: row.weekends_enabled
  };
}

export function toOverride(row: any) {
  return {
    date: row.calendar_date,
    workHours: row.work_hours === null ? null : Number(row.work_hours),
    vacationDay: row.vacation_day,
    vacationHours: Number(row.vacation_hours),
    personalDay: row.personal_day,
    publicHoliday: row.public_holiday,
    unpaidDay: row.unpaid_day,
    unpaidHours: Number(row.unpaid_hours),
    note: row.note ?? ""
  };
}
