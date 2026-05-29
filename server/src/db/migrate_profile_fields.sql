-- Migration: add profile fields to users table.
-- Safe to run multiple times (IF NOT EXISTS / IF EXISTS guards).
-- Run with: mysql -u<user> -p <db> < migrate_profile_fields.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name VARCHAR(100) NULL AFTER locked_until,
  ADD COLUMN IF NOT EXISTS bio          TEXT         NULL AFTER display_name,
  ADD COLUMN IF NOT EXISTS website      VARCHAR(255) NULL AFTER bio,
  ADD COLUMN IF NOT EXISTS location     VARCHAR(100) NULL AFTER website;
