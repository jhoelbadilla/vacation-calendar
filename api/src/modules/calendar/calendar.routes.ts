import { Router } from "express";
import { pool } from "../../db/pool.js";
import { requireAuth } from "../../middleware/auth.js";
import { dayOverridePatchSchema, batchOverrideSchema, isoDateSchema } from "../../shared/validation.js";
import { toOverride } from "../profiles/profile.mapper.js";
import { assertOwnedProfile } from "../profiles/profile.service.js";

const router = Router({ mergeParams: true });
router.use(requireAuth);

function dateRange(start: string, end: string) {
  const dates: string[] = [];
  const current = new Date(`${start}T00:00:00Z`);
  const final = new Date(`${end}T00:00:00Z`);
  while (current <= final && dates.length <= 366) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function isWeekend(date: string) {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

async function upsertOverride(profileId: string, date: string, patch: any) {
  const existing = await pool.query("select * from day_overrides where profile_id = $1 and calendar_date = $2", [
    profileId,
    date
  ]);
  const merged = {
    workHours: existing.rows[0]?.work_hours ?? null,
    vacationDay: existing.rows[0]?.vacation_day ?? false,
    vacationHours: existing.rows[0]?.vacation_hours ?? 0,
    personalDay: existing.rows[0]?.personal_day ?? false,
    publicHoliday: existing.rows[0]?.public_holiday ?? false,
    unpaidDay: existing.rows[0]?.unpaid_day ?? false,
    unpaidHours: existing.rows[0]?.unpaid_hours ?? 0,
    note: existing.rows[0]?.note ?? null,
    ...patch
  };

  const result = await pool.query(
    `insert into day_overrides (
       profile_id, calendar_date, work_hours, vacation_day, vacation_hours, personal_day,
       public_holiday, unpaid_day, unpaid_hours, note
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     on conflict (profile_id, calendar_date)
     do update set
       work_hours = excluded.work_hours,
       vacation_day = excluded.vacation_day,
       vacation_hours = excluded.vacation_hours,
       personal_day = excluded.personal_day,
       public_holiday = excluded.public_holiday,
       unpaid_day = excluded.unpaid_day,
       unpaid_hours = excluded.unpaid_hours,
       note = excluded.note,
       updated_at = now()
     returning calendar_date, work_hours, vacation_day, vacation_hours, personal_day, public_holiday, unpaid_day, unpaid_hours, note`,
    [
      profileId,
      date,
      merged.workHours,
      merged.vacationDay,
      merged.vacationHours,
      merged.personalDay,
      merged.publicHoliday,
      merged.unpaidDay,
      merged.unpaidHours,
      merged.note
    ]
  );
  return toOverride(result.rows[0]);
}

router.put("/:date", async (req, res, next) => {
  try {
    const profileId = (req.params as { profileId: string; date: string }).profileId;
    const date = isoDateSchema.parse(req.params.date);
    await assertOwnedProfile(profileId, req.userId!);
    const patch = dayOverridePatchSchema.parse(req.body);
    const override = await upsertOverride(profileId, date, patch);
    res.json({ override });
  } catch (error) {
    next(error);
  }
});

router.delete("/:date", async (req, res, next) => {
  try {
    const profileId = (req.params as { profileId: string; date: string }).profileId;
    const date = isoDateSchema.parse(req.params.date);
    await assertOwnedProfile(profileId, req.userId!);
    await pool.query("delete from day_overrides where profile_id = $1 and calendar_date = $2", [
      profileId,
      date
    ]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.patch("/batch/apply", async (req, res, next) => {
  try {
    const profileId = (req.params as { profileId: string }).profileId;
    await assertOwnedProfile(profileId, req.userId!);
    const body = batchOverrideSchema.parse(req.body);
    const settings = await pool.query("select weekends_enabled from simulation_settings where profile_id = $1", [
      profileId
    ]);
    const dates = body.dates ?? dateRange(body.range!.start, body.range!.end);
    const filtered = dates.filter((date) => settings.rows[0].weekends_enabled || !body.skipDisabledWeekends || !isWeekend(date));
    const overrides = [];
    for (const date of filtered) {
      overrides.push(await upsertOverride(profileId, date, body.patch));
    }
    res.json({ updated: overrides.length, overrides });
  } catch (error) {
    next(error);
  }
});

export { router as calendarRouter };
