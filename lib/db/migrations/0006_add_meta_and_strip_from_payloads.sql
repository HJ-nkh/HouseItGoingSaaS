-- Add meta jsonb column; backfill from existing encoded_s/result meta fields; strip them from payloads
DO $$
BEGIN
    -- 1) Add column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='simulations' AND column_name='meta'
    ) THEN
        ALTER TABLE simulations ADD COLUMN meta jsonb;
    END IF;

    -- 2) Backfill meta from encoded_s.meta first (preferred), else from result.meta
    UPDATE simulations
    SET meta = COALESCE(
        (CASE WHEN jsonb_typeof(encoded_s) = 'object' THEN encoded_s->'meta' ELSE NULL END),
        (CASE WHEN jsonb_typeof(result) = 'object' THEN result->'meta' ELSE NULL END),
        meta
    )
    WHERE meta IS NULL;

    -- 3) Remove meta key from encoded_s and result to keep structure focused on state/data
    UPDATE simulations
    SET encoded_s = (CASE WHEN jsonb_typeof(encoded_s) = 'object' THEN encoded_s - 'meta' ELSE encoded_s END);

    UPDATE simulations
    SET result = (CASE WHEN jsonb_typeof(result) = 'object' THEN result - 'meta' ELSE result END);
END$$;
