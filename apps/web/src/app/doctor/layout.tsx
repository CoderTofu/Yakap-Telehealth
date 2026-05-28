import { RoleLayout } from "@/components/shared/role-layout";

export const metadata = {
  title: "Doctor - Yakap",
};

export default async function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout role="doctor">{children}</RoleLayout>;
}
