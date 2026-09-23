-- ============================================
-- OMNI_OS — 002: RUN LINEAGE
--
-- 001 recorded WHAT fed a run as an opaque id: a block instance for a wire,
-- a pool for memory, and — when one persona feeds another — a persona block.
-- That last case is a lie by omission. A persona block is not evidence; the
-- specific ANSWER it gave is, and that answer came from a run this table
-- already has a row for.
--
-- This makes that edge real. `inference_source.parent_run_id` points at the
-- run whose output was consumed, turning the ledger into a DAG of reasoning
-- that `WITH RECURSIVE` can walk to arbitrary depth.
--
-- The canvas answers "what does this persona know?" one hop deep, with the
-- source chips. In a cascade the real grounding is several hops back, and it
-- is unrecoverable from the canvas afterwards: block data is live and gets
-- overwritten. Postgres is the only place that snapshot survives.
-- ============================================

ALTER TABLE inference_source
    ADD COLUMN IF NOT EXISTS parent_run_id BIGINT
        REFERENCES inference_run (id) ON DELETE SET NULL;

-- ON DELETE SET NULL, not CASCADE: deleting an upstream run must not delete
-- the downstream run's record of having consumed something. The edge goes
-- unresolved; the fact that a source existed does not.

DO $$
BEGIN
    -- Only an 'inference' source can name a parent run. A market or a memory
    -- pool is not a run, and a NULL parent on an inference edge is the honest
    -- state for a row written before this migration.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'inference_source_parent_only_for_inference'
    ) THEN
        ALTER TABLE inference_source
            ADD CONSTRAINT inference_source_parent_only_for_inference CHECK (
                parent_run_id IS NULL OR kind = 'inference'
            );
    END IF;

    -- A run cannot be its own parent. Deeper cycles are possible (the canvas
    -- does not stop you wiring two personas to each other — planCascade
    -- detects and breaks them) and are handled by the lineage query's path
    -- tracking, but the one-step case is cheap to refuse outright.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conname = 'inference_source_no_self_parent'
    ) THEN
        ALTER TABLE inference_source
            ADD CONSTRAINT inference_source_no_self_parent CHECK (
                parent_run_id IS NULL OR parent_run_id <> run_id
            );
    END IF;
END
$$;

-- The recursive walk joins child → parent on this column every iteration.
-- Partial: only inference edges ever set it.
CREATE INDEX IF NOT EXISTS inference_source_parent_run_idx
    ON inference_source (parent_run_id)
    WHERE parent_run_id IS NOT NULL;
