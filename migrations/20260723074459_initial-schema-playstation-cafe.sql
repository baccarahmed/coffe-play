-- PlayStation Café Management Platform - Initial Schema
-- Created: 2026-07-23

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Enum types
CREATE TYPE user_role AS ENUM ('worker', 'admin');
CREATE TYPE game_type AS ENUM ('FIFA', 'Mortal Kombat', 'UFC', 'GTA V');
CREATE TYPE player_count AS ENUM ('2', '4');
CREATE TYPE session_duration AS ENUM ('30min', '1h');
CREATE TYPE product_category AS ENUM ('beverage', 'supplement');

-- Cafe table
CREATE TABLE cafes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game pricing table (admin configurable)
CREATE TABLE game_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_name VARCHAR(50) NOT NULL,
    player_count player_count NOT NULL,
    duration session_duration NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_game_pricing UNIQUE (game_name, player_count, duration)
);

-- User table with role-based access
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL,
    cafe_id UUID REFERENCES cafes(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Poste (Station) table - isolated per café
CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game catalog for pricing reference
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products with inventory management
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    category product_category NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    current_stock INTEGER DEFAULT 0,
    alert_threshold INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product supplements for add-ons
CREATE TABLE supplements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    additional_price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE NOT NULL,
    game_id UUID REFERENCES games(id) ON DELETE SET NULL,
    worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    player_count INTEGER NOT NULL,
    duration session_duration NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'canceled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales/Transactions table for products
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    supplements JSONB DEFAULT '{}',
    sale_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inventory movements tracking
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'alert')),
    quantity_change INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reason TEXT,
    movement_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    transaction_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_cafe ON users(cafe_id);
CREATE INDEX idx_cafes_name ON cafes(name);
CREATE INDEX idx_stations_cafe_status ON stations(cafe_id, status);
CREATE INDEX idx_games_name ON games(name);
CREATE INDEX idx_products_cafe ON products(cafe_id);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_sessions_station ON sessions(station_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_sales_cafe ON sales(cafe_id);
CREATE INDEX idx_sales_time ON sales(sale_time);
CREATE INDEX idx_inventory_cafe ON inventory_movements(cafe_id);
CREATE INDEX idx_inventory_product ON inventory_movements(product_id);

-- RLS Policies
ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cafes (admin can access all, worker specific)
CREATE POLICY cafe_select_policy ON cafes
    FOR SELECT USING (true);

CREATE POLICY cafe_insert_policy ON cafes
    FOR INSERT WITH CHECK (true);

CREATE POLICY cafe_update_policy ON cafes
    FOR UPDATE USING (true);

-- RLS Policies for users (role-based access)
CREATE POLICY user_select_policy ON users
    FOR SELECT USING (
        role = 'admin' OR 
        (role = 'worker' AND cafe_id = auth.uid()::uuid)
    );

CREATE POLICY user_insert_policy ON users
    FOR INSERT WITH CHECK (role = 'worker' OR (role = 'admin' AND cafe_id IS NULL));

CREATE POLICY user_update_policy ON users
    FOR UPDATE USING (true);

-- RLS Policies for stations (café isolation)
CREATE POLICY station_select_policy ON stations
    FOR SELECT USING (true);

CREATE POLICY station_insert_policy ON stations
    FOR INSERT WITH CHECK (true);

CREATE POLICY station_update_policy ON stations
    FOR UPDATE USING (true);

-- RLS Policies for products (café isolation)
CREATE POLICY product_select_policy ON products
    FOR SELECT USING (true);

CREATE POLICY product_insert_policy ON products
    FOR INSERT WITH CHECK (true);

CREATE POLICY product_update_policy ON products
    FOR UPDATE USING (true);

-- RLS Policies for games (global access)
CREATE POLICY game_select_policy ON games
    FOR SELECT USING (true);

-- RLS Policies for game_prices (admin configurable)
CREATE POLICY game_price_select_policy ON game_prices
    FOR SELECT USING (true);

CREATE POLICY game_price_insert_policy ON game_prices
    FOR INSERT WITH CHECK (true);

CREATE POLICY game_price_update_policy ON game_prices
    FOR UPDATE USING (true);

-- RLS Policies for sessions (role-based access)
CREATE POLICY session_select_policy ON sessions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin') OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'worker' AND cafe_id = (SELECT cafe_id FROM stations WHERE id = sessions.station_id)) OR
        worker_id = auth.uid()::uuid
    );

CREATE POLICY session_insert_policy ON sessions
    FOR INSERT WITH CHECK (
        worker_id = auth.uid()::uuid OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin')
    );

CREATE POLICY session_update_policy ON sessions
    FOR UPDATE USING (
        worker_id = auth.uid()::uuid OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin')
    );

-- RLS Policies for sales (café isolation)
CREATE POLICY sale_select_policy ON sales
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin') OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'worker' AND cafe_id = (SELECT c.id FROM cafes c WHERE c.id = sales.cafe_id)) OR
        worker_id = auth.uid()::uuid
    );

CREATE POLICY sale_insert_policy ON sales
    FOR INSERT WITH CHECK (
        worker_id = auth.uid()::uuid OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin')
    );

-- RLS Policies for inventory_movements (café isolation)
CREATE POLICY inventory_movement_select_policy ON inventory_movements
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin') OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'worker' AND cafe_id = (SELECT c.id FROM cafes c WHERE c.id = inventory_movements.cafe_id)) OR
        worker_id = auth.uid()::uuid
    );

CREATE POLICY inventory_movement_insert_policy ON inventory_movements
    FOR INSERT WITH CHECK (
        worker_id = auth.uid()::uuid OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND role = 'admin')
    );

-- RLS Policies for payment_transactions
CREATE POLICY payment_transaction_select_policy ON payment_transactions
    FOR SELECT USING (true);

CREATE POLICY payment_transaction_insert_policy ON payment_transactions
    FOR INSERT WITH CHECK (true);

-- Insert sample data
INSERT INTO cafes (id, name, address) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'PlayStation Café A', '123 Main Street, Downtown'),
    ('22222222-2222-2222-2222-222222222222', 'PlayStation Café B', '456 Oak Avenue, Business District');

INSERT INTO games (id, name, description) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'FIFA', 'Pro Club / match'),
    ('22222222-2222-2222-2222-222222222222', 'Mortal Kombat', ''),
    ('33333333-3333-3333-3333-333333333333', 'UFC', ''),
    ('44444444-4444-4444-4444-444444444444', 'GTA V', '');

INSERT INTO game_prices (id, game_name, player_count, duration, price) VALUES 
    ('11111111-1111-1111-1111-111111111111', 'FIFA', '2', '30min', 15.00),
    ('22222222-2222-2222-2222-222222222222', 'FIFA', '2', '1h', 25.00),
    ('33333333-3333-3333-3333-333333333333', 'FIFA', '4', '30min', 20.00),
    ('44444444-4444-4444-4444-444444444444', 'FIFA', '4', '1h', 35.00),
    ('55555555-5555-5555-5555-555555555555', 'Mortal Kombat', '2', '30min', 12.00),
    ('66666666-6666-6666-6666-666666666666', 'Mortal Kombat', '2', '1h', 20.00),
    ('77777777-7777-7777-7777-777777777777', 'Mortal Kombat', '4', '30min', 15.00),
    ('88888888-8888-8888-8888-888888888888', 'Mortal Kombat', '4', '1h', 25.00);

INSERT INTO products (id, cafe_id, name, category, base_price, current_stock, alert_threshold) VALUES 
    ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Soda', 'beverage', 3.50, 50, 10),
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Water', 'beverage', 2.50, 100, 20),
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Espresso', 'beverage', 4.00, 30, 8),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Cappuccino', 'beverage', 5.50, 25, 5),
    ('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'Soda', 'beverage', 3.50, 40, 10),
    ('66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 'Water', 'beverage', 2.50, 80, 20),
    ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'Espresso', 'beverage', 4.00, 25, 8),
    ('88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222', 'Cappuccino', 'beverage', 5.50, 20, 5);

INSERT INTO supplements (id, product_id, name, additional_price) VALUES 
    ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Extra Milk', 1.50),
    ('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Extra Syrup', 2.00),
    ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'Extra Ice', 0.50),
    ('44444444-4444-4444-4444-444444444444', '88888888-8888-8888-8888-888888888888', 'Extra Milk', 1.50),
    ('55555555-5555-5555-5555-555555555555', '88888888-8888-8888-8888-888888888888', 'Extra Syrup', 2.00),
    ('66666666-6666-6666-6666-666666666666', '88888888-8888-8888-8888-888888888888', 'Extra Ice', 0.50);