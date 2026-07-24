-- Migration 20260724094000 - Business Rules v2
-- Maintenant tous les jeux se jouent à 1 ou 2 joueurs, et sont facturés par durée (sauf FIFA qui est facturé par match)

-- Step 1: Supprimer les valeurs 4 existantes de player_count et les mapper à 2
UPDATE game_prices SET player_count = '2' WHERE player_count = '4';
UPDATE sessions SET player_count = player_count WHERE player_count = 4;

-- Step 2: Supprimer l'ancien enum player_count et créer le nouveau (1, 2)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'player_count') THEN
        ALTER TYPE player_count RENAME TO player_count_old;
    END IF;
END $$;

CREATE TYPE player_count AS ENUM ('1', '2');

-- Step 3: Mettre à jour game_prices et sessions vers le nouvel enum
DO $$
BEGIN
    -- Convertir player_count de text vers le nouvel enum
    ALTER TABLE game_prices ALTER COLUMN player_count TYPE player_count USING player_count::text::player_count;
    
    -- Pour sessions, convertir de int vers enum (mapper 4->2)
    ALTER TABLE sessions ALTER COLUMN player_count TYPE player_count USING 
        CASE 
            WHEN player_count = 4 THEN '2'::player_count
            WHEN player_count = 1 THEN '1'::player_count
            ELSE player_count::text::player_count
        END;
    
    -- Supprimer l'ancien type
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'player_count_old') THEN
        DROP TYPE player_count_old;
    END IF;
END $$;

-- Step 4: Ajouter la colonne billing_type à games (si elle n'existe pas)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'billing_type') THEN
        ALTER TABLE games ADD COLUMN billing_type TEXT NOT NULL DEFAULT 'duration' CHECK (billing_type IN ('duration', 'match'));
        -- Copier depuis pricing_type si la colonne existe
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'pricing_type') THEN
            UPDATE games SET billing_type = pricing_type WHERE pricing_type IN ('duration', 'match');
        END IF;
        -- Mettre à jour FIFA à 'match'
        UPDATE games SET billing_type = 'match' WHERE name ILIKE '%FIFA%';
    END IF;
END $$;

-- Step 5: Appliquer price_per_match et cohérence pour game_prices
DO $$
BEGIN
    -- Ajouter price_per_match si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_prices' AND column_name = 'price_per_match') THEN
        ALTER TABLE game_prices ADD COLUMN price_per_match NUMERIC;
    END IF;
    
    -- Rendre duration nullable (déjà fait pour FIFA mais peut rester pour tous)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_prices' AND column_name = 'duration') THEN
        ALTER TABLE game_prices ALTER COLUMN duration DROP NOT NULL;
    END IF;
    
    -- Ajouter la contrainte de cohérence si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'game_prices_coherence' AND table_name = 'game_prices') THEN
        ALTER TABLE game_prices ADD CONSTRAINT game_prices_coherence CHECK (
            (duration IS NOT NULL AND price IS NOT NULL AND price_per_match IS NULL) OR
            (duration IS NULL AND price_per_match IS NOT NULL AND price IS NULL)
        );
    END IF;
END $$;

-- Step 6: Supprimer nb_matches (mais sessions a match_count, donc on peut la garder comme niveau d'application)
-- Note: sessions a déjà match_count pour FIFA, donc on peut la garder
DO $$
BEGIN
    -- Supprimer nb_matches si elle existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'nb_matches') THEN
        ALTER TABLE sessions DROP COLUMN nb_matches;
    END IF;
END $$;

-- Step 7: Mettre à jour tous les game_prices avec billing_type = 'duration' pour avoir les deux versions 1 joueur et 2 joueurs
-- Pour les jeux avec billing_type = 'duration' (Mortal Kombat, UFC, GTA V), on a besoin de player_count = '1' et '2'
DO $$
BEGIN
    -- Supprimer tous les prices pour player_count = '1' pour les jeux duration
    DELETE FROM game_prices WHERE game_name IN ('Mortal Kombat', 'UFC', 'GTA V') AND player_count = '1';
    
    -- Insérer les versions 1 joueur pour les jeux duration
    INSERT INTO game_prices (game_name, player_count, duration, price, station_type)
    SELECT 
        game_name, 
        '1' as player_count, 
        duration, 
        price, 
        station_type
    FROM game_prices 
    WHERE game_name IN ('Mortal Kombat', 'UFC', 'GTA V') 
          AND player_count = '2' 
          AND duration IS NOT NULL
      AND game_name NOT IN (SELECT game_name FROM games WHERE billing_type = 'match')
    ON CONFLICT (game_name, player_count, duration, station_type) DO NOTHING;
    
    -- Pour FIFA (billing_type = 'match'), garder seulement per_match (pas de versions 30min/1h)
    -- Les bases de données devraient déjà être mises à jour avec billing_type = 'match' pour FIFA
END $$;

-- Validation : Afficher le nouvel état des tables clés
SELECT 'games' as table_name, * FROM games ORDER BY name;
SELECT 'game_prices' as table_name, * FROM game_prices ORDER BY game_name, player_count, duration, station_type;
SELECT 'sessions' as table_name, id, game_id, player_count, duration, match_count FROM sessions ORDER BY created_at DESC;