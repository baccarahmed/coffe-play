-- Step 1: Update player_count enum and tables
-- First, temporarily make game_prices.player_count text
ALTER TABLE game_prices ALTER COLUMN player_count TYPE TEXT;

-- Update existing player_count = '4' to '2' in game_prices
UPDATE game_prices SET player_count = '2' WHERE player_count = '4';
-- Update sessions player_count 4 to 2
UPDATE sessions SET player_count = 2 WHERE player_count = 4;

-- Now, drop old enum and create new one
DROP TYPE IF EXISTS player_count;
CREATE TYPE player_count AS ENUM ('1', '2');

-- Update game_prices to use new enum
ALTER TABLE game_prices ALTER COLUMN player_count TYPE player_count USING player_count::player_count;

-- Update sessions to use new enum (optional, but let's keep consistency)
ALTER TABLE sessions ALTER COLUMN player_count TYPE player_count USING player_count::text::player_count;

-- Step 2: Add billing_type to games (or use existing pricing_type if preferred)
-- First, check if billing_type already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'billing_type') THEN
    ALTER TABLE games ADD COLUMN billing_type TEXT NOT NULL DEFAULT 'duration' CHECK (billing_type IN ('duration', 'match'));
    -- Also copy pricing_type to billing_type for consistency
    UPDATE games SET billing_type = pricing_type WHERE pricing_type IN ('duration', 'match');
  END IF;
END $$;

-- Set FIFA to billing_type = 'match' (assuming FIFA has name containing 'FIFA')
UPDATE games SET billing_type = 'match' WHERE name ILIKE '%FIFA%';

-- Step 3: Update game_prices table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_prices' AND column_name = 'price_per_match') THEN
    ALTER TABLE game_prices ADD COLUMN price_per_match NUMERIC;
  END IF;
END $$;

-- Make duration nullable
ALTER TABLE game_prices ALTER COLUMN duration DROP NOT NULL;

-- Add check constraint for coherence
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'game_prices_coherence' AND table_name = 'game_prices') THEN
    ALTER TABLE game_prices ADD CONSTRAINT game_prices_coherence CHECK (
      (duration IS NOT NULL AND price IS NOT NULL AND price_per_match IS NULL) OR
      (duration IS NULL AND price_per_match IS NOT NULL AND price IS NULL)
    );
  END IF;
END $$;
