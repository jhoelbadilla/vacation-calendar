import { pool } from "../../db/pool.js";
import { notFound } from "../../shared/errors.js";

export async function assertOwnedProfile(profileId: string, userId: string) {
  const result = await pool.query(
    "select id, name, description, created_at, updated_at from simulation_profiles where id = $1 and user_id = $2 and is_archived = false",
    [profileId, userId]
  );
  if (!result.rowCount) throw notFound();
  return result.rows[0];
}
