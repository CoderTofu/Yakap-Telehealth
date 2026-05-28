import { randomUUID } from "crypto";
import { spawnSync } from "child_process";
import path from "path";

import { SPECIALTY_VALUES } from "../constants";

type UserSeed = {
  id: string;
  email: string;
  password: string;
  role: "patient" | "doctor";
  name: string;
  phone?: string;
  avatarUrl?: string;
};

type AppointmentSeed = {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  videoRoomUrl?: string;
};

const rootDirectory = path.resolve(__dirname, "../../../../");
const composeFile = path.resolve(rootDirectory, "docker-compose.yml");
const yakapDatabaseName = "yakap_db";
const yakapDatabaseUser = "yakap";

const plainTextPassword = "password123";

function buildFallbackMeetingUrl(appointmentId: string) {
  return `https://meet.jit.si/yakap-${appointmentId}`;
}

const users: UserSeed[] = [
  {
    id: randomUUID(),
    email: "patient@gmail.com",
    password: plainTextPassword,
    role: "patient",
    name: "Maya Santos",
    phone: "+63 917 555 0101",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
  },
  {
    id: randomUUID(),
    email: "noah.reyes@example.com",
    password: plainTextPassword,
    role: "patient",
    name: "Noah Reyes",
    phone: "+63 917 555 0102",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
  },
  {
    id: randomUUID(),
    email: "liza.mercado@example.com",
    password: plainTextPassword,
    role: "patient",
    name: "Liza Mercado",
    phone: "+63 917 555 0103",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80",
  },
  {
    id: randomUUID(),
    email: "carlos.mendoza@example.com",
    password: plainTextPassword,
    role: "patient",
    name: "Carlos Mendoza",
    phone: "+63 917 555 0104",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
  },
  {
    id: randomUUID(),
    email: "doctor@gmail.com",
    password: plainTextPassword,
    role: "doctor",
    name: "Dr. Lara Cruz",
    phone: "+63 917 555 0201",
    avatarUrl: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0",
  },
  {
    id: randomUUID(),
    email: "dr.ethan.reyes@example.com",
    password: plainTextPassword,
    role: "doctor",
    name: "Dr. Ethan Reyes",
    phone: "+63 917 555 0202",
    avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d",
  },
  {
    id: randomUUID(),
    email: "dr.patricia.lim@example.com",
    password: plainTextPassword,
    role: "doctor",
    name: "Dr. Patricia Lim",
    phone: "+63 917 555 0203",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
  },
  {
    id: randomUUID(),
    email: "dr.ramon.garcia@example.com",
    password: plainTextPassword,
    role: "doctor",
    name: "Dr. Ramon Garcia",
    phone: "+63 917 555 0204",
    avatarUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7",
  },
];

const patientUsers = users.filter((user) => user.role === "patient");
const doctorUsers = users.filter((user) => user.role === "doctor");

const appointments: AppointmentSeed[] = [
  {
    id: randomUUID(),
    patientId: patientUsers[0].id,
    doctorId: doctorUsers[0].id,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "confirmed",
    videoRoomUrl: buildFallbackMeetingUrl("maya-lara"),
  },
  {
    id: randomUUID(),
    patientId: patientUsers[1].id,
    doctorId: doctorUsers[1].id,
    scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: "completed",
    videoRoomUrl: buildFallbackMeetingUrl("noah-ethan"),
  },
  {
    id: randomUUID(),
    patientId: patientUsers[0].id,
    doctorId: doctorUsers[1].id,
    scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
  },
  {
    id: randomUUID(),
    patientId: patientUsers[2].id,
    doctorId: doctorUsers[2].id,
    scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "completed",
    videoRoomUrl: buildFallbackMeetingUrl("liza-patricia"),
  },
  {
    id: randomUUID(),
    patientId: patientUsers[3].id,
    doctorId: doctorUsers[3].id,
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "confirmed",
    videoRoomUrl: buildFallbackMeetingUrl("carlos-ramon"),
  },
  {
    id: randomUUID(),
    patientId: patientUsers[1].id,
    doctorId: doctorUsers[2].id,
    scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: "pending",
  },
  {
    id: randomUUID(),
    patientId: patientUsers[0].id,
    doctorId: doctorUsers[3].id,
    scheduledAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    status: "completed",
    videoRoomUrl: buildFallbackMeetingUrl("maya-ramon"),
  },
];

const schemaStatements = [
  'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
  'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
  `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('patient', 'doctor')),
    name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS patient_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    date_of_birth DATE,
    weight_kg NUMERIC,
    height_cm NUMERIC,
    medical_history TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS doctor_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    specialization TEXT NOT NULL CHECK (specialization IN (${SPECIALTY_VALUES.map((value) => `'${value}'`).join(", ")})),
    license_number TEXT NOT NULL UNIQUE,
    bio TEXT,
    years_exp INT,
    consultation_fee NUMERIC
  );`,
  `CREATE TABLE IF NOT EXISTS doctor_schedules (
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (doctor_id, day_of_week, start_time),
    CHECK (end_time > start_time)
  );`,
  `CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    video_room_url TEXT,
    duration_minutes INT NOT NULL DEFAULT 30,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS doctor_schedule_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_at > starts_at)
  );`,
  `CREATE TABLE IF NOT EXISTS consultation_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subjective TEXT,
    diagnosis TEXT,
    prescription TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
];

function sqlLiteral(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  return `'${value.replace(/'/g, "''")}'`;
}

function buildSeedSql() {
  const statements: string[] = [...schemaStatements];

  statements.push(`
    TRUNCATE
      consultation_notes,
      notifications,
      appointments,
      doctor_schedule_blocks,
      doctor_schedules,
      patient_profiles,
      doctor_profiles,
      users
    RESTART IDENTITY CASCADE;
  `);

  const userRows = users
    .map(
      (user) => `(
        ${sqlLiteral(user.id)},
        ${sqlLiteral(user.email)},
        crypt(${sqlLiteral(user.password)}, gen_salt('bf')),
        ${sqlLiteral(user.role)},
        ${sqlLiteral(user.name)},
        ${sqlLiteral(user.phone)},
        ${sqlLiteral(user.avatarUrl)}
      )`,
    )
    .join(",\n");

  statements.push(`
    INSERT INTO users (id, email, password_hash, role, name, phone, avatar_url)
    VALUES
      ${userRows};
  `);

  statements.push(`
    INSERT INTO patient_profiles (user_id, date_of_birth, weight_kg, height_cm, medical_history)
    VALUES
      (
        ${sqlLiteral(patientUsers[0].id)},
        ${sqlLiteral("1994-05-17")},
        ${sqlLiteral(58.4)},
        ${sqlLiteral(162)},
        ${sqlLiteral("Seasonal allergies and occasional migraine.")}
      ),
      (
        ${sqlLiteral(patientUsers[1].id)},
        ${sqlLiteral("1990-09-03")},
        ${sqlLiteral(72.1)},
        ${sqlLiteral(175)},
        ${sqlLiteral("Asthma, controlled with inhaler when needed.")}
      ),
      (
        ${sqlLiteral(patientUsers[2].id)},
        ${sqlLiteral("1998-02-11")},
        ${sqlLiteral(60.5)},
        ${sqlLiteral(164)},
        ${sqlLiteral("Penicillin allergy and seasonal sinusitis.")}
      ),
      (
        ${sqlLiteral(patientUsers[3].id)},
        ${sqlLiteral("1979-12-25")},
        ${sqlLiteral(83.2)},
        ${sqlLiteral(180)},
        ${sqlLiteral("Type II diabetes, monitored quarterly.")}
      );
  `);

  statements.push(`
    INSERT INTO doctor_profiles (
      user_id,
      specialization,
      license_number,
      bio,
      years_exp,
      consultation_fee
    )
    VALUES
      (
        ${sqlLiteral(doctorUsers[0].id)},
        ${sqlLiteral("cardiology")},
        ${sqlLiteral("PH-CRD-10293")},
        ${sqlLiteral("Focuses on preventive heart care and chronic disease management.")},
        ${sqlLiteral(12)},
        ${sqlLiteral(900)}
      ),
      (
        ${sqlLiteral(doctorUsers[1].id)},
        ${sqlLiteral("dermatology")},
        ${sqlLiteral("PH-DERM-88921")},
        ${sqlLiteral("Treats acne, dermatitis, and long-term skin conditions.")},
        ${sqlLiteral(8)},
        ${sqlLiteral(750)}
      ),
      (
        ${sqlLiteral(doctorUsers[2].id)},
        ${sqlLiteral("pediatrics")},
        ${sqlLiteral("PH-PED-55120")},
        ${sqlLiteral("Provides routine and preventive care for children and teens.")},
        ${sqlLiteral(11)},
        ${sqlLiteral(850)}
      ),
      (
        ${sqlLiteral(doctorUsers[3].id)},
        ${sqlLiteral("neurology")},
        ${sqlLiteral("PH-NEU-77440")},
        ${sqlLiteral("Evaluates headaches, neuropathy, and other neurological concerns.")},
        ${sqlLiteral(14)},
        ${sqlLiteral(1400)}
      );
  `);

  statements.push(`
    INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_blocked)
    VALUES
      (${sqlLiteral(doctorUsers[0].id)}, 1, '09:00', '12:00', FALSE),
      (${sqlLiteral(doctorUsers[0].id)}, 3, '13:00', '17:00', FALSE),
      (${sqlLiteral(doctorUsers[1].id)}, 2, '10:00', '15:00', FALSE),
      (${sqlLiteral(doctorUsers[1].id)}, 5, '09:00', '11:00', TRUE),
      (${sqlLiteral(doctorUsers[2].id)}, 1, '08:00', '12:00', FALSE),
      (${sqlLiteral(doctorUsers[2].id)}, 4, '13:00', '17:00', FALSE),
      (${sqlLiteral(doctorUsers[3].id)}, 0, '09:30', '13:30', FALSE),
      (${sqlLiteral(doctorUsers[3].id)}, 2, '14:00', '18:00', FALSE);
  `);

  statements.push(`
    INSERT INTO doctor_schedule_blocks (doctor_id, starts_at, ends_at, reason)
    VALUES (
      ${sqlLiteral(doctorUsers[1].id)},
      ${sqlLiteral(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString())},
      ${sqlLiteral(new Date(Date.now() + 6 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString())},
      ${sqlLiteral("Staff meeting")}
    );
  `);

  const appointmentRows = appointments
    .map(
      (appointment) => `(
        ${sqlLiteral(appointment.id)},
        ${sqlLiteral(appointment.patientId)},
        ${sqlLiteral(appointment.doctorId)},
        ${sqlLiteral(appointment.scheduledAt)},
        ${sqlLiteral(appointment.status)},
        ${sqlLiteral(appointment.videoRoomUrl)}
      )`,
    )
    .join(",\n");

  statements.push(`
    INSERT INTO appointments (
      id,
      patient_id,
      doctor_id,
      scheduled_at,
      status,
      video_room_url
    )
    VALUES
      ${appointmentRows};
  `);

  statements.push(`
    INSERT INTO consultation_notes (
      appointment_id,
      doctor_id,
      patient_id,
      subjective,
      diagnosis,
      prescription
    )
    VALUES
      (
        ${sqlLiteral(appointments[1].id)},
        ${sqlLiteral(appointments[1].doctorId)},
        ${sqlLiteral(appointments[1].patientId)},
        ${sqlLiteral("Patient reports recurring skin irritation and itching.")},
        ${sqlLiteral("Likely contact dermatitis.")},
        ${sqlLiteral("Apply topical corticosteroid twice daily for 7 days.")}
      ),
      (
        ${sqlLiteral(appointments[4].id)},
        ${sqlLiteral(appointments[4].doctorId)},
        ${sqlLiteral(appointments[4].patientId)},
        ${sqlLiteral("Reports frequent migraines and neck tension.")},
        ${sqlLiteral("Migraine without aura.")},
        ${sqlLiteral("Take prescribed pain relief at onset and keep a headache diary.")}
      ),
      (
        ${sqlLiteral(appointments[6].id)},
        ${sqlLiteral(appointments[6].doctorId)},
        ${sqlLiteral(appointments[6].patientId)},
        ${sqlLiteral("Follow-up after blood pressure monitoring.")},
        ${sqlLiteral("Hypertension, stable.")},
        ${sqlLiteral("Continue maintenance medication and low-sodium diet.")}
      );
  `);

  statements.push(`
    INSERT INTO notifications (user_id, type, message, is_read)
    VALUES
      (
        ${sqlLiteral(patientUsers[0].id)},
        ${sqlLiteral("appointment_reminder")},
        ${sqlLiteral("Your consultation with Dr. Lara Cruz is confirmed for tomorrow.")},
        FALSE
      ),
      (
        ${sqlLiteral(doctorUsers[0].id)},
        ${sqlLiteral("new_appointment")},
        ${sqlLiteral("You have a new confirmed consultation with Maya Santos.")},
        FALSE
      ),
      (
        ${sqlLiteral(patientUsers[1].id)},
        ${sqlLiteral("lab_result")},
        ${sqlLiteral("Your consultation notes are ready for review.")},
        TRUE
      ),
      (
        ${sqlLiteral(patientUsers[2].id)},
        ${sqlLiteral("appointment_reminder")},
        ${sqlLiteral("Your pediatric consultation with Dr. Patricia Lim is coming up soon.")},
        FALSE
      ),
      (
        ${sqlLiteral(doctorUsers[2].id)},
        ${sqlLiteral("new_appointment")},
        ${sqlLiteral("You have a new pending consultation with Noah Reyes.")},
        FALSE
      ),
      (
        ${sqlLiteral(patientUsers[3].id)},
        ${sqlLiteral("appointment_confirmed")},
        ${sqlLiteral("Your appointment with Dr. Ramon Garcia has been confirmed.")},
        FALSE
      ),
      (
        ${sqlLiteral(doctorUsers[3].id)},
        ${sqlLiteral("consultation_note_created")},
        ${sqlLiteral("A consultation note was created for Maya Santos.")},
        TRUE
      );
  `);

  return statements.join("\n\n");
}

function seed() {
  const result = spawnSync(
    "docker",
    [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "db",
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      yakapDatabaseUser,
      "-d",
      yakapDatabaseName,
    ],
    {
      cwd: rootDirectory,
      encoding: "utf8",
      input: buildSeedSql(),
    },
  );

  if (result.error) {
    console.error("Failed to launch docker compose exec.", result.error);
    process.exitCode = 1;
    return;
  }

  if (result.status !== 0) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }

    if (result.stderr) {
      process.stderr.write(result.stderr);
    }

    process.exitCode = result.status ?? 1;
    return;
  }

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  console.log("Seed complete.");
  console.log(
    `Inserted ${users.length} users, ${patientUsers.length} patient profiles, and ${doctorUsers.length} doctor profiles.`,
  );
  console.log(
    `Inserted ${appointments.length} appointments and 3 consultation notes.`,
  );
}

seed();
