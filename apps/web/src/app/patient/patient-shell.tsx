"use client";

import { AppShell, type NavItem } from "@/components/shared/app-shell";
import { useRouter } from "next/navigation";

import {
  Bell,
  CalendarDays,
  ClipboardList,
  FileText,
  UserRound,
  Search,
} from "lucide-react";

const PATIENT_NAV: NavItem[] = [
  { to: "/patient/dashboard", label: "Dashboard", icon: CalendarDays },
  { to: "/patient/doctors", label: "Find a Doctor", icon: Search },
  { to: "/patient/appointments", label: "Appointments", icon: ClipboardList },
  { to: "/patient/records", label: "Records", icon: FileText },
  { to: "/patient/profile", label: "Profile", icon: UserRound },
  { to: "/patient/notifications", label: "Notifications", icon: Bell },
];

export function PatientShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: {
    name: string;
    role: "patient";
  };
}) {
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    try {
      document.cookie =
        "authToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie =
        "authUser=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
    } catch (_) {}
    router.push("/");
  }
  return (
    <AppShell nav={PATIENT_NAV} user={user} unread={3} onLogout={handleLogout}>
      {children}
    </AppShell>
  );
}
