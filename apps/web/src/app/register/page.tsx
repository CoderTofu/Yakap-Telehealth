"use client";

import { useState, type SyntheticEvent } from "react";
import { Check, Stethoscope, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SPECIALTIES } from "@/lib/appConfig";

type Role = "patient" | "doctor";
type Specialty = (typeof SPECIALTIES)[number]["value"];

type RegisterResponse = {
  data: {
    token: string;
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
    };
  };
};

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [phoneNum, setPhoneNum] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passStrength = scorePass(password);

  // Doctors
  const [specialization, setSpecialization] = useState<Specialty>(
    SPECIALTIES[0].value,
  );
  const [licenseNumber, setLicenseNumber] = useState<string>("");
  const [yearsOE, setYearsOE] = useState<string>("");
  const [bio, setBio] = useState<string>("");

  // Patients
  const [birthDate, setBirthDate] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [height, setHeight] = useState<string>("");
  const [history, setHistory] = useState<string>("");

  async function handleFinish(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    if (!role) {
      setErrorMessage("Please choose a role.");
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage("Full name is required.");
      return;
    }

    if (!email.trim()) {
      setErrorMessage("Email is required.");
      return;
    }

    if (!password) {
      setErrorMessage("Password is required.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (!phoneNum.trim()) {
      setErrorMessage("Phone number is required.");
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
      setErrorMessage("API URL is not configured.");
      return;
    }

    const payload = {
      email: email.trim(),
      password,
      role,
      name: fullName.trim(),
      phone: phoneNum.trim(),
      patient_profile:
        role === "patient"
          ? {
              date_of_birth: birthDate || null,
              weight_kg: weight ? Number(weight) : null,
              height_cm: height ? Number(height) : null,
              medical_history: history.trim() || null,
            }
          : undefined,
      doctor_profile:
        role === "doctor"
          ? {
              specialization,
              license_number: licenseNumber.trim(),
              bio: bio.trim() || null,
              years_exp: yearsOE.trim() ? Number(yearsOE) : null,
            }
          : undefined,
    };

    if (role === "doctor" && !payload.doctor_profile?.license_number) {
      setErrorMessage("License number is required.");
      return;
    }

    if (role === "doctor" && !payload.doctor_profile?.specialization) {
      setErrorMessage("Specialization is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as
        | RegisterResponse
        | { error?: { message?: string } };

      if (!response.ok) {
        const message = "error" in result ? result.error?.message : undefined;
        throw new Error(message || "Failed to create account.");
      }

      const data = result as RegisterResponse;

      localStorage.setItem("authToken", data.data.token);
      localStorage.setItem("authUser", JSON.stringify(data.data.user));

      router.push(
        data.data.user.role === "doctor"
          ? "/doctor/dashboard"
          : "/patient/dashboard",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to create account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="px-6 py-6">
        <Link href="/">
          <Logo />
        </Link>
      </div>
      <div className="mx-auto w-full max-w-[480px] px-4 pb-16">
        <form
          onSubmit={handleFinish}
          className="rounded-2xl border border-border bg-surface p-8 shadow-sm"
        >
          {/* Progress */}
          <div className="mb-7 flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex-1">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-colors",
                    step >= n ? "bg-primary" : "bg-muted",
                  )}
                />
              </div>
            ))}
          </div>

          {step === 1 && (
            <>
              <h1 className="font-serif text-3xl text-text-primary">
                Create your account
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                First, tell us who you are.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <RoleCard
                  icon={Stethoscope}
                  title="I'm a Doctor"
                  subtitle="Manage patients and consultations"
                  selected={role === "doctor"}
                  onSelect={() => setRole("doctor")}
                />
                <RoleCard
                  icon={UserRound}
                  title="I'm a Patient"
                  subtitle="Find doctors and book appointments"
                  selected={role === "patient"}
                  onSelect={() => setRole("patient")}
                />
              </div>
              <Button
                type="button"
                disabled={!role}
                onClick={() => setStep(2)}
                className="mt-6 w-full bg-primary hover:bg-primary-mid"
              >
                Continue
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="font-serif text-3xl text-text-primary">
                Basic info
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Used to sign you in and verify your account.
              </p>
              <div className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input
                    placeholder="Juan Dela Cruz"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <PasswordStrength score={passStrength} />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone number</Label>
                  <Input
                    placeholder="+63 ..."
                    value={phoneNum}
                    onChange={(e) => setPhoneNum(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  type="button"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  type="button"
                  className="flex-1 bg-primary hover:bg-primary-mid"
                >
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="font-serif text-3xl text-text-primary">
                {role === "doctor" ? "Professional details" : "Profile details"}
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                {role === "doctor"
                  ? "Patients see this on your profile."
                  : "Helps doctors give better care."}
              </p>
              <div className="mt-6 space-y-4">
                {role === "patient" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>Date of birth</Label>
                      <Input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>Weight (kg)</Label>
                        <Input
                          type="number"
                          placeholder="Optional"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Height (cm)</Label>
                        <Input
                          type="number"
                          placeholder="Optional"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Medical history</Label>
                      <Textarea
                        placeholder="Allergies, conditions, current medications (optional)"
                        rows={3}
                        value={history}
                        onChange={(e) => setHistory(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label>Specialization</Label>
                      <select
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={specialization}
                        onChange={(e) =>
                          setSpecialization(e.target.value as Specialty)
                        }
                      >
                        {SPECIALTIES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>License number</Label>
                      <Input
                        placeholder="PRC-0000000"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Years of experience</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 10"
                        value={yearsOE}
                        onChange={(e) => setYearsOE(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Brief bio</Label>
                      <Textarea
                        placeholder="Tell patients about your approach to care."
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
              {errorMessage ? (
                <p className="mt-4 text-sm text-danger">{errorMessage}</p>
              ) : null}
              <div className="mt-6 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  type="button"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary hover:bg-primary-mid"
                >
                  {isSubmitting ? "Creating..." : "Create Account"}
                </Button>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  subtitle,
  selected,
  onSelect,
}: {
  icon: typeof Stethoscope;
  title: string;
  subtitle: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative rounded-xl border bg-surface p-5 text-left transition-all",
        selected
          ? "border-primary bg-primary-light ring-2 ring-primary-mid/30"
          : "border-border hover:border-primary-mid",
      )}
    >
      {selected && (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
          <Check className="h-3 w-3" />
        </div>
      )}
      <Icon className="h-7 w-7 text-primary-mid" />
      <div className="mt-4 font-medium text-text-primary">{title}</div>
      <div className="mt-1 text-xs text-text-secondary">{subtitle}</div>
    </button>
  );
}

function scorePass(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

function PasswordStrength({ score }: { score: number }) {
  const labels = ["Too weak", "Weak", "Fair", "Good", "Strong"];
  const colors = [
    "bg-muted",
    "bg-danger",
    "bg-warning",
    "bg-primary-mid",
    "bg-accent",
  ];
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full",
              i < score ? colors[score] : "bg-muted",
            )}
          />
        ))}
      </div>
      <span className="w-16 text-right text-[11px] text-text-muted">
        {labels[score]}
      </span>
    </div>
  );
}
