"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Search,
  UserRound,
  Users,
} from "lucide-react";

import { AppShell, type NavItem, type AppShellUser } from "./app-shell";
import { apiRequest } from "@/lib/api-client";

const PATIENT_NAV: NavItem[] = [
  { to: "/patient/dashboard", label: "Dashboard", icon: CalendarDays },
  { to: "/patient/doctors", label: "Find a Doctor", icon: Search },
  { to: "/patient/appointments", label: "Appointments", icon: ClipboardList },
  { to: "/patient/records", label: "Records", icon: FileText },
  { to: "/patient/profile", label: "Profile", icon: UserRound },
  { to: "/patient/notifications", label: "Notifications", icon: Bell },
];

const DOCTOR_NAV: NavItem[] = [
  { to: "/doctor/dashboard", label: "Dashboard", icon: CalendarDays },
  { to: "/doctor/appointments", label: "Appointments", icon: ClipboardList },
  { to: "/doctor/schedule", label: "My Schedule", icon: Clock },
  { to: "/doctor/patients", label: "Patients", icon: Users },
  { to: "/doctor/profile", label: "Profile", icon: UserRound },
  { to: "/doctor/notifications", label: "Notifications", icon: Bell },
];

export function RoleShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: AppShellUser;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function fetchUnreadCount() {
      try {
        const json = await apiRequest<{ data: Array<{ is_read: boolean }> }>(
          "/api/v1/notifications/me",
        );
        if (!mounted) return;

        const items = Array.isArray(json.data) ? json.data : [];
        setUnread(items.filter((item) => !item.is_read).length);
      } catch (error) {
        if (mounted) {
          setUnread(0);
        }
      }
    }

    void fetchUnreadCount();

    function handleNotificationsChanged() {
      void fetchUnreadCount();
    }

    window.addEventListener("notifications:changed", handleNotificationsChanged);

    return () => {
      mounted = false;
      window.removeEventListener(
        "notifications:changed",
        handleNotificationsChanged,
      );
    };
  }, [pathname]);

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
    <AppShell
      nav={user.role === "patient" ? PATIENT_NAV : DOCTOR_NAV}
      user={user}
      unread={unread}
      onLogout={handleLogout}
    >
      {children}
    </AppShell>
  );
}