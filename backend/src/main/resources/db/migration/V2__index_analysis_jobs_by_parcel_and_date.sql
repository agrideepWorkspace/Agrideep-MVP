CREATE INDEX IF NOT EXISTS idx_analysis_jobs_parcel_created_at
	ON analysis_jobs (parcel_id, created_at DESC);
