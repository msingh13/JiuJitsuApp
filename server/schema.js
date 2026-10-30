import { z } from "zod";
const text = z.string().trim().max(10000);
const title = z.string().trim().min(1).max(200);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Use a valid date",
  );
const number = (max = 100000) => z.number().finite().min(0).max(max);
const url = z.union([
  z.literal(""),
  z.url().refine((v) => /^https?:\/\//.test(v), "Use an http or https link"),
]);
const base = { date, notes: text.default("") };
export const schemas = {
  sessions: z
    .object({
      ...base,
      title,
      kind: z.enum(["Gi", "No-Gi", "Open mat"]),
      program: text.default(""),
      duration: number(1440).min(1),
      rolling: number(1440),
      rating: z.number().int().min(1).max(5),
      focus: text.default(""),
      moves: text.default(""),
      media: z.array(z.string().uuid()).max(30).default([]),
      mediaLabels: z
        .record(z.string().uuid(), z.string().trim().max(200))
        .default({}),
    })
    .refine(
      (v) => v.rolling <= v.duration,
      "Rolling time cannot exceed class duration",
    ),
  techniques: z.object({
    title,
    position: title,
    category: title,
    mode: z.enum(["Gi", "No-Gi", "Both"]),
    url: url.default(""),
    notes: text.default(""),
    mistakes: text.default(""),
    details: text.default(""),
    difficulty: z.enum(["Easy", "Moderate", "Hard"]).default("Moderate"),
    understanding: z
      .enum(["Learning", "Understood", "Practiced"])
      .default("Learning"),
    favorite: z.boolean().default(false),
    media: z.array(z.string().uuid()).max(30).default([]),
  }),
  workouts: z.object({
    ...base,
    title,
    type: z.enum([
      "Strength",
      "Cardio",
      "Kettlebell",
      "Mobility",
      "Yoga",
      "Pilates",
    ]),
    duration: number(1440).min(1),
    status: z.enum(["Completed", "Template"]).default("Completed"),
    exercises: z
      .array(
        z.object({
          name: title,
          sets: number(100).int(),
          reps: number(1000).int(),
          weight: number(2000),
          rpe: number(10),
          rest: number(3600),
        }),
      )
      .max(100)
      .default([]),
    favorite: z.boolean().default(false),
  }),
  meals: z.object({
    ...base,
    title,
    meal: z.enum(["Breakfast", "Lunch", "Dinner", "Snack"]),
    calories: number(20000),
    protein: number(2000),
    carbs: number(2000),
    fat: number(2000),
    fiber: number(1000),
    saturated: number(1000),
    sodium: number(100000),
  }),
  water: z.object({ date, amount: number(10000).min(1) }),
  body: z.object({
    ...base,
    weight: number(500).min(1),
    fat: number(100),
    muscle: number(500),
    visceral: number(100),
  }),
  matches: z.object({
    ...base,
    title,
    opponent: text,
    division: text,
    result: z.enum(["Win", "Loss", "Draw"]),
    method: title,
    pointsFor: number(1000).int(),
    pointsAgainst: number(1000).int(),
    url: url.default(""),
  }),
  partners: z.object({ title, belt: text, style: text, notes: text }),
  places: z.object({
    title,
    address: text,
    schedule: text,
    url: url.default(""),
    notes: text,
  }),
  plans: z.object({
    title,
    style: title,
    notes: text,
    nodes: z
      .array(z.object({ id: title, label: title, parent: text }))
      .max(200),
  }),
  schedule: z.object({
    title,
    day: z.number().int().min(0).max(6),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    kind: title,
    focus: text,
    notes: text,
  }),
  vlogs: z.object({
    ...base,
    title,
    caption: text,
    media: z.array(z.string().uuid()).max(10).default([]),
  }),
  profile: z.object({
    name: title,
    academy: text,
    belt: title,
    beltDate: z.union([z.literal(""), date]),
    weeklyGoal: number(21).min(1),
    waterGoal: number(10000).min(250),
    calorieGoal: number(10000).min(500),
    proteinGoal: number(500),
    weight: number(500),
    height: number(300),
    age: number(120),
    equation: z.enum(["Male", "Female"]),
    notes: text,
  }),
};
