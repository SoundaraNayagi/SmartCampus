import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  name: string;
  email: string;
  college: string;
  degree: string;
  graduation_year: number | null;
  skills: string[];
  target_role: string | null;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  github_url: string | null;
};

export type Certification = {
  id: string;
  name: string;
  issuer: string;
  year: number | null;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  category: string;
  difficulty: string;
  explanation: string;
};

export type QuizResult = {
  id: string;
  category: string;
  score: number;
  total_questions: number;
  percentage: number;
  created_at: string;
};

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("No data returned");
  return data;
}

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async (): Promise<Profile> => {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error("Not signed in");

    const existing = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) return existing.data as Profile;

    const created = await supabase
      .from("profiles")
      .insert({ id: userId, email: auth.user?.email ?? "" })
      .select("*")
      .single();
    return unwrap(created) as Profile;
  },
});

export const projectsQuery = queryOptions({
  queryKey: ["projects"],
  queryFn: async (): Promise<Project[]> => {
    const res = await supabase
      .from("projects")
      .select("id,title,description,technologies,github_url")
      .order("created_at", { ascending: false });
    return unwrap(res) as Project[];
  },
});

export const certificationsQuery = queryOptions({
  queryKey: ["certifications"],
  queryFn: async (): Promise<Certification[]> => {
    const res = await supabase
      .from("certifications")
      .select("id,name,issuer,year")
      .order("created_at", { ascending: false });
    return unwrap(res) as Certification[];
  },
});

export const quizResultsQuery = queryOptions({
  queryKey: ["quiz-results"],
  queryFn: async (): Promise<QuizResult[]> => {
    const res = await supabase
      .from("quiz_results")
      .select("id,category,score,total_questions,percentage,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    return unwrap(res) as QuizResult[];
  },
});

export async function fetchQuizQuestions(category: string, difficulty: string, limit = 10) {
  let query = supabase
    .from("quiz_questions")
    .select("id,question,options,correct_answer,category,difficulty,explanation")
    .eq("category", category);

  if (difficulty !== "All") query = query.eq("difficulty", difficulty);

  const res = await query.limit(50);
  const rows = unwrap(res) as QuizQuestion[];
  return [...rows].sort(() => Math.random() - 0.5).slice(0, limit);
}
