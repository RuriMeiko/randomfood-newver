-- Add location columns to tg_users table
ALTER TABLE tg_users 
ADD COLUMN latitude NUMERIC(10, 8),
ADD COLUMN longitude NUMERIC(11, 8),
ADD COLUMN location_name TEXT,
ADD COLUMN location_updated_at TIMESTAMP;

-- Add index for location queries
CREATE INDEX idx_tg_users_location ON tg_users(latitude, longitude) WHERE latitude IS NOT NULL;
