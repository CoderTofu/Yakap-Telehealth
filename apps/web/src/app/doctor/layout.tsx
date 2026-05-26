import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

import { DoctorShell } from "./doctor-shell";

export const metadata = {
  title: "Doctor - Yakap",
};

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== "doctor") {
    redirect("/login");
  }

  const shellUser = { name: user.name, role: "doctor" as const };

  return <DoctorShell user={shellUser}>{children}</DoctorShell>;
}
