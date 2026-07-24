-- Business Rules Migration - Final Version
-- Complete implementation of 1-2 player system and billing type flexibility

-- Step 1: Safely handle player_count enum transition (2,4 -> 1,2)
DO $$
BEGIN
  -- Create new enum type for player_count
  CREATE TYPE player_count_new AS ENUM ('1', '2');
  
  -- Convert data in game_prices: map 4 -> 2
  UPDATE game_prices 
  SET player_count = '2' 
  WHERE player_count = '4';
  
  -- Convert data in sessions: map 4 -> 2
  UPDATE sessions 
  SET player_count = CASE WHEN player_count = 4 THEN 1 ELSE player_count END
  WHERE player_count IN (4);
  
  -- Drop old enum and rename new one
  DROP TYPE player_count CASCADE;
  ALTER TYPE player_count_new RENAME TO player_count;
  
  -- Update column types to use new enum
  ALTER TABLE game_prices ALTER COLUMN player_count TYPE player_count USING player_count::text::player_count;
  ALTER TABLE sessions ALTER COLUMN player_count TYPE player_count USING player_count::text::player_count;
END $$;

-- Step 2: Add billing_type column to games table
DO $$
BEGIN
  -- Add billing_type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'billing_type') THEN
    ALTER TABLE games ADD COLUMN billing_type TEXT NOT NULL DEFAULT 'duration' CHECK (billing_type IN ('duration', 'match'));
    
    -- Copy existing pricing_type to billing_type for games that have it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'pricing_type') THEN
      UPDATE games SET billing_type = pricing_type WHERE pricing_type IN ('duration', 'match');
    END IF;
    
    -- Update FIFA games to billing_type = 'match'
    UPDATE games SET billing_type = 'match' WHERE name ILIKE '%FIFA%';
  END IF;
END $$;

-- Step 3: Update game_prices table structure for flexible billing
DO $$
BEGIN
  -- Add price_per_match column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_prices' AND column_name = 'price_per_match') THEN
    ALTER TABLE game_prices ADD COLUMN price_per_match NUMERIC;
  END IF;
  
  -- Make duration nullable to support match-based pricing
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_prices' AND column_name = 'duration') THEN
    ALTER TABLE game_prices ALTER COLUMN duration DROP NOT NULL;
  END IF;
  
  -- Add constraint to ensure pricing integrity
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'game_prices_coherence' AND table_name = 'game_prices') THEN
    ALTER TABLE game_prices ADD CONSTRAINT game_prices_coherence CHECK (
      (duration IS NOT NULL AND price IS NOT NULL AND price_per_match IS NULL) OR
      (duration IS NULL AND price_per_match IS NOT NULL AND price IS NULL)
    );
  END IF;
END $$;

-- Step 4: Add match_count to sessions (instead of nb_matches)
DO $$
BEGIN
  -- Add match_count column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'match_count') THEN
    ALTER TABLE sessions ADD COLUMN match_count INTEGER;
  END IF;
END $$;

-- Step 5: Update existing game_prices data for new business rules
DO $$
BEGIN
  -- For duration-based games (non-FIFA), ensure we have both 1 and 2 player options
  INSERT INTO game_prices (id, game_name, player_count, duration, price, station_type)
  SELECT 
    gen_random_uuid(),
    game_name,
    '1' as player_count,
    duration, 
    price,
    station_type
  FROM game_prices 
  WHERE game_name IN ('Mortal Kombat', 'UFC', 'GTA V') 
    AND player_count = '2'
    AND NOT EXISTS (
      SELECT 1 FROM game_prices gp2 
      WHERE gp2.game_name = game_prices.game_name 
        AND gp2.player_count = '1' 
        AND gp2.duration = game_prices.duration
        AND gp2.station_type = game_prices.station_type
    )
  ON CONFLICT (game_name, player_count, duration, station_type) DO NOTHING;
  
  -- For FIFA games, convert duration-based entries to match-based
  -- Keep existing duration entries for backward compatibility but add match-based entries
  INSERT INTO game_prices (id, game_name, player_count, price_per_match, station_type)
  SELECT 
    gen_random_uuid(),
    game_name,
    player_count,
    price,
    station_type
  FROM game_prices 
  WHERE game_name = 'FIFA' 
    AND duration IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM game_prices gp2 
      WHERE gp2.game_name = game_prices.game_name 
        AND gp2.player_count = game_prices.player_count
        AND gp2.price_per_match IS NOT NULL
        AND gp2.station_type = game_prices.station_type
    )
  ON CONFLICT (game_name, player_count, station_type) DO NOTHING;
  
  -- Remove duration entries for FIFA that we've converted to match-based
  DELETE FROM game_prices WHERE game_name = 'FIFA' AND duration IS NOT NULL AND price_per_match IS NULL;
END $$;

-- Step 6: Create RLS policies for personal history access (Worker)
-- Enable RLS on sessions and sales tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for Worker access (personal only)
DO $$
BEGIN
  -- Sessions policy: Workers can only access their own sessions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'sessions_worker_personal') THEN
    EXECUTE '
      CREATE POLICY sessions_worker_personal ON sessions
      FOR SELECT USING (
        auth.uid() = worker_id OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid()::uuid 
          AND role = ''admin''
        )
      );
    ';
  END IF;
  
  -- Sessions admin policy (unchanged)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'session_select_policy') THEN
    EXECUTE '
      CREATE POLICY session_select_policy ON sessions
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = ''admin'') OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = ''worker'' AND cafe_id = (SELECT cafe_id FROM stations WHERE id = sessions.station_id)) OR
        worker_id = auth.uid()::uuid
      );
    ';
  END IF;
  
  -- Sales policy: Workers can only access their own sales
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'sales_worker_personal') THEN
    EXECUTE '
      CREATE POLICY sales_worker_personal ON sales
      FOR SELECT USING (
        auth.uid() = worker_id OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid()::uuid 
          AND role = ''admin''
        )
      );
    ';
  END IF;
  
  -- Sales admin policy (unchanged)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sales' AND policyname = 'sale_select_policy') THEN
    EXECUTE '
      CREATE POLICY sale_select_policy ON sales
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = ''admin'') OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = ''worker'' AND cafe_id = (SELECT c.id FROM cafes c WHERE c.id = sales.cafe_id)) OR
        worker_id = auth.uid()::uuid
      );
    ';
  END IF;
END $$;

-- Step 7: Add personal history section to sidebar navigation
-- This will be handled by frontend code, not database

-- Step 8: Update existing data for billing_type consistency
DO $$
BEGIN
  -- Ensure all games have proper billing_type
  UPDATE games 
  SET billing_type = 
    CASE 
      WHEN name ILIKE ''%FIFA%'' THEN ''match''
      ELSE ''duration''
    END
  WHERE billing_type IS NULL OR billing_type NOT IN (''duration'', ''match'');
END $$;

-- Step 9: Index for personal history queries
CREATE INDEX IF NOT EXISTS idx_sessions_worker_personal ON sessions(worker_id) WHERE worker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_worker_personal ON sales(worker_id) WHERE worker_id IS NOT NULL;

-- Validation: Show final structure
SELECT '=== Games Table ===' AS section;
SELECT id, name, COALESCE(billing_type, 'null') as billing_type FROM games;

SELECT '=== Game Prices Table ===' AS section;
SELECT gp.game_name, gp.player_count, gp.duration, gp.price, gp.price_per_match, gp.station_type, g.billing_type
FROM game_prices gp
JOIN games g ON gp.game_name = g.name
ORDER BY gp.game_name, gp.player_count, gp.duration;

SELECT '=== Sessions Sample ===' AS section;
SELECT s.id, s.station_id, s.game_id, s.worker_id, s.player_count, s.duration, s.match_count, s.status, s.created_at
FROM sessions s
WHERE s.worker_id IS NOT NULL
LIMIT 5;

SELECT '=== Sales Sample ===' AS section;
SELECT s.id, s.cafe_id, s.worker_id, s.product_id, s.quantity, s.total_price, s.sale_time
FROM sales s
WHERE s.worker_id IS NOT NULL
LIMIT 5;

SELECT '=== Player Count Values ===' AS section;
SELECT player_count FROM (
  SELECT DISTINCT player_count FROM game_prices
  UNION
  SELECT DISTINCT player_count FROM sessions
) sub ORDER BY player_count;

SELECT '=== Billing Types ===' AS section;
SELECT DISTINCT billing_type FROM games;