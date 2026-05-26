import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

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

  return <>{children}</>;
}
