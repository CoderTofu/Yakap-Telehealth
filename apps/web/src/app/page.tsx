import {
  Heart,
  Sun,
  Baby,
  Brain,
  Bone,
  Smile,
  Stethoscope,
  Eye,
  Flower2,
  UserPlus,
  CalendarCheck,
  Video,
  ArrowRight,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SPECIALTIES } from "@/lib/appConfig";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart,
  Sun,
  Baby,
  Brain,
  Bone,
  Smile,
  Stethoscope,
  Eye,
  Tooth: Smile,
  Flower2,
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg">
      {/* Top bar */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-text-secondary hover:text-text-primary"
            >
              Log in
            </Link>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary">
            Telehealth, designed with care
          </span>
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] md:text-6xl">
            Quality healthcare,
            <br />
            wherever you are.
          </h1>
          <p className="mt-5 max-w-md text-base text-text-secondary">
            Book online consultations with trusted doctors. Get diagnoses,
            prescriptions, and follow-up care from the comfort of home.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-primary-mid"
            >
              <Link href="/register">Book a Consultation</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary text-primary hover:bg-primary-light hover:text-primary"
            >
              <Link href="/register">I'm a Doctor</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border bg-surface py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 max-w-xl">
            <h2 className="font-serif text-4xl">How it works</h2>
            <p className="mt-3 text-text-secondary">
              Three simple steps from sign-up to seeing a doctor.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                n: 1,
                icon: UserPlus,
                title: "Create your account",
                desc: "Sign up as a patient and tell us a little about your health.",
              },
              {
                n: 2,
                icon: CalendarCheck,
                title: "Find a doctor and book",
                desc: "Browse specialists, view profiles, and book a time that works.",
              },
              {
                n: 3,
                icon: Video,
                title: "Connect via consultation",
                desc: "Join your session over Google Meet and receive notes after.",
              },
            ].map(({ n, icon: Icon, title, desc }) => (
              <div
                key={n}
                className="rounded-2xl border border-border bg-bg p-6"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-serif text-white">
                    {n}
                  </div>
                  <Icon className="h-5 w-5 text-primary-mid" />
                </div>
                <h3 className="mt-5 font-serif text-xl">{title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specializations */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <h2 className="font-serif text-4xl">Find the right specialist</h2>
              <p className="mt-3 text-text-secondary">
                Browse care across our most-booked specialties.
              </p>
            </div>
            <Link
              href="/register"
              className="hidden text-sm font-medium text-primary hover:underline md:inline-flex items-center gap-1"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SPECIALTIES.map((s) => {
              const Icon = ICONS[s.icon] ?? Stethoscope;
              return (
                <Link
                  key={s.value}
                  href="/register"
                  className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary-mid hover:bg-primary-light"
                >
                  <Icon className="h-6 w-6 text-primary-mid" />
                  <div className="mt-4 text-sm font-medium">{s.label}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-surface py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center">
          <Logo />
          <div className="flex gap-6 text-sm text-text-secondary">
            <a href="#" className="hover:text-text-primary">
              About
            </a>
            <a href="#" className="hover:text-text-primary">
              Privacy
            </a>
            <a href="#" className="hover:text-text-primary">
              Terms
            </a>
            <a href="#" className="hover:text-text-primary">
              Contact
            </a>
          </div>
          <div className="text-xs text-text-muted">
            © {new Date().getFullYear()} Yakap Health
          </div>
        </div>
      </footer>
    </div>
  );
}
