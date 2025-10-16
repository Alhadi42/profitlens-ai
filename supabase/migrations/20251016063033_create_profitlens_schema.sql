/*
  # ProfitLens AI - Complete Database Schema

  ## Overview
  This migration creates the complete database schema for ProfitLens AI, a restaurant management system
  for tracking inventory, menu items, sales, operational costs, waste, suppliers, and marketing campaigns.

  ## New Tables

  ### 1. outlets
  - `id` (uuid, primary key)
  - `name` (text) - Outlet/branch name
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. ingredients
  - `id` (uuid, primary key)
  - `outlet_id` (uuid, foreign key to outlets)
  - `name` (text) - Ingredient name
  - `unit` (text) - Unit of measurement (gram, ml, etc)
  - `price` (numeric) - Current price per unit
  - `previous_price` (numeric, nullable) - Previous price for tracking changes
  - `stock_level` (numeric) - Current stock quantity
  - `reorder_point` (numeric) - Minimum stock before reorder
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. menu_items
  - `id` (uuid, primary key)
  - `name` (text) - Menu item name
  - `image_url` (text) - Product image URL
  - `selling_price` (numeric) - Selling price
  - `target_margin` (numeric) - Target profit margin percentage
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. recipes
  - `id` (uuid, primary key)
  - `menu_item_id` (uuid, foreign key to menu_items)
  - `ingredient_id` (uuid, foreign key to ingredients)
  - `quantity` (numeric) - Quantity of ingredient needed
  - `created_at` (timestamptz)

  ### 5. sales_history
  - `id` (uuid, primary key)
  - `outlet_id` (uuid, foreign key to outlets)
  - `menu_item_id` (uuid, foreign key to menu_items)
  - `date` (date) - Sale date
  - `quantity_sold` (integer) - Number of units sold
  - `total_revenue` (numeric) - Total revenue from this sale
  - `created_at` (timestamptz)

  ### 6. operational_costs
  - `id` (uuid, primary key)
  - `outlet_id` (uuid, foreign key to outlets)
  - `name` (text) - Cost name (rent, salary, etc)
  - `amount` (numeric) - Cost amount
  - `interval` (text) - 'daily' or 'monthly'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 7. waste_records
  - `id` (uuid, primary key)
  - `outlet_id` (uuid, foreign key to outlets)
  - `ingredient_id` (uuid, foreign key to ingredients)
  - `date` (date) - Waste date
  - `quantity` (numeric) - Quantity wasted
  - `reason` (text) - Reason for waste
  - `cost` (numeric) - Cost of waste
  - `created_at` (timestamptz)

  ### 8. suppliers
  - `id` (uuid, primary key)
  - `name` (text) - Supplier name
  - `contact_person` (text) - Contact person name
  - `phone` (text) - Phone number
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 9. supplier_prices
  - `id` (uuid, primary key)
  - `supplier_id` (uuid, foreign key to suppliers)
  - `ingredient_id` (uuid, foreign key to ingredients)
  - `price` (numeric) - Supplier's price for this ingredient
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 10. pending_orders
  - `id` (uuid, primary key)
  - `outlet_id` (uuid, foreign key to outlets)
  - `supplier_id` (uuid, foreign key to suppliers)
  - `po_number` (text) - Purchase order number
  - `order_date` (timestamptz) - Order date
  - `total_amount` (numeric) - Total order amount
  - `items` (jsonb) - Array of order items
  - `created_at` (timestamptz)

  ### 11. active_campaigns
  - `id` (uuid, primary key)
  - `campaign_name` (text) - Campaign name
  - `marketing_copy` (text) - Marketing message
  - `promo_mechanic` (text) - Promotion mechanism
  - `justification` (text) - Reason for campaign
  - `item1_name` (text) - First product in promotion
  - `item2_name` (text) - Second product in promotion
  - `start_date` (timestamptz) - Campaign start date
  - `created_at` (timestamptz)

  ### 12. users
  - `id` (uuid, primary key, references auth.users)
  - `name` (text) - User's full name
  - `role` (text) - User's role
  - `avatar_url` (text) - Avatar image URL
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security

  All tables have Row Level Security (RLS) enabled. Policies allow authenticated users to:
  - Read all data (for now, can be restricted later based on business rules)
  - Insert, update, and delete their own data
  - Full CRUD operations for development purposes

  ## Notes

  - All IDs use UUID for better security and scalability
  - Timestamps track creation and updates automatically
  - Foreign keys ensure data integrity
  - Indexes on foreign keys for better query performance
  - JSONB used for flexible order items storage
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create outlets table
CREATE TABLE IF NOT EXISTS outlets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  previous_price numeric,
  stock_level numeric NOT NULL DEFAULT 0,
  reorder_point numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create menu_items table
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  image_url text NOT NULL,
  selling_price numeric NOT NULL DEFAULT 0,
  target_margin numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create recipes table (junction table for menu items and ingredients)
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(menu_item_id, ingredient_id)
);

-- Create sales_history table
CREATE TABLE IF NOT EXISTS sales_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  date date NOT NULL,
  quantity_sold integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create operational_costs table
CREATE TABLE IF NOT EXISTS operational_costs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  interval text NOT NULL CHECK (interval IN ('daily', 'monthly')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create waste_records table
CREATE TABLE IF NOT EXISTS waste_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  date date NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  reason text NOT NULL,
  cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  contact_person text NOT NULL,
  phone text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create supplier_prices table
CREATE TABLE IF NOT EXISTS supplier_prices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(supplier_id, ingredient_id)
);

-- Create pending_orders table
CREATE TABLE IF NOT EXISTS pending_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  po_number text NOT NULL UNIQUE,
  order_date timestamptz NOT NULL DEFAULT now(),
  total_amount numeric NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create active_campaigns table
CREATE TABLE IF NOT EXISTS active_campaigns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_name text NOT NULL,
  marketing_copy text NOT NULL,
  promo_mechanic text NOT NULL,
  justification text NOT NULL,
  item1_name text NOT NULL,
  item2_name text NOT NULL,
  start_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ingredients_outlet_id ON ingredients(outlet_id);
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item_id ON recipes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipes_ingredient_id ON recipes(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_outlet_id ON sales_history(outlet_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_menu_item_id ON sales_history(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_sales_history_date ON sales_history(date);
CREATE INDEX IF NOT EXISTS idx_operational_costs_outlet_id ON operational_costs(outlet_id);
CREATE INDEX IF NOT EXISTS idx_waste_records_outlet_id ON waste_records(outlet_id);
CREATE INDEX IF NOT EXISTS idx_waste_records_ingredient_id ON waste_records(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_waste_records_date ON waste_records(date);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_supplier_id ON supplier_prices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_prices_ingredient_id ON supplier_prices(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_outlet_id ON pending_orders(outlet_id);
CREATE INDEX IF NOT EXISTS idx_pending_orders_supplier_id ON pending_orders(supplier_id);

-- Enable Row Level Security on all tables
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for outlets
CREATE POLICY "Users can view all outlets"
  ON outlets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert outlets"
  ON outlets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update outlets"
  ON outlets FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete outlets"
  ON outlets FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for ingredients
CREATE POLICY "Users can view all ingredients"
  ON ingredients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert ingredients"
  ON ingredients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update ingredients"
  ON ingredients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete ingredients"
  ON ingredients FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for menu_items
CREATE POLICY "Users can view all menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert menu items"
  ON menu_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update menu items"
  ON menu_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete menu items"
  ON menu_items FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for recipes
CREATE POLICY "Users can view all recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update recipes"
  ON recipes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete recipes"
  ON recipes FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for sales_history
CREATE POLICY "Users can view all sales history"
  ON sales_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert sales history"
  ON sales_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update sales history"
  ON sales_history FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete sales history"
  ON sales_history FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for operational_costs
CREATE POLICY "Users can view all operational costs"
  ON operational_costs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert operational costs"
  ON operational_costs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update operational costs"
  ON operational_costs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete operational costs"
  ON operational_costs FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for waste_records
CREATE POLICY "Users can view all waste records"
  ON waste_records FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert waste records"
  ON waste_records FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update waste records"
  ON waste_records FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete waste records"
  ON waste_records FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for suppliers
CREATE POLICY "Users can view all suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert suppliers"
  ON suppliers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update suppliers"
  ON suppliers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete suppliers"
  ON suppliers FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for supplier_prices
CREATE POLICY "Users can view all supplier prices"
  ON supplier_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert supplier prices"
  ON supplier_prices FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update supplier prices"
  ON supplier_prices FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete supplier prices"
  ON supplier_prices FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for pending_orders
CREATE POLICY "Users can view all pending orders"
  ON pending_orders FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert pending orders"
  ON pending_orders FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update pending orders"
  ON pending_orders FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete pending orders"
  ON pending_orders FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for active_campaigns
CREATE POLICY "Users can view all campaigns"
  ON active_campaigns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert campaigns"
  ON active_campaigns FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update campaigns"
  ON active_campaigns FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete campaigns"
  ON active_campaigns FOR DELETE
  TO authenticated
  USING (true);

-- RLS Policies for users
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own data"
  ON users FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_outlets_updated_at BEFORE UPDATE ON outlets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operational_costs_updated_at BEFORE UPDATE ON operational_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_prices_updated_at BEFORE UPDATE ON supplier_prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
