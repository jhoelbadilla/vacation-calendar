import { z } from "zod";

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional().nullable()
});

export const settingsPatchSchema = z.object({
  currentVacationHours: z.number().min(0).max(99999).optional(),
  currentVacationAsOfDate: isoDateSchema.optional(),
  standardWorkdayHours: z.number().gt(0).max(24).optional(),
  vacationHoursPerWorkHour: z.number().min(0).max(24).optional(),
  weekendsEnabled: z.boolean().optional()
});

export const dayOverridePatchSchema = z.object({
  workHours: z.number().min(0).max(24).nullable().optional(),
  vacationDay: z.boolean().optional(),
  vacationHours: z.number().min(0).max(24).optional(),
  personalDay: z.boolean().optional(),
  publicHoliday: z.boolean().optional(),
  unpaidDay: z.boolean().optional(),
  unpaidHours: z.number().min(0).max(24).optional(),
  note: z.string().trim().max(500).nullable().optional()
});

export const batchOverrideSchema = z.object({
  dates: z.array(isoDateSchema).min(1).max(366).optional(),
  range: z
    .object({
      start: isoDateSchema,
      end: isoDateSchema
    })
    .optional(),
  skipDisabledWeekends: z.boolean().default(true),
  patch: dayOverridePatchSchema
}).refine((body) => body.dates || body.range, "Provide dates or a range.");
