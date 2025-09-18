-- Migration: convert simulations.encoded_s from bytea to jsonb and ensure result is jsonb
DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type FROM information_schema.columns 
      WHERE table_name='simulations' AND column_name='encoded_s';

    IF col_type = 'bytea' THEN
        -- We have legacy base64 pickled blobs stored as raw bytes. We can't deserialize safely here.
        -- Strategy: wrap the original base64 string inside a JSON object under {"legacy_base64_pickle": "..."}
        -- so application code can decide how (or if) to handle it later.
        ALTER TABLE simulations
            ALTER COLUMN encoded_s TYPE jsonb USING (
                CASE 
                  WHEN encoded_s IS NULL THEN 'null'::jsonb
                  ELSE jsonb_build_object('legacy_base64_pickle', encode(encoded_s,'escape'))
                END
            );
    END IF;

    -- Ensure result column is jsonb (if somehow not already)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='simulations' AND column_name='result' AND data_type<>'jsonb'
    ) THEN
        ALTER TABLE simulations
            ALTER COLUMN result TYPE jsonb USING (
                CASE 
                  WHEN result IS NULL THEN 'null'::jsonb
                  ELSE result::jsonb
                END
            );
    END IF;
END$$;
