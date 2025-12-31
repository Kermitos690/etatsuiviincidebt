-- =========================================================
-- IDEMPOTENT THREAD ANALYSIS: Unique constraint + cleanup
-- =========================================================

-- Step 1: Delete duplicate thread_analyses, keeping the most recent one
DELETE FROM thread_analyses a
USING thread_analyses b
WHERE a.user_id = b.user_id
  AND a.thread_id = b.thread_id
  AND a.analyzed_at < b.analyzed_at;

-- Step 2: Add unique constraint on (user_id, thread_id)
ALTER TABLE thread_analyses
ADD CONSTRAINT thread_analyses_user_thread_unique 
UNIQUE (user_id, thread_id);