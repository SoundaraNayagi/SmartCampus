import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, Loading } from "@/components/Loading";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { profileQuery } from "@/lib/queries";
import { JOB_ROLES, analyzeSkillGap } from "@/lib/jobRoles";

export const Route = createFileRoute("/_authenticated/skill-gap")({
  head: () => ({
    meta: [
      { title: "Skill Gap Analysis — SmartCampus" },
      {
        name: "description",
        content: "Compare your skills with your target job role and see exactly what is missing.",
      },
      { property: "og:title", content: "Skill Gap Analysis — SmartCampus" },
      { property: "og:description", content: "Match percentage, matched skills and missing skills." },
    ],
  }),
  component: SkillGapPage,
});

function SkillGapPage() {
  const profile = useQuery(profileQuery);

  if (profile.isLoading) {
    return (
      <AppShell title="Skill Gap Analysis">
        <Loading />
      </AppShell>
    );
  }

  const skills = profile.data?.skills ?? [];
  const gap = analyzeSkillGap(skills, profile.data?.target_role ?? null);

  if (!gap) {
    return (
      <AppShell title="Skill Gap Analysis">
        <EmptyState
          title="Select a target role first"
          description="Pick one of the predefined job roles and add your skills to run the comparison."
          action={
            <Button asChild>
              <Link to="/skills">Go to Skills & Role</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const role = JOB_ROLES.find((r) => r.name === gap.role);

  return (
    <AppShell
      title="Skill Gap Analysis"
      description={`${gap.role} — rule-based comparison of your skills against the role requirements`}
    >
      <Card className="shadow-card">
        <CardContent className="grid gap-6 p-6 md:grid-cols-[220px_1fr] md:items-center">
          <div className="text-center">
            <p className="font-display text-5xl text-primary">{gap.matchPercentage}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {gap.matched.length} of {role?.requiredSkills.length} required skills
            </p>
          </div>
          <div className="space-y-3">
            <ProgressBar label="Skill match" value={gap.matchPercentage} />
            <p className="text-sm text-muted-foreground">
              {gap.matchPercentage >= 80
                ? "Strong fit. Focus on interview practice and projects."
                : gap.matchPercentage >= 50
                  ? "Good base. Close the missing skills below to become a strong candidate."
                  : "Early stage. Start with the recommended skills in order."}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Matching skills</CardTitle>
            <CardDescription>Skills you already have for this role.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {gap.matched.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches yet.</p>
            ) : (
              gap.matched.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-sm"
                >
                  <Check className="size-3.5 text-success" /> {skill}
                </span>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Missing skills</CardTitle>
            <CardDescription>Add these to reach a 100% match.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {gap.missing.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing missing — well done.</p>
            ) : (
              gap.missing.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1 text-sm"
                >
                  <X className="size-3.5 text-destructive" /> {skill}
                </span>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="font-display text-base">Recommended learning order</CardTitle>
          <CardDescription>Start at the top — highest impact for this role.</CardDescription>
        </CardHeader>
        <CardContent>
          {gap.missing.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You cover every required skill. Move on to practice quizzes and AI interview prep.
            </p>
          ) : (
            <ol className="space-y-2">
              {gap.missing.map((skill, index) => (
                <li key={skill} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                  <span className="font-display text-primary">{index + 1}</span>
                  {skill}
                </li>
              ))}
            </ol>
          )}
          {gap.extra.length > 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Bonus skills outside this role: {gap.extra.join(", ")}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
