export type JobRole = {
  name: string;
  summary: string;
  requiredSkills: string[];
};

export const JOB_ROLES: JobRole[] = [
  {
    name: "Java Full Stack Developer",
    summary: "Enterprise backends with Spring Boot plus a modern React frontend.",
    requiredSkills: [
      "Java",
      "Spring Boot",
      "React",
      "JavaScript",
      "SQL",
      "MongoDB",
      "REST API",
      "Git",
      "Docker",
    ],
  },
  {
    name: "Frontend Developer",
    summary: "Building accessible, responsive product interfaces.",
    requiredSkills: [
      "HTML",
      "CSS",
      "JavaScript",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Git",
      "REST API",
    ],
  },
  {
    name: "Backend Developer",
    summary: "APIs, data modelling and server-side performance.",
    requiredSkills: [
      "Node.js",
      "Express",
      "SQL",
      "MongoDB",
      "REST API",
      "Git",
      "Docker",
      "Data Structures",
    ],
  },
  {
    name: "MERN Stack Developer",
    summary: "End-to-end JavaScript products with MongoDB, Express, React and Node.",
    requiredSkills: [
      "MongoDB",
      "Express",
      "React",
      "Node.js",
      "JavaScript",
      "HTML",
      "CSS",
      "Git",
      "REST API",
    ],
  },
  {
    name: "Data Analyst",
    summary: "Turning raw data into decisions with SQL, Python and dashboards.",
    requiredSkills: ["SQL", "Excel", "Python", "Pandas", "Statistics", "Power BI", "Data Visualization"],
  },
  {
    name: "Software Engineer",
    summary: "Generalist engineering role with strong fundamentals.",
    requiredSkills: [
      "Data Structures",
      "Algorithms",
      "OOP",
      "SQL",
      "Git",
      "Operating Systems",
      "Java",
      "Problem Solving",
    ],
  },
];

export const SKILL_SUGGESTIONS = Array.from(
  new Set(JOB_ROLES.flatMap((role) => role.requiredSkills)),
).sort();

export const QUIZ_CATEGORIES = ["Aptitude", "Java", "DBMS", "SQL", "DSA"] as const;
export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\s._-]+/g, "")
    .replace(/js$/, "javascript")
    .trim();

const ALIASES: Record<string, string[]> = {
  javascript: ["js", "es6"],
  "node.js": ["node", "nodejs"],
  "spring boot": ["spring", "springboot"],
  "rest api": ["rest", "restful api", "api"],
  "tailwind css": ["tailwind"],
  "data structures": ["ds", "dsa"],
  algorithms: ["algo", "dsa"],
  "power bi": ["powerbi"],
};

function matches(studentSkill: string, requiredSkill: string) {
  const a = normalize(studentSkill);
  const b = normalize(requiredSkill);
  if (a === b) return true;
  const aliases = ALIASES[requiredSkill.toLowerCase()] ?? [];
  return aliases.some((alias) => normalize(alias) === a);
}

export type SkillGapResult = {
  role: string;
  matched: string[];
  missing: string[];
  extra: string[];
  matchPercentage: number;
};

/**
 * Deterministic rule-based comparison (not AI): counts how many of the role's
 * required skills the student already has.
 */
export function analyzeSkillGap(studentSkills: string[], roleName: string | null): SkillGapResult | null {
  const role = JOB_ROLES.find((r) => r.name === roleName);
  if (!role) return null;

  const matched = role.requiredSkills.filter((required) =>
    studentSkills.some((owned) => matches(owned, required)),
  );
  const missing = role.requiredSkills.filter((required) => !matched.includes(required));
  const extra = studentSkills.filter(
    (owned) => !role.requiredSkills.some((required) => matches(owned, required)),
  );

  return {
    role: role.name,
    matched,
    missing,
    extra,
    matchPercentage: Math.round((matched.length / role.requiredSkills.length) * 100),
  };
}
