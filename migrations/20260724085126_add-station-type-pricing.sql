-- Add station_type enum
CREATE TYPE station_type AS ENUM ('ps4', 'ps5');

-- Add station_type column to stations table with default ps5
ALTER TABLE stations ADD COLUMN type station_type DEFAULT 'ps5';

-- Update unique constraint on game_prices to include station_type
ALTER TABLE game_prices DROP CONSTRAINT unique_game_pricing;
ALTER TABLE game_prices ADD COLUMN station_type station_type DEFAULT 'ps5';
ALTER TABLE game_prices ADD CONSTRAINT unique_game_pricing_with_type UNIQUE (game_name, player_count, duration, station_type);

-- Update existing sample data in game_prices to include station_type
UPDATE game_prices SET station_type = 'ps5' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE game_prices SET station_type = 'ps5' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE game_prices SET station_type = 'ps5' WHERE id = '33333333-3333-3333-3333-333333333333';
UPDATE game_prices SET station_type = 'ps5' WHERE id = '44444444-4444-4444-4444-444444444444';
UPDATE game_prices SET station_type = 'ps5' WHERE id = '55555555-5555-5555-5555-555555555555';
UPDATE game_prices SET station_type = 'ps5' WHERE id = '66666666-6666-6666-6666-666666666666';
UPDATE game_prices SET station_type = 'ps5' WHERE id = '77777777-7777-7777-7777-777777777777';
UPDATE game_prices SET station_type = 'ps5' WHERE id = '88888888-8888-8888-8888-888888888888';

-- Insert PS4 sample prices (slightly lower)
INSERT INTO game_prices (id, game_name, player_count, duration, station_type, price) VALUES 
    ('a1111111-1111-1111-1111-111111111111', 'FIFA', '2', '30min', 'ps4', 12.00),
    ('a2222222-2222-2222-2222-222222222222', 'FIFA', '2', '1h', 'ps4', 20.00),
    ('a3333333-3333-3333-3333-333333333333', 'FIFA', '4', '30min', 'ps4', 16.00),
    ('a4444444-4444-4444-4444-444444444444', 'FIFA', '4', '1h', 'ps4', 28.00),
    ('a5555555-5555-5555-5555-555555555555', 'Mortal Kombat', '2', '30min', 'ps4', 10.00),
    ('a6666666-6666-6666-6666-666666666666', 'Mortal Kombat', '2', '1h', 'ps4', 16.00),
    ('a7777777-7777-7777-7777-777777777777', 'Mortal Kombat', '4', '30min', 'ps4', 12.00),
    ('a8888888-8888-8888-8888-888888888888', 'Mortal Kombat', '4', '1h', 'ps4', 20.00);

-- Add RLS policies for game_prices (since we added station_type)
DROP POLICY IF EXISTS game_price_select_policy ON public.game_prices;
DROP POLICY IF EXISTS game_price_insert_policy ON public.game_prices;
DROP POLICY IF EXISTS game_price_update_policy ON public.game_prices;

CREATE POLICY game_price_select_policy ON public.game_prices FOR SELECT USING (true);
CREATE POLICY game_price_insert_policy ON public.game_prices FOR INSERT WITH CHECK (true);
CREATE POLICY game_price_update_policy ON public.game_prices FOR UPDATE USING (true);
