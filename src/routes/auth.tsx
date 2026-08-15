import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const searchSchema = z.object({
  mode: z.enum(["login", "register"]).catch("login"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in or register — SmartCampus" },
      {
        name: "description",
        content: "Create your SmartCampus account to track skills, quizzes and placement readiness.",
      },
      { property: "og:title", content: "Sign in to SmartCampus" },
      {
        property: "og:description",
        content: "Secure student login for skill-gap analysis and placement practice.",
      },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const registerSchema = loginSchema.extend({
  name: z.string().trim().min(2, "Enter your full name").max(100),
  college: z.string().trim().min(2, "Enter your college").max(150),
  degree: z.string().trim().min(2, "Enter your degree").max(100),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && user) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, user, navigate]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("invalid")
          ? "Invalid email or password."
          : error.message,
      );
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = registerSchema.safeParse({
      name: form.get("name"),
      email: form.get("email"),
      password: form.get("password"),
      college: form.get("college"),
      degree: form.get("degree"),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          name: parsed.data.name,
          college: parsed.data.college,
          degree: parsed.data.degree,
        },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("already")
          ? "That email is already registered. Try logging in."
          : error.message,
      );
      return;
    }
    if (!data.session) {
      toast.success("Account created. Check your email to confirm your address.");
      navigate({ to: "/auth", search: { mode: "login" } });
      return;
    }
    toast.success("Account created!");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="rounded-lg bg-hero-gradient p-1.5 text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-display text-lg">SmartCampus</span>
        </Link>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-xl">Student access</CardTitle>
            <CardDescription>Log in or create your placement readiness account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={mode}
              onValueChange={(value) =>
                navigate({ to: "/auth", search: { mode: value as "login" | "register" } })
              }
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-5">
                <form onSubmit={handleLogin} className="space-y-4" noValidate>
                  <Field label="Email" name="email" type="email" error={errors["email"]} />
                  <Field label="Password" name="password" type="password" error={errors["password"]} />
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : "Login"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="mt-5">
                <form onSubmit={handleRegister} className="space-y-4" noValidate>
                  <Field label="Full name" name="name" error={errors["name"]} />
                  <Field label="Email" name="email" type="email" error={errors["email"]} />
                  <Field label="Password" name="password" type="password" error={errors["password"]} />
                  <Field label="College" name="college" error={errors["college"]} />
                  <Field label="Degree" name="degree" error={errors["degree"]} />
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function fieldErrors(error: z.ZodError) {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

function Field({
  label,
  name,
  type = "text",
  error,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={`${name}-${type}`}>{label}</Label>
      <Input id={`${name}-${type}`} name={name} type={type} autoComplete="on" />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
