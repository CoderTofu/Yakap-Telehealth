import { getCurrentUser } from "@/lib/auth";
import { RoleLayout } from "@/components/shared/role-layout";

export const metadata = {
  title: "Patient - Yakap",
};

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout role="patient">{children}</RoleLayout>;
}
