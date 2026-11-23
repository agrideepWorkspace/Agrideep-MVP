CREATE EXTENSION IF NOT EXISTS postgis;

-- Upgrade parcels created before geometry was stored as a PostGIS polygon.
DO $$
BEGIN
	IF EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = current_schema()
			AND table_name = 'parcels'
			AND column_name = 'geometry'
			AND data_type = 'character varying'
	) THEN
		ALTER TABLE parcels ALTER COLUMN geometry TYPE geometry(Polygon, 4326)
			USING ST_Force2D(ST_GeomFromGeoJSON(geometry));
		UPDATE parcels
		SET area_m2 = ST_Area(geometry::geography),
			perimeter_m = ST_Perimeter(geometry::geography);
	END IF;
END $$;

CREATE TABLE IF NOT EXISTS parcels (
	id uuid PRIMARY KEY,
	name varchar(120) NOT NULL,
	geometry geometry(Polygon, 4326) NOT NULL,
	area_m2 double precision NOT NULL,
	perimeter_m double precision NOT NULL,
	created_at timestamp with time zone NOT NULL
);

CREATE TABLE IF NOT EXISTS analysis_jobs (
	id uuid PRIMARY KEY,
	parcel_id uuid NOT NULL REFERENCES parcels(id),
	start_date date NOT NULL,
	end_date date NOT NULL,
	max_cloud_pct double precision,
	status varchar(20) NOT NULL,
	error_code varchar(80),
	error_message varchar(1000),
	result jsonb,
	created_at timestamp with time zone NOT NULL,
	updated_at timestamp with time zone NOT NULL
);
