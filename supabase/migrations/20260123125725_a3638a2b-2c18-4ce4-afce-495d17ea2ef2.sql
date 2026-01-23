-- Step 1: Add 'insider' to admin_level enum
ALTER TYPE admin_level ADD VALUE IF NOT EXISTS 'insider';