import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/Loading";
import { ProgressBar } from "@/components/ProgressBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { fetchQuizQuestions, type QuizQuestion } from "@/lib/queries";
import { DIFFICULTIES, QUIZ_CATEGORIES } from "@/lib/jobRoles";

export const Route = createFileRoute("/_authenticated/quiz")({
  head: () => ({
    meta: [
      { title: "Placement Quiz — SmartCampus" },
      {
        name: "description",
        content: "Timed placement MCQs across Aptitude, Java, DBMS, SQL and DSA with explanations.",
      },
      { property: "og:title", content: "Placement Quiz — SmartCampus" },
      { property: "og:description", content: "Practice placement MCQs and track your scores." },
    ],
  }),
  component: QuizPage,
});

type Phase = "setup" | "running" | "result";
const SECONDS_PER_QUESTION = 45;

function QuizPage() {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("setup");
  const [category, setCategory] = useState<string>(QUIZ_CATEGORIES[0]);
  const [difficulty, setDifficulty] = useState<string>("All");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const score = useMemo(
    () => questions.reduce((sum, q, i) => (answers[i] === q.correct_answer ? sum + 1 : sum), 0),
    [questions, answers],
  );

  const submitQuiz = useCallback(async () => {
    if (questions.length === 0 || saving) return;
    setSaving(true);
    const correct = questions.reduce(
      (sum, q, i) => (answers[i] === q.correct_answer ? sum + 1 : sum),
      0,
    );
    const percentage = Math.round((correct / questions.length) * 100);
    setPhase("result");

    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { error } = await supabase.from("quiz_results").insert({
        user_id: auth.user.id,
        category,
        score: correct,
        total_questions: questions.length,
        percentage,
        answers: questions.map((q, i) => ({
          question_id: q.id,
          selected: answers[i] ?? null,
          correct: q.correct_answer,
        })),
      });
      if (error) {
        toast.error("Score could not be saved: " + error.message);
      } else {
        queryClient.invalidateQueries({ queryKey: ["quiz-results"] });
        toast.success("Result saved");
      }
    }
    setSaving(false);
  }, [answers, category, questions, queryClient, saving]);

  useEffect(() => {
    if (phase !== "running") return;
    if (timeLeft <= 0) {
      void submitQuiz();
      return;
    }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [phase, timeLeft, submitQuiz]);

  async function startQuiz() {
    setLoading(true);
    try {
      const rows = await fetchQuizQuestions(category, difficulty, 10);
      if (rows.length === 0) {
        toast.error("No questions available for this selection yet.");
        return;
      }
      setQuestions(rows);
      setAnswers(Array.from({ length: rows.length }, () => null));
      setCurrent(0);
      setTimeLeft(rows.length * SECONDS_PER_QUESTION);
      setPhase("running");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load questions.");
    } finally {
      setLoading(false);
    }
  }

  if (phase === "setup") {
    return (
      <AppShell title="Placement Quiz" description="10 questions per attempt, 45 seconds each.">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="font-display text-base">Start a new quiz</CardTitle>
            <CardDescription>Choose a category and difficulty level.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Category</p>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUIZ_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Difficulty</p>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All levels</SelectItem>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={startQuiz} disabled={loading} className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Start quiz"}
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (phase === "running") {
    const question = questions[current];
    if (!question) {
      return (
        <AppShell title="Placement Quiz">
          <EmptyState title="Question unavailable" description="Please restart the quiz." />
        </AppShell>
      );
    }
    const minutes = Math.floor(timeLeft / 60);
    const seconds = String(timeLeft % 60).padStart(2, "0");

    return (
      <AppShell title={`${category} Quiz`} description={`Question ${current + 1} of ${questions.length}`}>
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="flex items-center justify-between">
            <ProgressBar value={((current + 1) / questions.length) * 100} className="w-2/3" />
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                timeLeft < 30 ? "bg-destructive/10 text-destructive" : "bg-secondary"
              }`}
            >
              <Clock className="size-4" />
              {minutes}:{seconds}
            </span>
          </div>

          <Card>
            <CardContent className="space-y-4 p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {question.category} · {question.difficulty}
              </p>
              <p className="font-display text-lg leading-snug">{question.question}</p>
              <div className="space-y-2">
                {question.options.map((option, index) => {
                  const selected = answers[current] === index;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        setAnswers((prev) => prev.map((a, i) => (i === current ? index : a)))
                      }
                      className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 font-medium text-primary"
                          : "border-border hover:border-primary/40 hover:bg-secondary"
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              disabled={current === 0}
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            >
              Previous
            </Button>
            {current === questions.length - 1 ? (
              <Button onClick={submitQuiz} disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : "Submit quiz"}
              </Button>
            ) : (
              <Button onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>
                Next
              </Button>
            )}
          </div>
        </div>
      </AppShell>
    );
  }

  const percentage = Math.round((score / questions.length) * 100);

  return (
    <AppShell title="Quiz Result" description={`${category} · ${questions.length} questions`}>
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="shadow-card">
          <CardContent className="space-y-3 p-6 text-center">
            <p className="font-display text-5xl text-primary">{percentage}%</p>
            <p className="text-sm text-muted-foreground">
              You answered {score} of {questions.length} correctly.
            </p>
            <ProgressBar value={percentage} />
            <div className="flex justify-center gap-2 pt-2">
              <Button onClick={() => setPhase("setup")}>Take another quiz</Button>
              <Button asChild variant="outline">
                <Link to="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {questions.map((question, index) => {
          const selected = answers[index];
          const correct = selected === question.correct_answer;
          return (
            <Card key={question.id}>
              <CardContent className="space-y-2 p-5">
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 rounded-full p-1 ${
                      correct ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {correct ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                  </span>
                  <p className="text-sm font-medium">
                    {index + 1}. {question.question}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your answer:{" "}
                  {selected === null || selected === undefined
                    ? "Not answered"
                    : question.options[selected]}
                </p>
                <p className="text-sm">
                  Correct answer:{" "}
                  <span className="font-medium">{question.options[question.correct_answer]}</span>
                </p>
                <p className="rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
                  {question.explanation}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
