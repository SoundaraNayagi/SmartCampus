

export type InterviewQuestion = { question: string; guidance: string };
export type InterviewPack = {
  questions: InterviewQuestion[];
  revisionTopics: string[];
  source: "ai" | "fallback";
  note?: string | undefined;
};

export function fallbackPack(role: string, difficulty: string, count: number): InterviewPack {
  const base: InterviewQuestion[] = [
    {
      question: `Walk me through a project where you used the core stack for a ${role}.`,
      guidance: "State the problem, your role, the stack choice and one measurable outcome.",
    },
    {
      question: "How do you decide between an array, a hash map and a tree for a lookup problem?",
      guidance: "Compare time/space complexity and mention a concrete example for each.",
    },
    {
      question: "Explain how you would design a REST API for a student records module.",
      guidance: "Cover resources, verbs, status codes, validation, pagination and auth.",
    },
    {
      question: "What is the difference between SQL joins, and when would you use a LEFT JOIN?",
      guidance: "Define INNER vs LEFT/RIGHT/FULL and give a reporting example needing NULLs.",
    },
    {
      question: "How do you debug a slow page or query in production?",
      guidance: "Mention measuring first, logs/metrics, N+1 queries, indexes and caching.",
    },
    {
      question: "Describe how authentication and authorization differ in an app you built.",
      guidance: "Explain identity vs permission, token handling and server-side checks.",
    },
    {
      question: "Tell me about a bug that taught you something.",
      guidance: "Use STAR: situation, task, action, result, plus the lesson applied since.",
    },
    {
      question: "How do you keep code maintainable when working in a team?",
      guidance: "Talk about modules, naming, reviews, tests and small pull requests.",
    },
    {
      question: "What happens between typing a URL and seeing a rendered page?",
      guidance: "DNS, TCP/TLS, HTTP request, server render/API, HTML/CSS/JS, paint.",
    },
    {
      question: `Which skill would you improve next for a ${role} role, and how?`,
      guidance: "Name one gap, a concrete learning plan and a project to prove it.",
    },
  ];

  return {
    questions: base.slice(0, count),
    revisionTopics: [
      "Data structures and complexity",
      "OOP fundamentals",
      "SQL joins and normalisation",
      "REST API design",
      "Project deep-dive storytelling",
    ],
    source: "fallback",
    note: `Showing a curated ${difficulty.toLowerCase()} practice set because the AI service is unavailable right now.`,
  };
}

