CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    

CREATE TABLE IF NOT EXISTS users (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	email TEXT UNIQUE NOT NULL,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL CHECK (role IN ('patient', 'doctor')),
	name TEXT NOT NULL,
	phone TEXT,
	avatar_url TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_profiles (
	user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	date_of_birth DATE,
	weight_kg NUMERIC,
	height_cm NUMERIC,
	medical_history TEXT
);

CREATE TABLE IF NOT EXISTS doctor_profiles (
	user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	specialization TEXT NOT NULL,
	license_number TEXT NOT NULL UNIQUE,
	bio TEXT,
	years_exp INT,
	consultation_fee NUMERIC
);

CREATE TABLE IF NOT EXISTS doctor_schedules (
	doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
	start_time TIME NOT NULL,
	end_time TIME NOT NULL,
	is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
	PRIMARY KEY (doctor_id, day_of_week, start_time),
	CHECK (end_time > start_time)
);

CREATE TABLE IF NOT EXISTS appointments (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	scheduled_at TIMESTAMPTZ NOT NULL,
	status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
	video_room_url TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultation_notes (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
	doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	subjective TEXT,
	diagnosis TEXT,
	prescription TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	type TEXT NOT NULL,
	message TEXT NOT NULL,
	is_read BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
