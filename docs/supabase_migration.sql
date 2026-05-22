-- Migration to add watch_history and search_history columns to movora_users table
-- Run this in your Supabase SQL Editor

-- Add watch_history column (stores array of viewed items)
ALTER TABLE movora_users 
ADD COLUMN IF NOT EXISTS watch_history JSONB DEFAULT '[]'::jsonb;

-- Add search_history column (stores array of search terms)
ALTER TABLE movora_users 
ADD COLUMN IF NOT EXISTS search_history JSONB DEFAULT '[]'::jsonb;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_movora_users_watch_history ON movora_users USING GIN (watch_history);
CREATE INDEX IF NOT EXISTS idx_movora_users_search_history ON movora_users USING GIN (search_history);

-- Update existing users to have empty arrays if they have NULL values
UPDATE movora_users 
SET watch_history = '[]'::jsonb 
WHERE watch_history IS NULL;

UPDATE movora_users 
SET search_history = '[]'::jsonb 
WHERE search_history IS NULL;
