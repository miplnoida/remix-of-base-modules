
-- ============================================================
-- MIGRATION: Remove ALL Row Level Security from public schema
-- Purpose: Eliminate RLS-caused crashes; switch to role-based security
-- Scope: 225 tables, 472 policies
-- Backup: docs/rls-policies-backup.sql contains full restoration script
-- ============================================================

-- Use a DO block to dynamically drop ALL policies and disable RLS on ALL public tables
-- This is safer than hardcoding names in case any were added between query and execution

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Step 1: Drop ALL RLS policies on ALL public tables
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;

  -- Step 2: Disable RLS on ALL public tables that have it enabled
  FOR r IN (
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true
  ) LOOP
    EXECUTE format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY', r.schemaname, r.tablename);
  END LOOP;

  RAISE NOTICE 'RLS removal complete: all policies dropped, RLS disabled on all public tables.';
END $$;
