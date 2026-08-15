import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Github, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { Loading } from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { certificationsQuery, profileQuery, projectsQuery } from "@/lib/queries";
import type { Certification, Project } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — SmartCampus" },
      {
        name: "description",
        content: "Manage your personal details, projects and certifications on SmartCampus.",
      },
      { property: "og:title", content: "My Profile — SmartCampus" },
      { property: "og:description", content: "Student profile, projects and certifications." },
    ],
  }),
  component: ProfilePage,
});

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(100),
  college: z.string().trim().max(150),
  degree: z.string().trim().max(100),
  graduation_year: z
    .union([z.coerce.number().int().min(1980).max(2100), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
});

const projectSchema = z.object({
  title: z.string().trim().min(2, "Project title is required").max(120),
  description: z.string().trim().max(1000),
  technologies: z.string().trim().max(300),
  github_url: z.union([z.string().trim().url("Enter a valid URL").max(300), z.literal("")]),
});

const certSchema = z.object({
  name: z.string().trim().min(2, "Certification name is required").max(150),
  issuer: z.string().trim().max(150),
  year: z.union([z.coerce.number().int().min(1980).max(2100), z.literal("")]),
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const profile = useQuery(profileQuery);
  const projects = useQuery(projectsQuery);
  const certs = useQuery(certificationsQuery);

  const [form, setForm] = useState({ name: "", college: "", degree: "", graduation_year: "" });

  useEffect(() => {
    if (profile.data) {
      setForm({
        name: profile.data.name ?? "",
        college: profile.data.college ?? "",
        degree: profile.data.degree ?? "",
        graduation_year: profile.data.graduation_year ? String(profile.data.graduation_year) : "",
      });
    }
  }, [profile.data]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const parsed = profileSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update(parsed.data).eq("id", auth.user.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (profile.isLoading) {
    return (
      <AppShell title="My Profile">
        <Loading />
      </AppShell>
    );
  }

  return (
    <AppShell title="My Profile" description="Keep your placement profile up to date.">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Personal information</CardTitle>
            <CardDescription>Email is managed by your login and cannot be changed here.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveProfile.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={form.name}
                  maxLength={100}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={profile.data?.email ?? ""} readOnly disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="college">College</Label>
                <Input
                  id="college"
                  value={form.college}
                  maxLength={150}
                  onChange={(e) => setForm({ ...form, college: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="degree">Degree</Label>
                <Input
                  id="degree"
                  value={form.degree}
                  maxLength={100}
                  onChange={(e) => setForm({ ...form, degree: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="graduation_year">Graduation year</Label>
                <Input
                  id="graduation_year"
                  inputMode="numeric"
                  value={form.graduation_year}
                  onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={saveProfile.isPending}>
                  {saveProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <ProjectsSection projects={projects.data ?? []} loading={projects.isLoading} />
        <CertificationsSection certifications={certs.data ?? []} loading={certs.isLoading} />
      </div>
    </AppShell>
  );
}

function ProjectsSection({ projects, loading }: { projects: Project[]; loading: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", technologies: "", github_url: "" });

  const reset = () => {
    setEditing(null);
    setForm({ title: "", description: "", technologies: "", github_url: "" });
  };

  const upsert = useMutation({
    mutationFn: async () => {
      const parsed = projectSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const payload = {
        title: parsed.data.title,
        description: parsed.data.description,
        technologies: parsed.data.technologies
          ? parsed.data.technologies.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        github_url: parsed.data.github_url || null,
        user_id: auth.user.id,
      };
      const res = editing
        ? await supabase.from("projects").update(payload).eq("id", editing)
        : await supabase.from("projects").insert(payload);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      toast.success(editing ? "Project updated" : "Project added");
      reset();
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Project deleted");
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">Projects</CardTitle>
        <CardDescription>Add the work you want recruiters to ask about.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            upsert.mutate();
          }}
        >
          <Input
            placeholder="Project title"
            value={form.title}
            maxLength={120}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            placeholder="Technologies (comma separated)"
            value={form.technologies}
            maxLength={300}
            onChange={(e) => setForm({ ...form, technologies: e.target.value })}
          />
          <Textarea
            placeholder="Short description"
            className="sm:col-span-2"
            value={form.description}
            maxLength={1000}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            placeholder="GitHub URL (optional)"
            value={form.github_url}
            maxLength={300}
            onChange={(e) => setForm({ ...form, github_url: e.target.value })}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={upsert.isPending}>
              <Plus className="size-4" /> {editing ? "Update" : "Add project"}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" onClick={reset}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        {loading ? (
          <Loading label="Loading projects..." />
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <div key={project.id} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-sm">{project.title}</h3>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit project"
                      onClick={() => {
                        setEditing(project.id);
                        setForm({
                          title: project.title,
                          description: project.description,
                          technologies: project.technologies.join(", "),
                          github_url: project.github_url ?? "",
                        });
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete project"
                      onClick={() => remove.mutate(project.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {project.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                ) : null}
                {project.technologies.length ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {project.technologies.map((tech) => (
                      <span key={tech} className="rounded-full bg-secondary px-2 py-0.5 text-xs">
                        {tech}
                      </span>
                    ))}
                  </div>
                ) : null}
                {project.github_url ? (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Github className="size-3.5" /> Repository
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CertificationsSection({
  certifications,
  loading,
}: {
  certifications: Certification[];
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", issuer: "", year: "" });

  const reset = () => {
    setEditing(null);
    setForm({ name: "", issuer: "", year: "" });
  };

  const upsert = useMutation({
    mutationFn: async () => {
      const parsed = certSchema.safeParse(form);
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const payload = {
        name: parsed.data.name,
        issuer: parsed.data.issuer,
        year: parsed.data.year === "" ? null : parsed.data.year,
        user_id: auth.user.id,
      };
      const res = editing
        ? await supabase.from("certifications").update(payload).eq("id", editing)
        : await supabase.from("certifications").insert(payload);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      toast.success(editing ? "Certification updated" : "Certification added");
      reset();
      queryClient.invalidateQueries({ queryKey: ["certifications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("certifications").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Certification deleted");
      queryClient.invalidateQueries({ queryKey: ["certifications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-base">Certifications</CardTitle>
        <CardDescription>Courses and certifications you have completed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          className="grid gap-3 sm:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault();
            upsert.mutate();
          }}
        >
          <Input
            placeholder="Certification name"
            value={form.name}
            maxLength={150}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            placeholder="Issuer"
            value={form.issuer}
            maxLength={150}
            onChange={(e) => setForm({ ...form, issuer: e.target.value })}
          />
          <Input
            placeholder="Year"
            inputMode="numeric"
            value={form.year}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={upsert.isPending}>
              <Plus className="size-4" /> {editing ? "Update" : "Add"}
            </Button>
            {editing ? (
              <Button type="button" variant="ghost" onClick={reset}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        {loading ? (
          <Loading label="Loading certifications..." />
        ) : certifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No certifications yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {certifications.map((cert) => (
              <div key={cert.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{cert.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[cert.issuer, cert.year].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit certification"
                    onClick={() => {
                      setEditing(cert.id);
                      setForm({
                        name: cert.name,
                        issuer: cert.issuer,
                        year: cert.year ? String(cert.year) : "",
                      });
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete certification"
                    onClick={() => remove.mutate(cert.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
