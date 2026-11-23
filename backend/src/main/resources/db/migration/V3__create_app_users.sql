CREATE TABLE app_users (
	id varchar(255) PRIMARY KEY,
	email varchar(320),
	display_name varchar(255),
	created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
