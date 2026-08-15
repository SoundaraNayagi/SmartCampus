import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Loading } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { profileQuery } from "@/lib/queries";
import { DIFFICULTIES, JOB_ROLES } from "@/lib/jobRoles";
import { generateInterviewPack } from "@/lib/interview.functions";
import type { InterviewPack } from "@/lib/interview-types";

export const Route = createFileRoute("/_authenticated/interview")({
  head: () => ({
    meta: [
      { title: "AI Interview Assistant — SmartCampus" },
      {
        name: "description",
        content:
          "Generate personalized technical interview questions with answer guidance for your target role.",
      },
      { property: "og:title", content: "AI Interview Assistant — SmartCampus" },
      { property: "og:description", content: "Role-specific interview questions and revision topics." },
    ],
  }),
  component: InterviewPage,
});

function InterviewPage() {
  const profile = useQuery(profileQuery);
  const generate = useServerFn(generateInterviewPack);
  const [role, setRole] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [count, setCount] = useState("5");
  const [pack, setPack] = useState<InterviewPack | null>(null);
  const [busy, setBusy] = useState(false);

  if (profile.isLoading) {
    return (
      <AppShell title="AI Interview Assistant">
        <Loading />
      </AppShell>
    );
  }

  const skills = profile.data?.skills ?? [];
  const selectedRole = role || profile.data?.target_role || JOB_ROLES[0]!.name;

  async function handleGenerate() {
    setBusy(true);
    try {
      const result = await generate({
        data: {
          role: selectedRole,
          skills: skills.slice(0, 40),
          difficulty,
          count: Number(count),
        },
      });
      setPack(result);
      if (result.source === "fallback") {
        toast.info(result.note ?? "Showing a curated practice set.");
      } else {
        toast.success("Interview questions generated");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate questions.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="AI Interview Assistant"
      description="Personalized questions based on your target role and skills."
    >
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-display text-base">Generate questions</CardTitle>
            <CardDescription>Your skills are included automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Target role</p>
              <Select value={selectedRole} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {JOB_ROLES.map((r) => (
                    <SelectItem key={r.name} value={r.name}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Difficulty</p>
              <Select
                value={difficulty}
                onValueChange={(value) => setDifficulty(value as "Easy" | "Medium" | "Hard")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Number of questions</p>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["3", "5", "8", "10"].map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">Your skills</p>
              {skills.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No skills added yet — questions will stay generic.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button className="w-full" onClick={handleGenerate} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="size-4" /> Generate
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!pack ? (
            <Card>
              <CardContent className="p-10 text-center">
                <h3 className="font-display text-lg">No questions yet</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Pick a role and difficulty, then generate your personalized interview set.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {pack.note ? (
                <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm">
                  {pack.note}
                </p>
              ) : null}

              {pack.questions.map((item, index) => (
                <Card key={index}>
                  <CardContent className="space-y-2 p-5">
                    <p className="font-display text-base">
                      {index + 1}. {item.question}
                    </p>
                    <p className="rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">What to cover: </span>
                      {item.guidance}
                    </p>
                  </CardContent>
                </Card>
              ))}

              {pack.revisionTopics.length ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-display text-base">Topics to revise</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {pack.revisionTopics.map((topic) => (
                      <span key={topic} className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                        {topic}
                      </span>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
