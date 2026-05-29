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
	specialization TEXT NOT NULL CHECK (specialization IN ('cardiology', 'dermatology', 'pediatrics', 'neurology', 'orthopedics', 'psychiatry', 'general medicine', 'ophthalmology', 'dentistry', 'gynecology')),
	license_number TEXT NOT NULL UNIQUE,
	bio TEXT,
	years_exp INT,
	consultation_fee NUMERIC,
	rating FLOAT,
	rating_count INT NOT NULL DEFAULT 0
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
	rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
	rated_at TIMESTAMPTZ,
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

-- One-off doctor unavailability blocks (date/time specific)
CREATE TABLE IF NOT EXISTS doctor_schedule_blocks (
	id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
	doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	starts_at TIMESTAMPTZ NOT NULL,
	ends_at TIMESTAMPTZ NOT NULL,
	reason TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CHECK (ends_at > starts_at)
);

-- Appointment metadata for cleaner workflows
ALTER TABLE appointments
	ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 30,
	ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
	ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
	ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
	ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE doctor_profiles
	ADD COLUMN IF NOT EXISTS rating FLOAT,
	ADD COLUMN IF NOT EXISTS rating_count INT NOT NULL DEFAULT 0;

ALTER TABLE appointments
	ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
	ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_status_time
	ON appointments (doctor_id, status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_status_time
	ON appointments (patient_id, status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_doctor_schedule_blocks_doctor_time
	ON doctor_schedule_blocks (doctor_id, starts_at, ends_at);