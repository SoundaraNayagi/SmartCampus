import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fallbackPack, type InterviewPack } from "@/lib/interview-types";

const inputSchema = z.object({
  role: z.string().trim().min(2).max(120),
  skills: z.array(z.string().trim().min(1).max(50)).max(40),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  count: z.number().int().min(3).max(10),
});

export const generateInterviewPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<InterviewPack> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return fallbackPack(data.role, data.difficulty, data.count);
    }

    const prompt = [
      `Generate ${data.count} ${data.difficulty.toLowerCase()}-level technical interview questions`,
      `for a campus candidate targeting the role "${data.role}".`,
      data.skills.length ? `Candidate skills: ${data.skills.join(", ")}.` : "",
      "For each question add short expected-answer guidance (max 2 sentences).",
      "Also return 5 revision topics.",
      'Respond ONLY with JSON: {"questions":[{"question":"...","guidance":"..."}],"revisionTopics":["..."]}',
    ]
      .filter(Boolean)
      .join(" ");

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "You are an experienced campus placement interviewer. Answer with strict JSON only.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const pack = fallbackPack(data.role, data.difficulty, data.count);
        pack.note =
          status === 429
            ? "AI rate limit reached — showing a curated practice set instead."
            : status === 402
              ? "AI credits exhausted — showing a curated practice set instead."
              : pack.note;
        return pack;
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = payload.choices?.[0]?.message?.content ?? "";
      const jsonText = content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1);
      const parsed = JSON.parse(jsonText) as {
        questions?: { question?: string; guidance?: string }[];
        revisionTopics?: string[];
      };

      const questions = (parsed.questions ?? [])
        .filter((q) => typeof q.question === "string" && q.question.trim().length > 0)
        .slice(0, data.count)
        .map((q) => ({
          question: String(q.question),
          guidance: String(q.guidance ?? "Structure your answer with an example."),
        }));

      if (questions.length === 0) return fallbackPack(data.role, data.difficulty, data.count);

      return {
        questions,
        revisionTopics: (parsed.revisionTopics ?? []).slice(0, 8).map(String),
        source: "ai",
      };
    } catch (error) {
      console.error("AI interview generation failed", error);
      return fallbackPack(data.role, data.difficulty, data.count);
    }
  });
