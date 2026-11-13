-- Normalize existing transaction hashes to lowercase.
UPDATE "analyze_results" SET "tx_hash" = lower("tx_hash") WHERE "tx_hash" IS NOT NULL;

-- The previous /api/record accepted unverified client tx hashes, so the same
-- hash may be attached to several analyses. Keep the earliest one and mark the
-- rest unsealed so they can be sealed again with a verified transaction.
UPDATE "analyze_results" AS a
SET "tx_hash" = NULL, "sealed" = false
WHERE a."tx_hash" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "analyze_results" AS b
    WHERE b."tx_hash" = a."tx_hash"
      AND (b."created_at", b."id") < (a."created_at", a."id")
  );

-- CreateIndex
CREATE UNIQUE INDEX "analyze_results_tx_hash_key" ON "analyze_results"("tx_hash");
