-- Supabase exposes every table in the public schema through its Data API
-- (PostgREST) using the public anon key. Argus never uses that API — it
-- connects through Prisma as the table owner, which bypasses RLS — so enable
-- RLS with no policies to deny all Data API access (e.g. to users.password_hash).
ALTER TABLE "users"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analyze_results"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "market_snapshots"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_votes"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "decision_outcomes"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "credit_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations"  ENABLE ROW LEVEL SECURITY;
