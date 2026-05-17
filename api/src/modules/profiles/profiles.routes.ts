import { Router } from "express";
import { pool } from "../../db/pool.js";
import { requireAuth } from "../../middleware/auth.js";
import { isoDateSchema, profileSchema, settingsPatchSchema } from "../../shared/validation.js";
import { toProfile, toSettings } from "./profile.mapper.js";
import { assertOwnedProfile } from "./profile.service.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(
      "select id, name, description, created_at, updated_at from simulation_profiles where user_id = $1 and is_archived = false order by created_at asc",
      [req.userId]
    );
    res.json({ profiles: result.rows.map(toProfile) });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const body = profileSchema.parse(req.body);
    await client.query("begin");
    const profileResult = await client.query(
      `insert into simulation_profiles (user_id, name, description)
       values ($1, $2, $3)
       returning id, name, description, created_at, updated_at`,
      [req.userId, body.name, body.description || null]
    );
    const settingsResult = await client.query(
      `insert into simulation_settings (profile_id)
       values ($1)
       returning current_vacation_hours, current_vacation_as_of_date, standard_workday_hours, vacation_hours_per_work_hour, weekends_enabled`,
      [profileResult.rows[0].id]
    );
    await client.query("commit");
    res.status(201).json({
      profile: toProfile(profileResult.rows[0]),
      settings: toSettings(settingsResult.rows[0])
    });
  } catch (error) {
    await client.query("rollback");
    next(error);
  } finally {
    client.release();
  }
});

router.patch("/:profileId", async (req, res, next) => {
  try {
    await assertOwnedProfile(req.params.profileId, req.userId!);
    const body = profileSchema.partial().parse(req.body);
    const result = await pool.query(
      `update simulation_profiles
       set name = coalesce($1, name),
           description = coalesce($2, description),
           updated_at = now()
       where id = $3
       returning id, name, description, created_at, updated_at`,
      [body.name, body.description, req.params.profileId]
    );
    res.json({ profile: toProfile(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.delete("/:profileId", async (req, res, next) => {
  try {
    await assertOwnedProfile(req.params.profileId, req.userId!);
    await pool.query("update simulation_profiles set is_archived = true, updated_at = now() where id = $1", [
      req.params.profileId
    ]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.get("/:profileId/settings", async (req, res, next) => {
  try {
    await assertOwnedProfile(req.params.profileId, req.userId!);
    const result = await pool.query(
      `select current_vacation_hours, current_vacation_as_of_date, standard_workday_hours, vacation_hours_per_work_hour, weekends_enabled
       from simulation_settings where profile_id = $1`,
      [req.params.profileId]
    );
    res.json({ settings: toSettings(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.patch("/:profileId/settings", async (req, res, next) => {
  try {
    await assertOwnedProfile(req.params.profileId, req.userId!);
    const body = settingsPatchSchema.parse(req.body);
    const result = await pool.query(
      `update simulation_settings
       set current_vacation_hours = coalesce($1, current_vacation_hours),
           current_vacation_as_of_date = coalesce($2, current_vacation_as_of_date),
           standard_workday_hours = coalesce($3, standard_workday_hours),
           vacation_hours_per_work_hour = coalesce($4, vacation_hours_per_work_hour),
           weekends_enabled = coalesce($5, weekends_enabled),
           updated_at = now()
       where profile_id = $6
       returning current_vacation_hours, current_vacation_as_of_date, standard_workday_hours, vacation_hours_per_work_hour, weekends_enabled`,
      [
        body.currentVacationHours,
        body.currentVacationAsOfDate,
        body.standardWorkdayHours,
        body.vacationHoursPerWorkHour,
        body.weekendsEnabled,
        req.params.profileId
      ]
    );
    res.json({ settings: toSettings(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.get("/:profileId/year/:year", async (req, res, next) => {
  try {
    const year = Number(req.params.year);
    if (!Number.isInteger(year) || year < 1900 || year > 2200) {
      isoDateSchema.parse(req.params.year);
    }
    const profile = await assertOwnedProfile(req.params.profileId, req.userId!);
    const settings = await pool.query(
      `select current_vacation_hours, current_vacation_as_of_date, standard_workday_hours, vacation_hours_per_work_hour, weekends_enabled
       from simulation_settings where profile_id = $1`,
      [req.params.profileId]
    );
    const overrides = await pool.query(
      `select calendar_date, work_hours, vacation_day, vacation_hours, personal_day, public_holiday, unpaid_day, unpaid_hours, note
       from day_overrides
       where profile_id = $1 and calendar_date >= $2 and calendar_date <= $3
       order by calendar_date`,
      [req.params.profileId, `${year}-01-01`, `${year}-12-31`]
    );
    res.json({
      profile: toProfile(profile),
      settings: toSettings(settings.rows[0]),
      overrides: overrides.rows.map((row) => ({
        date: row.calendar_date,
        workHours: row.work_hours === null ? null : Number(row.work_hours),
        vacationDay: row.vacation_day,
        vacationHours: Number(row.vacation_hours),
        personalDay: row.personal_day,
        publicHoliday: row.public_holiday,
        unpaidDay: row.unpaid_day,
        unpaidHours: Number(row.unpaid_hours),
        note: row.note ?? ""
      }))
    });
  } catch (error) {
    next(error);
  }
});

export { router as profilesRouter };
