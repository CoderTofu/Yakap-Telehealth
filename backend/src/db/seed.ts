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

// Generate a richer set of appointments across the past year -> next week
const APPOINTMENT_COUNT = 32;
const now = Date.now();
const oneYearAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);
const nextWeek = new Date(now + 7 * 24 * 60 * 60 * 1000);

function randomBetween(a: number, b: number) {
  return Math.floor(a + Math.random() * (b - a + 1));
}

function randomDateBetween(start: Date, end: Date) {
  const t = randomBetween(start.getTime(), end.getTime());
  return new Date(t);
}

function formatNotificationSchedule(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "an unknown time";
  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  })
    .format(date)
    .replace(/\s/g, "")
    .toLowerCase();
  const calendarDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
  return `${time} ${calendarDate}`;
}

type RichAppointment = {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  duration: number;
  createdAt: string;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  completedAt?: string | null;
  videoRoomUrl?: string | null;
};

const appointments: RichAppointment[] = [];
for (let i = 0; i < APPOINTMENT_COUNT; i++) {
  const patient = patientUsers[Math.floor(Math.random() * patientUsers.length)];
  const doctor = doctorUsers[Math.floor(Math.random() * doctorUsers.length)];
  const scheduled = randomDateBetween(oneYearAgo, nextWeek);
  const duration = [30, 30, 45, 60][Math.floor(Math.random() * 4)];
  // createdAt should be before scheduled, but not earlier than oneYearAgo
  const createdAt = randomDateBetween(oneYearAgo, new Date(scheduled.getTime() - 1 * 60 * 60 * 1000));

  // Decide status based on scheduled time
  let status: RichAppointment["status"];
  const nowDate = new Date();
  if (scheduled.getTime() > nowDate.getTime()) {
    // future: pending or confirmed
    status = Math.random() < 0.55 ? "pending" : "confirmed";
  } else {
    // past: mostly completed, some cancelled, few confirmed/pending
    const r = Math.random();
    if (r < 0.65) status = "completed";
    else if (r < 0.85) status = "cancelled";
    else if (r < 0.93) status = "confirmed";
    else status = "pending";
  }

  const apptId = randomUUID();

  const appt: RichAppointment = {
    id: apptId,
    patientId: patient.id,
    doctorId: doctor.id,
    scheduledAt: scheduled.toISOString(),
    status,
    duration,
    createdAt: createdAt.toISOString(),
    approvedAt: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledBy: null,
    cancelledAt: null,
    completedAt: null,
    videoRoomUrl: null,
  };

  if (status === "confirmed") {
    // approved sometime between createdAt and scheduled
    const approved = randomDateBetween(new Date(createdAt.getTime()), scheduled);
    appt.approvedAt = approved.toISOString();
    appt.videoRoomUrl = buildFallbackMeetingUrl(apptId);
  }

  if (status === "cancelled") {
    // cancelled maybe before scheduled or shortly after
    const cancelled = randomDateBetween(new Date(createdAt.getTime()), new Date(scheduled.getTime() + 3 * 24 * 60 * 60 * 1000));
    // cancelledBy random patient or doctor
    appt.cancelledAt = cancelled.toISOString();
    appt.cancelledBy = Math.random() < 0.5 ? patient.id : doctor.id;
    appt.rejectionReason = "Client requested cancellation";
  }

  if (status === "completed") {
    // completed after scheduled by duration + small offset
    const end = new Date(scheduled.getTime() + duration * 60 * 1000 + randomBetween(5, 120) * 60 * 1000);
    appt.completedAt = end.toISOString();
    appt.videoRoomUrl = buildFallbackMeetingUrl(apptId);
  }

  appointments.push(appt);
}

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
    consultation_fee NUMERIC,
    rating FLOAT,
    rating_count INT NOT NULL DEFAULT 0
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
    rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    rated_at TIMESTAMPTZ,
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
  `ALTER TABLE doctor_profiles
    ADD COLUMN IF NOT EXISTS rating FLOAT,
    ADD COLUMN IF NOT EXISTS rating_count INT NOT NULL DEFAULT 0;`,
  `ALTER TABLE appointments
    ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;`,
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
      consultation_fee,
      rating,
      rating_count
    )
    VALUES
      (
        ${sqlLiteral(doctorUsers[0].id)},
        ${sqlLiteral("cardiology")},
        ${sqlLiteral("PH-CRD-10293")},
        ${sqlLiteral("Focuses on preventive heart care and chronic disease management.")},
        ${sqlLiteral(12)},
        ${sqlLiteral(900)},
        ${sqlLiteral(4.8)},
        ${sqlLiteral(18)}
      ),
      (
        ${sqlLiteral(doctorUsers[1].id)},
        ${sqlLiteral("dermatology")},
        ${sqlLiteral("PH-DERM-88921")},
        ${sqlLiteral("Treats acne, dermatitis, and long-term skin conditions.")},
        ${sqlLiteral(8)},
        ${sqlLiteral(750)},
        ${sqlLiteral(4.6)},
        ${sqlLiteral(12)}
      ),
      (
        ${sqlLiteral(doctorUsers[2].id)},
        ${sqlLiteral("pediatrics")},
        ${sqlLiteral("PH-PED-55120")},
        ${sqlLiteral("Provides routine and preventive care for children and teens.")},
        ${sqlLiteral(11)},
        ${sqlLiteral(850)},
        ${sqlLiteral(4.9)},
        ${sqlLiteral(20)}
      ),
      (
        ${sqlLiteral(doctorUsers[3].id)},
        ${sqlLiteral("neurology")},
        ${sqlLiteral("PH-NEU-77440")},
        ${sqlLiteral("Evaluates headaches, neuropathy, and other neurological concerns.")},
        ${sqlLiteral(14)},
        ${sqlLiteral(1400)},
        ${sqlLiteral(4.7)},
        ${sqlLiteral(15)}
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

  // Build consultation notes for a subset of completed appointments
  const completedAppointments = appointments.filter((a) => a.status === "completed");

  const consultationNotes = completedAppointments.slice(0, Math.min(6, completedAppointments.length)).map((appt, idx) => {
    const subj = [
      "Patient reports recurring skin irritation and itching.",
      "Reports frequent migraines and neck tension.",
      "Follow-up after blood pressure monitoring.",
      "Routine pediatric check-up: growth is on track.",
      "Post-op check: incision healing well.",
      "Review of chronic back pain and exercise plan.",
    ][idx % 6];

    const diag = [
      "Likely contact dermatitis.",
      "Migraine without aura.",
      "Hypertension, stable.",
      "Healthy development.",
      "Normal post-op recovery.",
      "Chronic mechanical back pain.",
    ][idx % 6];

    const rx = [
      "Apply topical corticosteroid twice daily for 7 days.",
      "Take prescribed pain relief at onset and keep a headache diary.",
      "Continue maintenance medication and low-sodium diet.",
      "No meds; continue routine care.",
      "Keep wound clean and follow dressings instructions.",
      "Start low-impact physiotherapy and NSAIDs PRN.",
    ][idx % 6];

    // created_at shortly after completedAt if available, otherwise now
    const createdAt = appt.completedAt ? new Date(new Date(appt.completedAt).getTime() + 30 * 60 * 1000).toISOString() : new Date().toISOString();

    return {
      appointmentId: appt.id,
      doctorId: appt.doctorId,
      patientId: appt.patientId,
      subjective: subj,
      diagnosis: diag,
      prescription: rx,
      createdAt,
    };
  });

  // Build notifications derived from appointment lifecycle events
  const notifications: Array<{ userId: string; type: string; message: string; isRead: boolean; createdAt: string }> = [];

  for (const appt of appointments) {
    const patient = users.find((u) => u.id === appt.patientId)!;
    const doctor = users.find((u) => u.id === appt.doctorId)!;
    const scheduledLabel = formatNotificationSchedule(appt.scheduledAt);

    // Appointment request created notifications (pending)
    const createdAt = appt.createdAt;
    if (appt.status === "pending") {
      notifications.push({
        userId: doctor.id,
        type: "appointment_pending",
        message: `New appointment request from ${patient.name} scheduled for ${scheduledLabel}.`,
        isRead: false,
        createdAt,
      });

      notifications.push({
        userId: patient.id,
        type: "appointment_pending",
        message: `Appointment request sent to Dr. ${doctor.name} for ${scheduledLabel}.`,
        isRead: false,
        createdAt,
      });
    }

    if (appt.status === "confirmed") {
      const approvedAt = appt.approvedAt ?? appt.createdAt;
      notifications.push({
        userId: appt.patientId,
        type: "appointment_confirmed",
        message: `Dr. ${doctor.name} approved your appointment scheduled for ${scheduledLabel}.`,
        isRead: false,
        createdAt: approvedAt,
      });

      notifications.push({
        userId: appt.doctorId,
        type: "appointment_confirmed",
        message: `You approved an appointment from ${patient.name} scheduled for ${scheduledLabel}.`,
        isRead: false,
        createdAt: approvedAt,
      });
    }

    if (appt.status === "cancelled") {
      const cancelledAt = appt.cancelledAt ?? appt.createdAt;
      const actorIsDoctor = appt.cancelledBy === appt.doctorId;
      const counterpartId = actorIsDoctor ? appt.patientId : appt.doctorId;

      const counterpartMessage = actorIsDoctor
        ? `Dr. ${users.find((u) => u.id === appt.cancelledBy)!.name} cancelled your appointment scheduled for ${scheduledLabel}.`
        : `${users.find((u) => u.id === appt.cancelledBy)!.name} cancelled your appointment scheduled for ${scheduledLabel}.`;

      const actorMessage = actorIsDoctor
        ? `You cancelled an appointment from ${patient.name} scheduled for ${scheduledLabel}.`
        : `You cancelled your appointment with Dr. ${doctor.name} scheduled for ${scheduledLabel}.`;

      notifications.push({ userId: counterpartId, type: "appointment_cancelled", message: counterpartMessage, isRead: false, createdAt: cancelledAt });
      notifications.push({ userId: appt.cancelledBy ?? appt.patientId, type: "appointment_cancelled", message: actorMessage, isRead: false, createdAt: cancelledAt });
    }

    if (appt.status === "completed") {
      const completedAt = appt.completedAt ?? new Date().toISOString();
      notifications.push({
        userId: appt.patientId,
        type: "appointment_completed",
        message: `Dr. ${doctor.name} marked your appointment scheduled for ${scheduledLabel} as completed.`,
        isRead: false,
        createdAt: completedAt,
      });

      notifications.push({
        userId: appt.doctorId,
        type: "appointment_completed",
        message: `You completed an appointment with ${patient.name} scheduled for ${scheduledLabel}.`,
        isRead: false,
        createdAt: completedAt,
      });

      // Add consultation note creation notification for the patient (if we generated a note)
      const note = consultationNotes.find((n) => n.appointmentId === appt.id);
      if (note) {
        notifications.push({
          userId: appt.patientId,
          type: "consultation_note_created",
          message: `A consultation note has been added for your appointment scheduled for ${scheduledLabel}.`,
          isRead: false,
          createdAt: note.createdAt,
        });
      }
    }
  }

  // Insert appointments with full lifecycle columns
  const appointmentRows = appointments
    .map((a) => `(
        ${sqlLiteral(a.id)},
        ${sqlLiteral(a.patientId)},
        ${sqlLiteral(a.doctorId)},
        ${sqlLiteral(a.scheduledAt)},
        ${sqlLiteral(a.status)},
        ${sqlLiteral(a.videoRoomUrl)},
        ${sqlLiteral(a.duration)},
        ${sqlLiteral(a.approvedAt)},
        ${sqlLiteral(a.rejectedAt)},
        ${sqlLiteral(a.rejectionReason)},
        ${sqlLiteral(a.cancelledBy)},
        ${sqlLiteral(a.cancelledAt)},
        ${sqlLiteral(a.completedAt)},
        ${sqlLiteral(a.createdAt)}
      )`)
    .join(",\n");

  statements.push(`
    INSERT INTO appointments (
      id,
      patient_id,
      doctor_id,
      scheduled_at,
      status,
      video_room_url,
      duration_minutes,
      approved_at,
      rejected_at,
      rejection_reason,
      cancelled_by,
      cancelled_at,
      completed_at,
      created_at
    )
    VALUES
      ${appointmentRows};
  `);

  if (consultationNotes.length > 0) {
    const noteRows = consultationNotes
      .map((n) => `(
        ${sqlLiteral(n.appointmentId)},
        ${sqlLiteral(n.doctorId)},
        ${sqlLiteral(n.patientId)},
        ${sqlLiteral(n.subjective)},
        ${sqlLiteral(n.diagnosis)},
        ${sqlLiteral(n.prescription)},
        ${sqlLiteral(n.createdAt)}
      )`)
      .join(",\n");

    statements.push(`
      INSERT INTO consultation_notes (
        appointment_id,
        doctor_id,
        patient_id,
        subjective,
        diagnosis,
        prescription,
        created_at
      )
      VALUES
        ${noteRows};
    `);
  }

  if (notifications.length > 0) {
    const notifRows = notifications
      .map((n) => `(
        ${sqlLiteral(n.userId)},
        ${sqlLiteral(n.type)},
        ${sqlLiteral(n.message)},
        ${sqlLiteral(n.isRead)},
        ${sqlLiteral(n.createdAt)}
      )`)
      .join(",\n");

    statements.push(`
      INSERT INTO notifications (user_id, type, message, is_read, created_at)
      VALUES
        ${notifRows};
    `);
  }

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
    `Inserted ${appointments.length} appointments and generated consultation notes and notifications.`,
  );
}

seed();
