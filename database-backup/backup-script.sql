-- Smart Genie Database Backup Script
-- Created: 2025-01-19
-- This script will be used to backup all tables

-- Backup dishinfo table
COPY (SELECT * FROM dishinfo ORDER BY id) TO STDOUT WITH CSV HEADER;

-- Backup health_profiles table  
COPY (SELECT * FROM health_profiles ORDER BY id) TO STDOUT WITH CSV HEADER;

-- Backup meal_logs table
COPY (SELECT * FROM meal_logs ORDER BY created_at) TO STDOUT WITH CSV HEADER;

-- Backup feedback_submissions table
COPY (SELECT * FROM feedback_submissions ORDER BY id) TO STDOUT WITH CSV HEADER;

-- Backup user_roles table
COPY (SELECT * FROM user_roles) TO STDOUT WITH CSV HEADER;

