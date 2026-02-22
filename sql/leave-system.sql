-- Leave Filing System - Database Setup
-- Run this in Supabase SQL Editor

-- 1. Leave Credits Table
CREATE TABLE leave_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_credits NUMERIC(5,1) NOT NULL DEFAULT 0,
  used_credits NUMERIC(5,1) NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Leave Requests Table
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('VL', 'SL', 'EL')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(5,1) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Permissions
INSERT INTO permissions (module, action, description) VALUES
  ('leave', 'access', 'Access the leave filing page'),
  ('leave', 'write', 'File a new leave request'),
  ('leave_approval', 'access', 'Access leave approval page'),
  ('leave_approval', 'edit', 'Approve or reject leave requests'),
  ('leave_credits', 'access', 'Access leave credits management'),
  ('leave_credits', 'write', 'Add or modify user leave credits');
