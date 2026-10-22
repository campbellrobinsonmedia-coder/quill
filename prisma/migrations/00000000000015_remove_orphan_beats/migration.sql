-- Deleting a script used to leave its own beats behind with every scope
-- (series, season, project) emptied. Nothing can reach them: every query
-- reads beats through a series, season or script. The delete is now handled
-- in the app; this clears out the ones already stranded.
DELETE FROM "Beat"
WHERE "seriesId" IS NULL AND "seasonId" IS NULL AND "projectId" IS NULL;
