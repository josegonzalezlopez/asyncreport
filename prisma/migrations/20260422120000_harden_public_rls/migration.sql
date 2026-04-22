-- Hardening for Supabase exposed public schema:
-- - Enable RLS in application tables.
-- - Revoke direct DML from anon/authenticated.
-- - Keep `_prisma_migrations` internal-only.
DO $$
BEGIN
  IF to_regclass('public."Project"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."Project" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public."Project" FROM anon, authenticated';
  END IF;

  IF to_regclass('public."User"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public."User" FROM anon, authenticated';
  END IF;

  IF to_regclass('public."DailyReport"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."DailyReport" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public."DailyReport" FROM anon, authenticated';
  END IF;

  IF to_regclass('public."ProjectUser"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."ProjectUser" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public."ProjectUser" FROM anon, authenticated';
  END IF;

  IF to_regclass('public."AISummary"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."AISummary" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public."AISummary" FROM anon, authenticated';
  END IF;

  IF to_regclass('public."Notification"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."Notification" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public."Notification" FROM anon, authenticated';
  END IF;

  IF to_regclass('public."ApiKey"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."ApiKey" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public."ApiKey" FROM anon, authenticated';
  END IF;

  IF to_regclass('public."_prisma_migrations"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON TABLE public."_prisma_migrations" FROM anon, authenticated';
  END IF;
END $$;
