-- ============================================
-- OMNI_OS — 001: INFERENCE LEDGER
--
-- Durable record of every LLM execution that passed through /api/llm.
-- This is the ONLY thing Postgres owns. Canvas state — blocks, wires,
-- shells, personas, memory — stays in IndexedDB in the browser, because
-- it belongs to the person at the keyboard. A run belongs to the server:
-- the server is the only party that held the key, called the provider,
-- and knows how long it took.
--
-- Written twice per execution: one row at dispatch (status 'running'),
-- one UPDATE at the terminal state. A row stuck in 'running' is an
-- honest record of a process that died mid-call, not a bug to hide.
-- ============================================

CREATE TABLE IF NOT EXISTS inference_run (
    id              BIGSERIAL PRIMARY KEY,

    -- What was asked of whom.
    provider        TEXT        NOT NULL CHECK (provider IN ('local', 'anthropic', 'google')),
    model           TEXT        NOT NULL CHECK (length(model) BETWEEN 1 AND 200),
    streamed        BOOLEAN     NOT NULL,

    -- Lifecycle. 'canceled' is the user pressing Stop mid-stream: the
    -- partial answer is theirs and is kept, so it is not a failure.
    status          TEXT        NOT NULL CHECK (status IN ('running', 'succeeded', 'failed', 'canceled')),

    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at     TIMESTAMPTZ,
    latency_ms      INTEGER     CHECK (latency_ms >= 0),

    -- Request shape. Full prompts are not stored; `prompt_excerpt` is the
    -- tail of the final user turn, truncated by the writer.
    message_count   SMALLINT    NOT NULL CHECK (message_count > 0),
    prompt_chars    INTEGER     NOT NULL CHECK (prompt_chars >= 0),
    prompt_excerpt  TEXT,
    temperature     REAL        CHECK (temperature BETWEEN 0 AND 2),
    max_tokens      INTEGER     CHECK (max_tokens > 0),

    -- Outcome.
    output_chars    INTEGER     CHECK (output_chars >= 0),
    output_excerpt  TEXT,
    tokens_used     INTEGER     CHECK (tokens_used >= 0),
    finish_reason   TEXT,
    error           TEXT,

    -- A terminal row has an end and a duration; a running row has neither.
    CONSTRAINT inference_run_terminal_shape CHECK (
        (status = 'running'  AND finished_at IS NULL     AND latency_ms IS NULL)
     OR (status <> 'running' AND finished_at IS NOT NULL AND latency_ms IS NOT NULL)
    ),

    -- Only a failure carries an error message.
    CONSTRAINT inference_run_error_only_on_failure CHECK (
        status = 'failed' OR error IS NULL
    )
);

-- The one read this ledger exists to serve: the most recent runs.
CREATE INDEX IF NOT EXISTS inference_run_started_at_idx
    ON inference_run (started_at DESC, id DESC);

-- Filtering recent runs by provider (the API's `provider` param).
CREATE INDEX IF NOT EXISTS inference_run_provider_started_at_idx
    ON inference_run (provider, started_at DESC);

-- "What broke?" is the second question anyone asks a ledger. Partial,
-- because failures are the small minority of rows.
CREATE INDEX IF NOT EXISTS inference_run_failed_idx
    ON inference_run (started_at DESC)
    WHERE status = 'failed';

-- ============================================
-- What actually fed the run.
--
-- The canvas already answers "what does this persona know?" by pointing at
-- wires. This makes that answer durable: the sources recorded here are the
-- ones the turn really consumed, not every wire attached to the block.
-- Composite PK, so a source cannot be cited twice for one run.
-- ============================================

CREATE TABLE IF NOT EXISTS inference_source (
    run_id      BIGINT NOT NULL REFERENCES inference_run (id) ON DELETE CASCADE,
    -- Block instance id for 'wire', pool id for 'memory'. Opaque here.
    source_id   TEXT   NOT NULL CHECK (length(source_id) BETWEEN 1 AND 200),
    kind        TEXT   NOT NULL CHECK (kind IN ('wire', 'memory', 'inference')),
    label       TEXT   NOT NULL CHECK (length(label) BETWEEN 1 AND 200),

    PRIMARY KEY (run_id, source_id)
);
