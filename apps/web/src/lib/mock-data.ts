export type Role = "patient" | "doctor";

export type Status = "pending" | "confirmed" | "cancelled" | "completed";

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  experience: number;
  license: string;
  fee: number;
  availableDays: string[];
  avatarColor: string;
}

export interface Patient {
  id: string;
  name: string;
  dob: string;
  phone: string;
  weight?: number;
  height?: number;
  history?: string;
  avatarColor: string;
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  date: string; // ISO
  time: string;
  status: Status;
  notes?: {
    subjective: string;
    diagnosis: string;
    prescriptions: { name: string; dosage: string; frequency: string; duration: string }[];
    recommendations?: string;
    finalized: boolean;
  };
  meetUrl?: string;
}

export interface Notification {
  id: string;
  type: "booking" | "reminder" | "confirmed" | "cancelled";
  message: string;
  time: string;
  unread: boolean;
}

export const SPECIALTIES = [
  { name: "Cardiology", icon: "Heart" },
  { name: "Dermatology", icon: "Sun" },
  { name: "Pediatrics", icon: "Baby" },
  { name: "Neurology", icon: "Brain" },
  { name: "Orthopedics", icon: "Bone" },
  { name: "Psychiatry", icon: "Smile" },
  { name: "General Medicine", icon: "Stethoscope" },
  { name: "Ophthalmology", icon: "Eye" },
  { name: "Dentistry", icon: "Tooth" },
  { name: "Gynecology", icon: "Flower2" },
];

export const DOCTORS: Doctor[] = [
  {
    id: "d1",
    name: "Dr. Maria Santos",
    specialty: "Cardiology",
    bio: "Board-certified cardiologist with deep experience in preventive heart care and arrhythmia management.",
    experience: 12,
    license: "PRC-0123456",
    fee: 1500,
    availableDays: ["Mon", "Tue", "Wed", "Fri"],
    avatarColor: "#0B4F71",
  },
  {
    id: "d2",
    name: "Dr. James Cruz",
    specialty: "Dermatology",
    bio: "Specializes in adult and pediatric dermatology, with focus on chronic skin conditions.",
    experience: 8,
    license: "PRC-0234567",
    fee: 1200,
    availableDays: ["Mon", "Wed", "Thu"],
    avatarColor: "#1A7AAF",
  },
  {
    id: "d3",
    name: "Dr. Patricia Lim",
    specialty: "Pediatrics",
    bio: "Compassionate care for newborns, children, and adolescents.",
    experience: 15,
    license: "PRC-0345678",
    fee: 1000,
    availableDays: ["Tue", "Wed", "Thu", "Fri", "Sat"],
    avatarColor: "#10B981",
  },
  {
    id: "d4",
    name: "Dr. Ramon Garcia",
    specialty: "General Medicine",
    bio: "Family doctor focused on long-term wellness and chronic disease management.",
    experience: 20,
    license: "PRC-0456789",
    fee: 800,
    availableDays: ["Mon", "Tue", "Thu", "Fri"],
    avatarColor: "#F59E0B",
  },
  {
    id: "d5",
    name: "Dr. Anna Reyes",
    specialty: "Psychiatry",
    bio: "Mental health support across anxiety, depression, and life transitions.",
    experience: 10,
    license: "PRC-0567890",
    fee: 1800,
    availableDays: ["Wed", "Thu", "Fri"],
    avatarColor: "#1A7AAF",
  },
  {
    id: "d6",
    name: "Dr. Mark Tanaka",
    specialty: "Neurology",
    bio: "Diagnoses and treats disorders of the brain, spine, and nervous system.",
    experience: 14,
    license: "PRC-0678901",
    fee: 2000,
    availableDays: ["Mon", "Wed", "Fri"],
    avatarColor: "#0B4F71",
  },
];

export const PATIENTS: Patient[] = [
  { id: "p1", name: "Juan Dela Cruz", dob: "1990-03-15", phone: "+63 917 123 4567", weight: 72, height: 175, history: "No known allergies. Mild hypertension.", avatarColor: "#0B4F71" },
  { id: "p2", name: "Sofia Reyes", dob: "1995-08-22", phone: "+63 917 987 6543", weight: 58, height: 162, history: "Seasonal asthma.", avatarColor: "#10B981" },
  { id: "p3", name: "Miguel Torres", dob: "1985-11-04", phone: "+63 918 555 0102", weight: 80, height: 178, avatarColor: "#1A7AAF" },
];

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

export const APPOINTMENTS: Appointment[] = [
  { id: "a1", doctorId: "d1", patientId: "p1", date: daysFromNow(0), time: "10:00 AM", status: "confirmed", meetUrl: "https://meet.google.com/abc-defg-hij" },
  { id: "a2", doctorId: "d3", patientId: "p1", date: daysFromNow(2), time: "2:30 PM", status: "confirmed", meetUrl: "https://meet.google.com/xyz-pqrs-tuv" },
  { id: "a3", doctorId: "d2", patientId: "p1", date: daysFromNow(5), time: "9:00 AM", status: "pending" },
  {
    id: "a4", doctorId: "d4", patientId: "p1", date: daysFromNow(-7), time: "11:00 AM", status: "completed",
    notes: {
      subjective: "Patient reports occasional headaches in the evening for two weeks.",
      diagnosis: "Tension-type headache, likely stress-related.",
      prescriptions: [{ name: "Paracetamol", dosage: "500mg", frequency: "Every 6 hours as needed", duration: "5 days" }],
      recommendations: "Hydrate well, reduce screen time, follow up in 2 weeks if symptoms persist.",
      finalized: true,
    },
  },
  {
    id: "a5", doctorId: "d1", patientId: "p1", date: daysFromNow(-21), time: "3:00 PM", status: "completed",
    notes: {
      subjective: "Annual cardiovascular check. No chest pain or palpitations reported.",
      diagnosis: "Mild hypertension, well controlled.",
      prescriptions: [{ name: "Losartan", dosage: "50mg", frequency: "Once daily", duration: "30 days" }],
      recommendations: "Continue low-sodium diet and daily walks.",
      finalized: true,
    },
  },
  { id: "a6", doctorId: "d5", patientId: "p1", date: daysFromNow(-40), time: "1:00 PM", status: "cancelled" },
  // Doctor-side: appointments for d1
  { id: "a7", doctorId: "d1", patientId: "p2", date: daysFromNow(0), time: "11:30 AM", status: "confirmed", meetUrl: "https://meet.google.com/qrs-tuvw-xyz" },
  { id: "a8", doctorId: "d1", patientId: "p3", date: daysFromNow(1), time: "9:30 AM", status: "pending" },
];

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "confirmed", message: "Your appointment with Dr. Maria Santos has been confirmed.", time: "2 hours ago", unread: true },
  { id: "n2", type: "reminder", message: "Reminder: consultation with Dr. Patricia Lim tomorrow at 2:30 PM.", time: "5 hours ago", unread: true },
  { id: "n3", type: "booking", message: "Your booking request with Dr. James Cruz is pending confirmation.", time: "Yesterday", unread: false },
  { id: "n4", type: "cancelled", message: "Dr. Anna Reyes cancelled your appointment on May 12.", time: "3 days ago", unread: false },
];

export function getDoctor(id: string) {
  return DOCTORS.find((d) => d.id === id);
}
export function getPatient(id: string) {
  return PATIENTS.find((p) => p.id === id);
}
export function getAppointment(id: string) {
  return APPOINTMENTS.find((a) => a.id === id);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "Asia/Manila" });
}
export function formatLongDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
}
export function calcAge(dob: string) {
  const d = new Date(dob);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}
export function initials(name: string) {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}