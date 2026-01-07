-- Update RPD reset function to use Dong Duong timezone (GMT+7)
-- Reset at midnight (0h) ICT instead of every 86400 seconds

CREATE OR REPLACE FUNCTION reset_rpd_counters()
RETURNS TRIGGER AS $$
DECLARE
  current_date_ict DATE;
  last_reset_date_ict DATE;
BEGIN
  -- Get current date in ICT timezone (GMT+7)
  current_date_ict := (NOW() AT TIME ZONE 'Asia/Bangkok')::DATE;
  
  -- Get last reset date in ICT timezone
  last_reset_date_ict := (NEW.last_reset_day AT TIME ZONE 'Asia/Bangkok')::DATE;
  
  -- Reset if we're on a different day
  IF current_date_ict > last_reset_date_ict THEN
    NEW.requests_per_day := 0;
    NEW.last_reset_day := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

SELECT 'RPD reset function updated to use ICT timezone (GMT+7)' as status;
