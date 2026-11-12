-- Runs at every startup, before Hibernate creates or updates the tables.
CREATE EXTENSION IF NOT EXISTS postgis;

-- Before PostGIS, parcels.geometry held the boundary as GeoJSON text. Convert those parcels in place
-- and measure them on the WGS 84 ellipsoid like new parcels.
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM information_schema.columns
			WHERE table_schema = current_schema() AND table_name = 'parcels'
				AND column_name = 'geometry' AND data_type = 'character varying') THEN
		ALTER TABLE parcels ALTER COLUMN geometry TYPE geometry(Polygon, 4326)
				USING ST_Force2D(ST_GeomFromGeoJSON(geometry));
		UPDATE parcels SET area_m2 = ST_Area(geometry::geography), perimeter_m = ST_Perimeter(geometry::geography);
	END IF;
END $$;
