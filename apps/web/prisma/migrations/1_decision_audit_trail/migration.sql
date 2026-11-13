-- AlterTable
ALTER TABLE "analyze_results" ADD COLUMN     "reasoning_hash" TEXT,
ADD COLUMN     "responsive_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "roster_size" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "sealed_at" TIMESTAMP(3),
ADD COLUMN     "sealed_by" TEXT,
ADD COLUMN     "signer_address" TEXT,
ADD COLUMN     "snapshot_id" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'complete';

-- CreateTable
CREATE TABLE "market_snapshots" (
    "id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "sources" TEXT[],
    "captured_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_votes" (
    "id" TEXT NOT NULL,
    "analyze_result_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "vote" TEXT,
    "confidence" DOUBLE PRECISION,
    "reasoning" TEXT,
    "data_points_cited" TEXT[],
    "prompt_version" TEXT,
    "prompt_hash" TEXT,
    "model_used" TEXT,
    "provider" TEXT,
    "temperature" DOUBLE PRECISION,
    "error" TEXT,
    "attempts" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "market_snapshots_hash_idx" ON "market_snapshots"("hash");

-- CreateIndex
CREATE INDEX "agent_votes_analyze_result_id_idx" ON "agent_votes"("analyze_result_id");

-- CreateIndex
CREATE INDEX "agent_votes_agent_id_created_at_idx" ON "agent_votes"("agent_id", "created_at");

-- CreateIndex
CREATE INDEX "analyze_results_user_id_created_at_idx" ON "analyze_results"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "analyze_results_sealed_sealed_at_idx" ON "analyze_results"("sealed", "sealed_at" DESC);

-- AddForeignKey
ALTER TABLE "analyze_results" ADD CONSTRAINT "analyze_results_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "market_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_votes" ADD CONSTRAINT "agent_votes_analyze_result_id_fkey" FOREIGN KEY ("analyze_result_id") REFERENCES "analyze_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

