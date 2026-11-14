export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export function inPeriod(date, period, now = today()) {
  if (date > now) return false;
  if (period === "All time") return true;
  const d = new Date(now + "T12:00:00");
  if (period === "Week") {
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
  } else if (period === "Month") d.setDate(1);
  else if (period === "Year") {
    d.setMonth(0, 1);
  }
  const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return date >= start;
}
export const sum = (items, key) =>
  items.reduce((s, i) => s + (Number(i[key]) || 0), 0);
export const volume = (w) =>
  (w.exercises || []).reduce((s, e) => s + e.sets * e.reps * e.weight, 0);
export const estimated1RM = (e) =>
  e.reps > 0 && e.reps <= 12 && e.weight > 0
    ? Math.round(e.weight * (1 + e.reps / 30))
    : null;
export const prettyDate = (d) =>
  new Date(d + "T12:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
export function makeProgram(type, minutes = 15) {
  const list =
    type === "Mobility"
      ? [
          ["90/90 hip switches", 2, 8],
          ["Thoracic rotations", 2, 8],
          ["Ankle rocks", 2, 10],
          ["Controlled shoulder circles", 2, 6],
        ]
      : type === "Yoga"
        ? [
            ["Cat-cow", 2, 8],
            ["Low lunge flow", 2, 6],
            ["Child’s pose breathing", 3, 5],
          ]
        : type === "Pilates"
          ? [
              ["Dead bug", 3, 8],
              ["Glute bridge", 3, 12],
              ["Side-lying leg lift", 2, 10],
            ]
          : type === "Kettlebell"
            ? [
                ["Kettlebell deadlift", 3, 8],
                ["Goblet squat", 3, 8],
                ["Suitcase carry (steps)", 3, 20],
              ]
            : type === "Cardio"
              ? [["Easy aerobic intervals (minutes)", 3, 5]]
              : [
                  ["Squat", 3, 5],
                  ["Bench press", 3, 5],
                  ["Row", 3, 8],
                  ["Romanian deadlift", 3, 8],
                ];
  return {
    title: `${minutes}-minute ${type.toLowerCase()} template`,
    date: today(),
    type,
    status: "Template",
    duration: minutes,
    notes:
      "Editable starter template. Adjust exercises, loading and rest to your experience.",
    favorite: true,
    exercises: list.map(([name, sets, reps]) => ({
      name,
      sets,
      reps,
      weight: 0,
      rpe: 6,
      rest: 60,
    })),
  };
}
export const defaultProfile = {
  name: "Athlete",
  academy: "",
  belt: "Purple",
  beltDate: "",
  weeklyGoal: 3,
  waterGoal: 2500,
  calorieGoal: 2400,
  proteinGoal: 150,
  weight: 0,
  height: 0,
  age: 0,
  equation: "Male",
  notes: "",
};
export const catalog = [
  ["Armbar", "Closed guard", "Submission", "Both"],
  ["Triangle choke", "Closed guard", "Submission", "Both"],
  ["Kimura", "Closed guard", "Submission", "Both"],
  ["Hip bump sweep", "Closed guard", "Sweep", "Both"],
  ["Scissor sweep", "Closed guard", "Sweep", "Gi"],
  ["Knee slice pass", "Half guard", "Pass", "Both"],
  ["Underhook sweep", "Half guard", "Sweep", "Both"],
  ["Butterfly sweep", "Open guard", "Sweep", "Both"],
  ["Toreando pass", "Open guard", "Pass", "Gi"],
  ["Rear naked choke", "Back", "Submission", "No-Gi"],
  ["Bow and arrow choke", "Back", "Submission", "Gi"],
  ["Back escape", "Back", "Escape", "Both"],
  ["Elbow-knee escape", "Mount", "Escape", "Both"],
  ["Cross collar choke", "Mount", "Submission", "Gi"],
  ["Arm triangle", "Side control", "Submission", "Both"],
  ["Side control escape", "Side control", "Escape", "Both"],
  ["Single leg takedown", "Standing", "Takedown", "Both"],
  ["Double leg takedown", "Standing", "Takedown", "Both"],
  ["Technical stand-up", "Open guard", "Transition", "Both"],
  ["Clock choke", "Turtle", "Submission", "Gi"],
  ["Baseball bat choke", "Knee on belly", "Submission", "Gi"],
].map(([title, position, category, mode], i) => ({
  id: `catalog-${i}`,
  title,
  position,
  category,
  mode,
  url: "",
  notes: "",
  mistakes: "",
  details: "",
  difficulty: "Moderate",
  understanding: "Learning",
  favorite: false,
  media: [],
}));
export const scenarios = [
  {
    position: "Side control · top",
    prompt:
      "Your opponent has strong frames at your neck and hip. Before advancing, what is your priority?",
    choices: [
      "Jump straight to an armbar",
      "Address the frames and establish control",
      "Give up top position",
    ],
    answer: 1,
    explanation:
      "For this scenario, controlling the frames gives you a more stable base for a transition. Other responses can work depending on timing and grips.",
  },
  {
    position: "Closed guard · bottom",
    prompt:
      "Your opponent is upright with elbows tucked. What creates an attacking opportunity?",
    choices: [
      "Break posture and create an angle",
      "Squeeze a triangle without isolating an arm",
      "Open your guard without a plan",
    ],
    answer: 0,
    explanation:
      "Posture and angle are useful setup priorities here. This quiz practices decisions; it does not predict live sparring success.",
  },
  {
    position: "Mount · bottom",
    prompt:
      "Your opponent posts a hand while you bridge. What should you look to control for a trap-and-roll escape?",
    choices: [
      "Their far ankle only",
      "Nothing: bridge harder",
      "A posting arm and the same-side leg",
    ],
    answer: 2,
    explanation:
      "Removing posts on one side helps create a path for the escape. Practice the details with your instructor.",
  },
];
