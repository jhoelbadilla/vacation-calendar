export type User = {
  id: string;
  username: string;
  email: string;
};

export type Profile = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type Settings = {
  currentVacationHours: number;
  currentVacationAsOfDate: string;
  standardWorkdayHours: number;
  vacationHoursPerWorkHour: number;
  weekendsEnabled: boolean;
};

export type DayOverride = {
  date: string;
  workHours: number | null;
  vacationDay: boolean;
  vacationHours: number;
  personalDay: boolean;
  publicHoliday: boolean;
  unpaidDay: boolean;
  unpaidHours: number;
  note?: string;
};

export type YearPayload = {
  profile: Profile;
  settings: Settings;
  overrides: DayOverride[];
};
