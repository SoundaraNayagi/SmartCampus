import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Loading } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries";
import { JOB_ROLES, SKILL_SUGGESTIONS, analyzeSkillGap } from "@/lib/jobRoles";

export const Route = createFileRoute("/_authenticated/skills")({
  head: () => ({
    meta: [
      { title: "Skills & Target Role — SmartCampus" },
      { name: "description", content: "Manage your skills and choose your target placement role." },
      { property: "og:title", content: "Skills & Target Role — SmartCampus" },
      { property: "og:description", content: "Add skills and select a target job role to analyse." },
    ],
  }),
  component: SkillsPage,
});

function SkillsPage() {
  const profile = useQuery(profileQuery);
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");

  const save = useMutation({
    mutationFn: async (patch: { skills?: string[]; target_role?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update(patch).eq("id", auth.user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (profile.isLoading) {
    return (
      <AppShell title="Skills & Target Role">
        <Loading />
      </AppShell>
    );
  }

  const skills = profile.data?.skills ?? [];
  const targetRole = profile.data?.target_role ?? "";
  const gap = analyzeSkillGap(skills, targetRole || null);

  function addSkill(raw: string) {
    const skill = raw.trim();
    if (!skill) return;
    if (skill.length > 50) {
      toast.error("Skill name is too long.");
      return;
    }
    if (skills.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      toast.info(`${skill} is already in your list.`);
      return;
    }
    save.mutate({ skills: [...skills, skill] });
    setInput("");
  }

  function removeSkill(skill: string) {
    save.mutate({ skills: skills.filter((s) => s !== skill) });
  }

  return (
    <AppShell
      title="Skills & Target Role"
      description="Your skills drive the skill-gap analysis and AI interview prep."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Your skills</CardTitle>
            <CardDescription>Add every language, framework and tool you know.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                addSkill(input);
              }}
            >
              <Input
                value={input}
                maxLength={50}
                onChange={(event) => setInput(event.target.value)}
                placeholder="e.g. Spring Boot"
              />
              <Button type="submit" disabled={save.isPending}>
                <Plus className="size-4" /> Add
              </Button>
            </form>

            {skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills yet — add your first one.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      aria-label={`Remove ${skill}`}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Quick add
              </p>
              <div className="flex flex-wrap gap-2">
                {SKILL_SUGGESTIONS.filter(
                  (s) => !skills.some((owned) => owned.toLowerCase() === s.toLowerCase()),
                )
                  .slice(0, 14)
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addSkill(s)}
                      className="rounded-full border border-dashed border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      + {s}
                    </button>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Target job role</CardTitle>
            <CardDescription>Each role has a predefined set of required skills.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={targetRole}
              onValueChange={(value) => {
                save.mutate({ target_role: value });
                toast.success(`Target role set to ${value}`);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a target role" />
              </SelectTrigger>
              <SelectContent>
                {JOB_ROLES.map((role) => (
                  <SelectItem key={role.name} value={role.name}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {gap ? (
              <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-sm text-muted-foreground">
                  {JOB_ROLES.find((r) => r.name === gap.role)?.summary}
                </p>
                <p className="text-sm">
                  Required skills:{" "}
                  <span className="text-muted-foreground">
                    {JOB_ROLES.find((r) => r.name === gap.role)?.requiredSkills.join(", ")}
                  </span>
                </p>
                <p className="font-display text-2xl">{gap.matchPercentage}% match</p>
                <Button asChild size="sm">
                  <Link to="/skill-gap">View full analysis</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Choose a role to see your match percentage and missing skills.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
