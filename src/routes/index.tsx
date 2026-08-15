import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BrainCircuit,
  GraduationCap,
  LineChart,
  Sparkles,
  Target,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartCampus — Placement Readiness Platform for Students" },
      {
        name: "description",
        content:
          "Know your skills, find your gaps and crack your placement. Skill-gap analysis, practice quizzes and AI interview prep for college students.",
      },
      { property: "og:title", content: "SmartCampus — Placement Readiness Platform" },
      {
        property: "og:description",
        content:
          "Compare your skills with real job roles, practice placement MCQs and generate interview questions with AI.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: UserCheck,
    title: "Student profile",
    body: "Keep your college details, skills, projects and certifications in one place.",
  },
  {
    icon: Target,
    title: "Skill gap analysis",
    body: "Compare your skills against real job-role requirements and see exactly what's missing.",
  },
  {
    icon: BrainCircuit,
    title: "Placement quizzes",
    body: "Timed MCQs across Aptitude, Java, DBMS, SQL and DSA with explanations.",
  },
  {
    icon: LineChart,
    title: "Progress dashboard",
    body: "Track quiz averages, category performance and overall preparation score.",
  },
  {
    icon: Sparkles,
    title: "AI interview assistant",
    body: "Generate role-specific interview questions with answer guidance and revision topics.",
  },
];

const STEPS = [
  { step: "01", title: "Create your account", body: "Register with your college and degree details." },
  { step: "02", title: "Add skills & pick a role", body: "Choose a target role like Java Full Stack Developer." },
  { step: "03", title: "Close the gaps", body: "Practice quizzes, review AI questions and track your readiness." },
];

function Landing() {
  const { user, loading } = useAuth();
  const primaryTo = user ? "/dashboard" : "/auth";

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-hero-gradient p-1.5 text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-display text-lg">SmartCampus</span>
        </div>
        <div className="flex items-center gap-2">
          {loading ? null : user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/auth">Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/auth" search={{ mode: "register" }}>
                  Get started
                </Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10 lg:px-8 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Placement readiness, measured
            </span>
            <h1 className="font-display mt-5 text-4xl leading-tight text-foreground lg:text-5xl">
              Know Your Skills. Find Your Gaps. Crack Your Placement.
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted-foreground">
              SmartCampus compares your profile with real job-role requirements, drills you with
              placement MCQs, and prepares you for the interview room.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={primaryTo}>{user ? "Open dashboard" : "Get started free"}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#how-it-works">How it works</a>
              </Button>
            </div>
          </div>

          <Card className="shadow-card border-border/70">
            <CardContent className="space-y-4 p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sample readiness snapshot
              </p>
              <div className="space-y-3">
                {[
                  { label: "Skill match — Java Full Stack", value: 66 },
                  { label: "Quiz average", value: 74 },
                  { label: "Overall preparation", value: 70 },
                ].map((row) => (
                  <div key={row.label} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium">{row.value}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-hero-gradient"
                        style={{ width: `${row.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {["Java", "React", "SQL"].map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    ✓ {s}
                  </span>
                ))}
                {["Spring Boot", "Docker"].map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    ✗ {s}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y border-border bg-card/60 py-16">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <h2 className="font-display text-2xl text-foreground lg:text-3xl">
            Everything you need before the drive
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border-border/70">
                <CardContent className="space-y-2 p-5">
                  <span className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="font-display text-base text-foreground">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 lg:px-8">
        <h2 className="font-display text-2xl text-foreground lg:text-3xl">How it works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="rounded-xl border border-border bg-card p-5">
              <span className="font-display text-sm text-primary">{s.step}</span>
              <h3 className="font-display mt-2 text-base text-foreground">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-2xl bg-hero-gradient p-8 text-center">
          <h2 className="font-display text-2xl text-primary-foreground">
            Start measuring your placement readiness today
          </h2>
          <Button asChild size="lg" variant="secondary" className="mt-5">
            <Link to={primaryTo}>{user ? "Open dashboard" : "Create your free account"}</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        SmartCampus — Know Your Skills. Find Your Gaps. Crack Your Placement.
      </footer>
    </div>
  );
}
