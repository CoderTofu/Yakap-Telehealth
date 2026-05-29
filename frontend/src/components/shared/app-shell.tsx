"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bell, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { ConfirmDialog } from "./confirm-dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type UserRole = "patient" | "doctor";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export interface AppShellUser {
  name: string;
  role: UserRole;
}

type NotificationPreview = {
  id: string;
  message: string;
  created_at: string;
  is_read: boolean;
};

function deriveTitle(pathname: string, nav: NavItem[]) {
  const exact = nav.find((n) => n.to === pathname);
  if (exact) return exact.label;
  const partial = nav.find((n) => pathname.startsWith(n.to) && n.to !== "/");
  return partial?.label ?? "Dashboard";
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function AppShell({
  nav,
  user,
  onLogout,
  unread = 0,
  children,
}: {
  nav: NavItem[];
  user: AppShellUser;
  onLogout?: () => void;
  unread?: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const title = deriveTitle(pathname, nav);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notificationsCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    let mounted = true;

    async function fetchNotifications() {
      if (notificationsLoaded) return;

      try {
        const json = await apiRequest<{ data: NotificationPreview[] }>(
          "/api/v1/notifications/me",
        );

        if (!mounted) return;

        setNotifications(Array.isArray(json.data) ? json.data.slice(0, 3) : []);
      } catch (error) {
        if (mounted) {
          setNotifications([]);
        }
      } finally {
        if (mounted) {
          setNotificationsLoaded(true);
        }
      }
    }

    if (notificationsOpen) {
      void fetchNotifications();
    }

    return () => {
      mounted = false;
    };
  }, [notificationsLoaded, notificationsOpen]);

  const handleLogout = () => {
    onLogout?.();
  };

  function formatRelativeTime(iso: string) {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
      return "Just now";
    }

    const seconds = Math.round((date.getTime() - Date.now()) / 1000);
    const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
      ["year", 60 * 60 * 24 * 365],
      ["month", 60 * 60 * 24 * 30],
      ["week", 60 * 60 * 24 * 7],
      ["day", 60 * 60 * 24],
      ["hour", 60 * 60],
      ["minute", 60],
    ];

    for (const [unit, unitSeconds] of units) {
      if (Math.abs(seconds) >= unitSeconds) {
        return formatter.format(Math.round(seconds / unitSeconds), unit);
      }
    }

    return formatter.format(seconds, "second");
  }

  function openNotificationsMenu() {
    if (notificationsCloseTimer.current) {
      clearTimeout(notificationsCloseTimer.current);
      notificationsCloseTimer.current = null;
    }
    setNotificationsOpen(true);
  }

  function closeNotificationsMenu() {
    if (notificationsCloseTimer.current) {
      clearTimeout(notificationsCloseTimer.current);
    }
    notificationsCloseTimer.current = setTimeout(() => {
      setNotificationsOpen(false);
    }, 150);
  }

  function openUserMenu() {
    if (userMenuCloseTimer.current) {
      clearTimeout(userMenuCloseTimer.current);
      userMenuCloseTimer.current = null;
    }
    setUserMenuOpen(true);
  }

  function closeUserMenu() {
    if (userMenuCloseTimer.current) {
      clearTimeout(userMenuCloseTimer.current);
    }
    userMenuCloseTimer.current = setTimeout(() => {
      setUserMenuOpen(false);
    }, 150);
  }

  return (
    <div className="min-h-screen w-full bg-bg text-text-primary">
      {isSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden "
          aria-label="Close sidebar"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-surface transition-transform duration-200 ease-out lg:translate-x-0",
          isSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center border-b border-border px-5">
          <Logo />
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="ml-auto rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-text-primary lg:hidden cursor-pointer"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {nav.map((item) => {
              const isActive =
                pathname === item.to ||
                (item.to !== "/" && pathname.startsWith(item.to + "/"));
              const Icon = item.icon;
              return (
                <li key={item.to} className="relative">
                  {isActive ? (
                    <span className="absolute bottom-1.5 left-0 top-1.5 w-0.75 rounded-r-full bg-primary" />
                  ) : null}
                  <Link
                    href={item.to}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-light text-primary"
                        : "text-text-secondary hover:bg-muted hover:text-text-primary",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary">
              {getInitials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text-primary">
                {user.name}
              </div>
              <div className="text-[11px] capitalize tracking-wide text-text-muted">
                {user.role}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(true)}
              className="rounded-md p-1.5 text-text-secondary hover:bg-muted hover:text-danger cursor-pointer"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-surface/95 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="rounded-md p-2 text-text-secondary hover:bg-muted hover:text-text-primary lg:hidden cursor-pointer"
              aria-label="Toggle sidebar"
              aria-expanded={isSidebarOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-serif text-2xl text-text-primary">{title}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="relative"
              onMouseEnter={openNotificationsMenu}
              onMouseLeave={closeNotificationsMenu}
            >
              <Link
                href={
                  user.role === "patient"
                    ? "/patient/notifications"
                    : "/doctor/notifications"
                }
                className="relative block rounded-md p-2 text-text-secondary hover:bg-muted hover:text-text-primary"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 ? (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                    {unread}
                  </span>
                ) : null}
              </Link>

              <div
                className={cn(
                  "pointer-events-none absolute right-0 top-full z-20 mt-2 w-80 translate-y-1 rounded-xl border border-border bg-surface p-3 text-sm opacity-0 shadow-lg transition-all duration-150",
                  notificationsOpen && "pointer-events-auto translate-y-0 opacity-100",
                )}
                onMouseEnter={openNotificationsMenu}
                onMouseLeave={closeNotificationsMenu}
              >
                <div className="flex items-center justify-between px-1 pb-2">
                  <div>
                    <div className="text-sm font-semibold text-text-primary">Notifications</div>
                    <div className="text-xs text-text-muted">Latest updates</div>
                  </div>
                  <Link
                    href={
                      user.role === "patient"
                        ? "/patient/notifications"
                        : "/doctor/notifications"
                    }
                    className="text-xs font-medium text-primary hover:text-primary-mid"
                  >
                    View all
                  </Link>
                </div>

                <div className="space-y-2">
                  {notifications.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-text-secondary">
                      {notificationsLoaded
                        ? "No notifications yet."
                        : "Loading notifications..."}
                    </div>
                  ) : (
                    notifications.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border bg-muted/20 px-3 py-2"
                      >
                        <div className="line-clamp-2 text-sm text-text-primary">
                          {item.message}
                        </div>
                        <div className="mt-1 text-xs text-text-muted">
                          {formatRelativeTime(item.created_at)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div
              className="relative"
              onMouseEnter={openUserMenu}
              onMouseLeave={closeUserMenu}
            >
              <Link
                href={
                  user.role === "patient" ? "/patient/profile" : "/doctor/profile"
                }
                className="block"
                aria-label="Profile"
              >
                <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary">
                  {getInitials(user.name)}
                </div>
              </Link>

              <div
                className={cn(
                  "pointer-events-none absolute right-0 top-full z-20 mt-2 w-72 translate-y-1 rounded-xl border border-border bg-surface p-3 text-sm opacity-0 shadow-lg transition-all duration-150",
                  userMenuOpen && "pointer-events-auto translate-y-0 opacity-100",
                )}
                onMouseEnter={openUserMenu}
                onMouseLeave={closeUserMenu}
              >
                <div className="flex items-center gap-3 border-b border-border pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary">
                    {getInitials(user.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-text-primary">{user.name}</div>
                    <div className="text-xs capitalize tracking-wide text-text-muted">
                      {user.role}
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => setLogoutConfirmOpen(true)}
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-6 py-8 text-text-primary">{children}</main>
      </div>

      <ConfirmDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        title="Sign out?"
        description="You will need to log in again to access this account."
        confirmLabel="Log out"
        confirmingLabel="Logging out..."
        cancelLabel="Stay signed in"
        intent="destructive"
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          handleLogout();
        }}
      />
    </div>
  );
}
