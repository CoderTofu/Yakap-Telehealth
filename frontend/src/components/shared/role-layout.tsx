import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

import { RoleShell } from "./role-shell";

type Role = "patient" | "doctor";

export async function RoleLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: Role;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== role) {
    redirect("/login");
  }

  return <RoleShell user={{ name: user.name, role }}>{children}</RoleShell>;
}