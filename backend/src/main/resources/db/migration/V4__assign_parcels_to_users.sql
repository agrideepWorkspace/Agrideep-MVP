ALTER TABLE parcels
	ADD COLUMN owner_id varchar(255);

ALTER TABLE parcels
	ADD CONSTRAINT fk_parcels_owner
	FOREIGN KEY (owner_id) REFERENCES app_users(id) ON DELETE RESTRICT;

-- Existing parcels remain unowned and are hidden from user APIs until an admin assigns them.
-- This NOT VALID check still enforces ownership for every newly inserted or updated row.
ALTER TABLE parcels
	ADD CONSTRAINT chk_parcels_owner_id_required
	CHECK (owner_id IS NOT NULL) NOT VALID;

CREATE INDEX idx_parcels_owner_created_at
	ON parcels (owner_id, created_at DESC);
