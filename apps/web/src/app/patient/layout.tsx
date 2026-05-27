import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PatientShell } from "./patient-shell";

export const metadata = {
  title: "Patient - Yakap",
};

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "patient") {
    redirect("/login");
  }

  const shellUser = { name: user.name, role: "patient" as const };

  return <PatientShell user={shellUser}>{children}</PatientShell>;
}
