import type { Status } from "@/lib/appConfig";

export type PatientSummary = {
  id: string;
  name: string;
  avatarColor: string;
};

export type DoctorSummary = {
  id: string;
  name: string;
  specialty: string;
  avatarColor: string;
};

export type AppointmentSummary = {
  id: string;
  patientId: string;
  doctorId: string;
  status: Status;
  date: string;
  time: string;
  meetUrl?: string;
  notes?: {
    diagnosis?: string;
  };
};

export const PATIENTS: PatientSummary[] = [
  { id: "p1", name: "Maya Santos", avatarColor: "#0B4F71" },
  { id: "p2", name: "Noah Reyes", avatarColor: "#1A7AAF" },
];

export const DOCTORS: DoctorSummary[] = [
  {
    id: "d1",
    name: "Dr. Lara Cruz",
    specialty: "Cardiology",
    avatarColor: "#0B4F71",
  },
  {
    id: "d2",
    name: "Dr. Ethan Reyes",
    specialty: "Dermatology",
    avatarColor: "#1A7AAF",
  },
  {
    id: "d3",
    name: "Dr. Sofia Lim",
    specialty: "Pediatrics",
    avatarColor: "#10B981",
  },
  {
    id: "d4",
    name: "Dr. Paolo Santos",
    specialty: "General Medicine",
    avatarColor: "#F59E0B",
  },
];

export const APPOINTMENTS: AppointmentSummary[] = [
  {
    id: "a1",
    patientId: "p1",
    doctorId: "d1",
    status: "confirmed",
    date: "2026-05-27",
    time: "9:00 AM",
    meetUrl: "https://meet.google.com/example-cardio-1",
  },
  {
    id: "a2",
    patientId: "p1",
    doctorId: "d2",
    status: "pending",
    date: "2026-05-30",
    time: "2:30 PM",
  },
  {
    id: "a3",
    patientId: "p1",
    doctorId: "d3",
    status: "completed",
    date: "2026-05-21",
    time: "11:15 AM",
    notes: { diagnosis: "Seasonal allergy flare-up" },
  },
  {
    id: "a4",
    patientId: "p2",
    doctorId: "d1",
    status: "confirmed",
    date: "2026-05-26",
    time: "10:45 AM",
    meetUrl: "https://meet.google.com/example-cardio-2",
  },
  {
    id: "a5",
    patientId: "p2",
    doctorId: "d4",
    status: "pending",
    date: "2026-05-29",
    time: "1:00 PM",
  },
  {
    id: "a6",
    patientId: "p2",
    doctorId: "d2",
    status: "completed",
    date: "2026-05-19",
    time: "4:00 PM",
    notes: { diagnosis: "Dermatitis under control" },
  },
];

export function getPatient(id: string) {
  return PATIENTS.find((patient) => patient.id === id);
}

export function getDoctor(id: string) {
  return DOCTORS.find((doctor) => doctor.id === id);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatLongDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}
