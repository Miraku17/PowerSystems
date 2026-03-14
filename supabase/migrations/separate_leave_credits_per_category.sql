-- Separate leave credits per category: 15 SL and 10 VL per user
-- Column leave_type already exists from a partial previous run.

-- 1. Set existing rows to 'VL' with 10 credits
UPDATE leave_credits SET leave_type = 'VL', total_credits = 10 WHERE leave_type IS NULL;

-- 2. Make leave_type NOT NULL (if not already)
ALTER TABLE leave_credits ALTER COLUMN leave_type SET NOT NULL;

-- 3. Drop old constraints if they exist, then add new ones
ALTER TABLE leave_credits DROP CONSTRAINT IF EXISTS leave_credits_leave_type_check;
ALTER TABLE leave_credits ADD CONSTRAINT leave_credits_leave_type_check
  CHECK (leave_type IN ('VL', 'SL'));

ALTER TABLE leave_credits DROP CONSTRAINT IF EXISTS leave_credits_user_id_key;

ALTER TABLE leave_credits DROP CONSTRAINT IF EXISTS leave_credits_user_id_leave_type_key;
ALTER TABLE leave_credits ADD CONSTRAINT leave_credits_user_id_leave_type_key
  UNIQUE (user_id, leave_type);

-- 4. Create SL rows with 15 credits for existing users
INSERT INTO leave_credits (user_id, leave_type, total_credits, used_credits)
SELECT user_id, 'SL', 15, 0
FROM leave_credits
WHERE leave_type = 'VL'
ON CONFLICT (user_id, leave_type) DO NOTHING;
