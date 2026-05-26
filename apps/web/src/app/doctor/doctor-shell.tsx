"use client";

import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Users,
  Bell,
  UserRound,
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/shared/app-shell";

export const DOC_NAV: NavItem[] = [
  { to: "/doctor/dashboard", label: "Dashboard", icon: CalendarDays },
  { to: "/doctor/appointments", label: "Appointments", icon: ClipboardList },
  { to: "/doctor/patients", label: "Patients", icon: Users },
  { to: "/doctor/profile", label: "Profile", icon: UserRound },
  { to: "/doctor/notifications", label: "Notifications", icon: Bell },
];

export function DoctorShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: {
    name: string;
    role: "doctor";
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
    <AppShell nav={DOC_NAV} user={user} unread={3} onLogout={handleLogout}>
      {children}
    </AppShell>
  );
}
