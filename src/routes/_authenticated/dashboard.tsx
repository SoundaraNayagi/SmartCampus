import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BrainCircuit, ListChecks, Target, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState, Loading } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { profileQuery, quizResultsQuery } from "@/lib/queries";
import { QUIZ_CATEGORIES, analyzeSkillGap } from "@/lib/jobRoles";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — SmartCampus" },
      { name: "description", content: "Your placement readiness at a glance." },
      { property: "og:title", content: "SmartCampus Dashboard" },
      { property: "og:description", content: "Skill match, quiz averages and preparation score." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const profile = useQuery(profileQuery);
  const results = useQuery(quizResultsQuery);

  if (profile.isLoading || results.isLoading) {
    return (
      <AppShell title="Dashboard">
        <Loading />
      </AppShell>
    );
  }

  if (profile.isError || results.isError) {
    return (
      <AppShell title="Dashboard">
        <EmptyState
          title="Couldn't load your dashboard"
          description={(profile.error ?? results.error)?.message ?? "Please try again."}
          action={
            <Button
              onClick={() => {
                profile.refetch();
                results.refetch();
              }}
            >
              Retry
            </Button>
          }
        />
      </AppShell>
    );
  }

  const skills = profile.data?.skills ?? [];
  const gap = analyzeSkillGap(skills, profile.data?.target_role ?? null);
  const all = results.data ?? [];
  const attempted = all.reduce((sum, r) => sum + r.total_questions, 0);
  const quizAverage = all.length
    ? Math.round(all.reduce((sum, r) => sum + Number(r.percentage), 0) / all.length)
    : 0;
  const skillMatch = gap?.matchPercentage ?? 0;
  const overall = Math.round(skillMatch * 0.5 + quizAverage * 0.5);

  const categoryData = QUIZ_CATEGORIES.map((category) => {
    const rows = all.filter((r) => r.category === category);
    const score = rows.length
      ? Math.round(rows.reduce((sum, r) => sum + Number(r.percentage), 0) / rows.length)
      : 0;
    return { category, score };
  });

  return (
    <AppShell
      title={`Hi${profile.data?.name ? `, ${profile.data.name.split(" ")[0]}` : ""} 👋`}
      description={
        profile.data?.target_role
          ? `Target role: ${profile.data.target_role}`
          : "Pick a target role to unlock your skill gap analysis"
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Skill match"
          value={`${skillMatch}%`}
          hint={gap ? gap.role : "No target role yet"}
          icon={Target}
        />
        <StatCard label="Quiz average" value={`${quizAverage}%`} hint={`${all.length} attempts`} icon={TrendingUp} />
        <StatCard label="Questions attempted" value={attempted} hint="Across all categories" icon={BrainCircuit} />
        <StatCard label="Overall preparation" value={`${overall}%`} hint="Skill match + quiz average" icon={ListChecks} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">Category performance</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {all.length === 0 ? (
              <EmptyState
                title="No quiz data yet"
                description="Take your first practice quiz to see category-wise performance."
                action={
                  <Button asChild>
                    <Link to="/quiz">Start a quiz</Link>
                  </Button>
                }
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="category" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.75rem",
                      color: "var(--card-foreground)",
                    }}
                    formatter={(value: number) => [`${value}%`, "Average"]}
                  />
                  <Bar dataKey="score" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Readiness breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar label="Skill match" value={skillMatch} />
            <ProgressBar label="Quiz average" value={quizAverage} />
            <ProgressBar label="Overall preparation" value={overall} />
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium">Next steps</p>
              {gap && gap.missing.length > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Learn {gap.missing.slice(0, 3).join(", ")} to raise your match score.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {gap ? "You cover all required skills — focus on practice quizzes." : "Add skills and choose a target role."}
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild size="sm" variant="outline">
                  <Link to="/skill-gap">Skill gap</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/interview">AI interview</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-display text-base">Recent quiz results</CardTitle>
        </CardHeader>
        <CardContent>
          {all.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attempts yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {all.slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{r.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span className="font-display text-base">
                    {r.score}/{r.total_questions} · {Math.round(Number(r.percentage))}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
