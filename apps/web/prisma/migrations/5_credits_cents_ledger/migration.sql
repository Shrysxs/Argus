-- Money moves from a float USD column to integer cents.
ALTER TABLE "users" ADD COLUMN "credits_cents" INTEGER NOT NULL DEFAULT 2500;
UPDATE "users" SET "credits_cents" = GREATEST(0, ROUND("credits_usd" * 100))::INTEGER;
ALTER TABLE "users" DROP COLUMN "credits_usd";
ALTER TABLE "users" ADD CONSTRAINT "users_credits_cents_non_negative" CHECK ("credits_cents" >= 0);

-- CreateTable
CREATE TABLE "credit_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "balance_after_cents" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_transactions_user_id_created_at_idx" ON "credit_transactions"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Opening balance entry for every existing user so the ledger reconciles.
INSERT INTO "credit_transactions" ("id", "user_id", "amount_cents", "balance_after_cents", "kind", "note")
SELECT gen_random_uuid()::text, "id", "credits_cents", "credits_cents", 'opening_balance', 'Balance migrated from legacy credits_usd'
FROM "users";
