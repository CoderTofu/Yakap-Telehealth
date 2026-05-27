"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Bell, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
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

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    onLogout?.();
  };

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
              onClick={handleLogout}
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
            <Link
              href={
                user.role === "patient"
                  ? "/patient/notifications"
                  : "/doctor/notifications"
              }
              className="relative rounded-md p-2 text-text-secondary hover:bg-muted hover:text-text-primary"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              ) : null}
            </Link>
            <Link
              href={
                user.role === "patient" ? "/patient/profile" : "/doctor/profile"
              }
              className="block"
            >
              <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary">
                {getInitials(user.name)}
              </div>
            </Link>
          </div>
        </header>

        <main className="px-6 py-8 text-text-primary">{children}</main>
      </div>
    </div>
  );
}
