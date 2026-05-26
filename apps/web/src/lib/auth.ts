import { cookies } from "next/headers";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "patient" | "doctor";
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const c = cookies().get("authUser")?.value;
    if (!c) return null;
    const parsed = JSON.parse(decodeURIComponent(c)) as CurrentUser;
    return parsed;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUserRole(): Promise<
  "patient" | "doctor" | null
> {
  const u = await getCurrentUser();
  return u?.role ?? null;
}
