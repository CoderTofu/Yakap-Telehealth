export const SPECIALTIES = [
  { value: "cardiology", label: "Cardiology", icon: "Heart" },
  { value: "dermatology", label: "Dermatology", icon: "Sun" },
  { value: "pediatrics", label: "Pediatrics", icon: "Baby" },
  { value: "neurology", label: "Neurology", icon: "Brain" },
  { value: "orthopedics", label: "Orthopedics", icon: "Bone" },
  { value: "psychiatry", label: "Psychiatry", icon: "Smile" },
  { value: "general medicine", label: "General Medicine", icon: "Stethoscope" },
  { value: "ophthalmology", label: "Ophthalmology", icon: "Eye" },
  { value: "dentistry", label: "Dentistry", icon: "Tooth" },
  { value: "gynecology", label: "Gynecology", icon: "Flower2" },
] as const;

export const DAYS = [
  {value: -1, label: "Any Day"},
  {value: 0, label: "Sunday"},
  {value: 1, label: "Monday"},
  {value: 2, label: "Tuesday"},
  {value: 3, label: "Wednesday"},
  {value: 4, label: "Thursday"},
  {value: 5, label: "Friday"},
  {value: 6, label: "Saturday"},
]

export type Status = "pending" | "confirmed" | "cancelled" | "completed";

export function initials(name?: string | null) {
  return (name ?? "")
    .replace(/^Dr\.?\s+/i, "")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
