-- CreateTable
CREATE TABLE "decision_outcomes" (
    "analyze_result_id" TEXT NOT NULL,
    "horizon_days" INTEGER NOT NULL,
    "flat_band_pct" DOUBLE PRECISION NOT NULL,
    "entry_price" DOUBLE PRECISION NOT NULL,
    "exit_price" DOUBLE PRECISION NOT NULL,
    "exit_price_at" TIMESTAMP(3) NOT NULL,
    "return_pct" DOUBLE PRECISION NOT NULL,
    "realized_direction" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "scored_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_outcomes_pkey" PRIMARY KEY ("analyze_result_id")
);

-- CreateIndex
CREATE INDEX "decision_outcomes_scored_at_idx" ON "decision_outcomes"("scored_at");

-- AddForeignKey
ALTER TABLE "decision_outcomes" ADD CONSTRAINT "decision_outcomes_analyze_result_id_fkey" FOREIGN KEY ("analyze_result_id") REFERENCES "analyze_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

