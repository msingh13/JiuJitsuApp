import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Droplets,
  Dumbbell,
  Flame,
  GitBranch,
  LayoutDashboard,
  MapPin,
  Menu,
  Mic,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Star,
  Target,
  Timer,
  Trash2,
  Trophy,
  Users,
  Video,
  Weight,
  X,
  CheckCircle2,
  ExternalLink,
  Upload,
  Volume2,
} from "lucide-react";
import {
  today,
  inPeriod,
  sum,
  volume,
  estimated1RM,
  prettyDate,
  makeProgram,
  defaultProfile,
  catalog,
  scenarios,
} from "./domain";
import "./style.css";
import { request, browserEdition, mediaUrl, exportRecords } from "./storage";
import { protectStorage } from "./backup.js";
import DataSafety from "./DataSafety.jsx";
const nav = [
  ["Overview", LayoutDashboard],
  ["Mat journal", CalendarDays],
  ["Technique library", BookOpen],
  ["Game plan", GitBranch],
  ["Round timer", Timer],
  ["Workouts", Dumbbell],
  ["Nutrition", Flame],
  ["Body metrics", Activity],
  ["Competition", Trophy],
  ["Partners & places", Users],
  ["Training studio", Video],
];
const descriptions = {
  Overview: "A little intention. A better session.",
  "Mat journal": "Every session is part of the story.",
  "Technique library": "Build a library. Develop your own understanding.",
  "Game plan": "Connect positions into a game that feels like yours.",
  "Round timer": "Set the pace. Stay in the moment.",
  Workouts: "Strength off the mat. Confidence on it.",
  Nutrition: "Fuel your training, one day at a time.",
  "Body metrics": "Follow the trend, beyond a single number.",
  Competition: "Compete. Reflect. Come back better.",
  "Partners & places": "Good training starts with good people.",
  "Training studio": "Keep the moments. Tell your training story.",
  Settings: "Make this space your own.",
};
const field = (name, label, type = "text", options) => ({
  name,
  label,
  type,
  options,
});
const forms = {
  sessions: [
    field("title", "Session name"),
    field("date", "Date", "date"),
    field("kind", "Training type", "select", ["Gi", "No-Gi", "Open mat"]),
    field("program", "Program / class"),
    field("duration", "Class duration · minutes", "number"),
    field("rolling", "Rolling time · minutes", "number"),
    field("rating", "Session rating", "select", [1, 2, 3, 4, 5]),
    field("focus", "Technique focus"),
    field("notes", "What went well? What will you work on?", "textarea"),
  ],
  techniques: [
    field("title", "Technique name"),
    field("position", "Position", "select", [
      ...new Set(catalog.map((t) => t.position)),
    ]),
    field("category", "Category", "select", [
      "Submission",
      "Sweep",
      "Pass",
      "Escape",
      "Takedown",
      "Transition",
    ]),
    field("mode", "Uniform", "select", ["Both", "Gi", "No-Gi"]),
    field("url", "Instructional video link", "url"),
    field("understanding", "Understanding", "select", [
      "Learning",
      "Understood",
      "Practiced",
    ]),
    field("difficulty", "Difficulty", "select", ["Easy", "Moderate", "Hard"]),
    field("details", "Key details", "textarea"),
    field("mistakes", "Mistakes to work on", "textarea"),
    field("notes", "Personal notes", "textarea"),
  ],
  workouts: [
    field("title", "Workout name"),
    field("date", "Date", "date"),
    field("type", "Training type", "select", [
      "Strength",
      "Cardio",
      "Kettlebell",
      "Mobility",
      "Yoga",
      "Pilates",
    ]),
    field("status", "Record type", "select", ["Completed", "Template"]),
    field("duration", "Duration · minutes", "number"),
    field("notes", "Notes", "textarea"),
  ],
  meals: [
    field("title", "Food / meal name"),
    field("date", "Date", "date"),
    field("meal", "Meal", "select", ["Breakfast", "Lunch", "Dinner", "Snack"]),
    ...[
      "calories",
      "protein",
      "carbs",
      "fat",
      "fiber",
      "saturated",
      "sodium",
    ].map((n) =>
      field(
        n,
        n === "calories"
          ? "Calories · kcal"
          : n === "sodium"
            ? "Sodium · mg"
            : n[0].toUpperCase() + n.slice(1) + " · g",
        "number",
      ),
    ),
    field("notes", "Serving size and notes", "textarea"),
  ],
  body: [
    field("date", "Date", "date"),
    field("weight", "Body weight · kg", "number"),
    field("fat", "Body fat · %", "number"),
    field("muscle", "Muscle mass · kg", "number"),
    field("visceral", "Visceral fat rating", "number"),
    field("notes", "Measurement notes", "textarea"),
  ],
  matches: [
    field("title", "Event name"),
    field("date", "Date", "date"),
    field("opponent", "Opponent"),
    field("division", "Division / weight class"),
    field("result", "Result", "select", ["Win", "Loss", "Draw"]),
    field("method", "Result method"),
    field("pointsFor", "Your points", "number"),
    field("pointsAgainst", "Opponent points", "number"),
    field("url", "Match video link", "url"),
    field("notes", "Review: opportunities, lessons, next steps", "textarea"),
  ],
  partners: [
    field("title", "Partner name"),
    field("belt", "Belt"),
    field("style", "Style / favorite positions"),
    field("notes", "Private training notes", "textarea"),
  ],
  places: [
    field("title", "Academy / open mat name"),
    field("address", "Address"),
    field("schedule", "Open mat hours"),
    field("url", "Website", "url"),
    field("notes", "Visitor policy and notes", "textarea"),
  ],
  schedule: [
    field("title", "Class name"),
    field("day", "Day", "select", [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]),
    field("time", "Start time", "time"),
    field("kind", "Gi / No-Gi / program"),
    field("focus", "Instructor-confirmed focus"),
    field("notes", "Source and notes", "textarea"),
  ],
  vlogs: [
    field("title", "Journal title"),
    field("date", "Date", "date"),
    field("caption", "Caption", "textarea"),
    field("notes", "Private notes", "textarea"),
  ],
  profile: [
    field("name", "Your name"),
    field("academy", "Academy"),
    field("belt", "Belt", "select", [
      "White",
      "Blue",
      "Purple",
      "Brown",
      "Black",
    ]),
    field("beltDate", "Date awarded", "date"),
    field("weeklyGoal", "Weekly class goal", "number"),
    field("waterGoal", "Daily water goal · mL", "number"),
    field("calorieGoal", "Daily calorie goal · kcal", "number"),
    field("proteinGoal", "Daily protein goal · g", "number"),
    field("weight", "Body weight · kg", "number"),
    field("height", "Height · cm", "number"),
    field("age", "Age", "number"),
    field("equation", "BMR equation coefficient", "select", ["Male", "Female"]),
    field("notes", "Goals and preferences", "textarea"),
  ],
};
function initial(kind) {
  const out = {};
  for (const f of forms[kind] || [])
    out[f.name] =
      f.type === "date"
        ? today()
        : f.type === "number"
          ? 0
          : f.type === "select"
            ? f.options[0]
            : "";
  if (kind === "sessions")
    Object.assign(out, {
      title: "Jiu-jitsu practice",
      duration: 60,
      rolling: 20,
      rating: 4,
    });
  if (kind === "workouts")
    Object.assign(out, { duration: 45, exercises: [], favorite: false });
  if (kind === "techniques") Object.assign(out, { favorite: false, media: [] });
  if (kind === "vlogs") out.media = [];
  return out;
}
function App() {
  const [protection, setProtection] = useState("checking");
  const [data, setData] = useState(null),
    [page, setPage] = useState("Overview"),
    [modal, setModal] = useState(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [menu, setMenu] = useState(false),
    [period, setPeriod] = useState("Week"),
    [assistant, setAssistant] = useState(false);
  async function load() {
    try {
      setData(await request("/records"));
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
    if (browserEdition) protectStorage().then(setProtection);
    const refresh = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const profile = data?.profile[0] || defaultProfile;
  const go = (p) => {
    setPage(p);
    setMenu(false);
    window.scrollTo(0, 0);
  };
  async function save(kind, record) {
    const { id, ...body } = record;
    const saved = await request(
      "/records/" + kind + (id && !id.startsWith("catalog-") ? "/" + id : ""),
      {
        method: id && !id.startsWith("catalog-") ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    await load();
    setToast("Saved to your journal");
    return saved;
  }
  async function remove(kind, id) {
    try {
      await request("/records/" + kind + "/" + id, { method: "DELETE" });
      await load();
      setToast("Entry removed");
    } catch (e) {
      setToast(e.message);
    }
  }
  const edit = (kind, record) =>
    setModal({ kind, record: record || initial(kind) });
  const action = (label, onClick, Icon = Plus) => (
    <button className="button primary" onClick={onClick}>
      <Icon size={17} />
      {label}
    </button>
  );
  if (!data)
    return (
      <div className="loading">
        <img src={import.meta.env.BASE_URL + "icon.svg"} width="50" />
        <h1>Matcraft</h1>
        <p>{error || "Opening your training space…"}</p>
        {error && <button onClick={load}>Try again</button>}
      </div>
    );
  const latestBody = [...data.body].sort((a, b) =>
    b.date.localeCompare(a.date),
  )[0];
  const sessions = data.sessions.filter((s) => inPeriod(s.date, period));
  const cardList = (kind, emptyTitle, emptyText, render) =>
    data[kind].length ? (
      <div className="record-list">
        {data[kind].map((r) => (
          <article className="record" key={r.id}>
            {render(r)}
            <button className="text-button" onClick={() => edit(kind, r)}>
              Edit <ChevronRight size={14} />
            </button>
          </article>
        ))}
      </div>
    ) : (
      <Empty
        title={emptyTitle}
        text={emptyText}
        action={() => edit(kind)}
        label="Add your first entry"
      />
    );
  return (
    <div className="shell">
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("Overview");
          }}
        >
          <img src={import.meta.env.BASE_URL + "icon.svg"} />
          matcraft<span>®</span>
        </a>
        <div className="workspace-label">YOUR TRAINING SPACE</div>
        <nav>
          {nav.map(([name, Icon]) => (
            <button
              key={name}
              className={page === name ? "active" : ""}
              onClick={() => go(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Overview" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-label">
            <span /> Personal edition{" "}
            <small>
              {browserEdition
                ? "Saved in this browser"
                : "Saved on this computer"}
            </small>
          </div>
          <button className="profile" onClick={() => go("Settings")}>
            <span className="avatar">
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <b>{profile.name}</b>
              <small>{profile.belt} belt</small>
            </span>
            <Settings size={17} />
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <main>
        <header className="topbar">
          <div>
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(!menu)}
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              Your workspace <ChevronRight size={13} /> <b>{page}</b>
            </span>
          </div>
          <span className="date-label">
            {new Date().toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <button
            className="assistant-button"
            onClick={() => setAssistant(true)}
          >
            <Mic size={16} /> Quick assistant
          </button>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {page === "Overview"
                  ? "THE LONG GAME STARTS TODAY"
                  : "YOUR PRACTICE, YOUR PROGRESS"}
              </div>
              <h1>
                {page === "Overview"
                  ? `Let’s get better${profile.name === "Athlete" ? "" : ", " + profile.name.split(" ")[0]}.`
                  : page}
              </h1>
              <p>{descriptions[page]}</p>
            </div>
            {page === "Overview"
              ? action("Log a session", () => edit("sessions"))
              : page === "Mat journal"
                ? action("Log a session", () => edit("sessions"))
                : page === "Technique library"
                  ? action("Add technique", () => edit("techniques"))
                  : page === "Workouts"
                    ? action("Log workout", () => edit("workouts"))
                    : page === "Nutrition"
                      ? action("Log a meal", () => edit("meals"))
                      : page === "Body metrics"
                        ? action("Add measurement", () => edit("body"))
                        : page === "Competition"
                          ? action("Log a match", () => edit("matches"))
                          : page === "Training studio"
                            ? action("New journal", () => edit("vlogs"))
                            : null}
          </div>
          {page === "Overview" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="pill">
                    <span /> TRAIN WITH INTENTION
                  </span>
                  <h2>
                    Build your game.
                    <br />
                    One session at a time.
                  </h2>
                  <p>
                    Your mat time, your milestones, your next move.
                    <br className="desktop-break" /> Bring every part of your
                    training together.
                  </p>
                  <button
                    className="button lime"
                    onClick={() => go("Game plan")}
                  >
                    Find your focus <ArrowRight size={18} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit one" />
                  <div className="orbit two" />
                  <div className="orbit three" />
                  <span className="vertical-type">
                    CONSISTENCY / CURIOSITY / CRAFT
                  </span>
                  <div className="belt">
                    <i />
                    <i />
                  </div>
                  <div className="hero-caption">
                    <span>01 / THE PRACTICE</span>
                    <b>Always a student.</b>
                  </div>
                </div>
              </section>
              <div className="section-heading">
                <h2>Your week, in motion</h2>
                <Period value={period} onChange={setPeriod} />
              </div>
              <div className="stats">
                <Stat
                  icon={CalendarDays}
                  label="Classes attended"
                  value={sessions.length}
                  suffix="sessions"
                  detail={`${profile.weeklyGoal} classes / weekly goal`}
                />
                <Stat
                  icon={Timer}
                  label="Time on the mat"
                  value={(sum(sessions, "duration") / 60).toFixed(1)}
                  suffix="hours"
                  detail={`${sum(sessions, "rolling")} minutes rolling`}
                />
                <Stat
                  icon={Dumbbell}
                  label="Off-mat training"
                  value={
                    data.workouts.filter(
                      (s) =>
                        s.status !== "Template" && inPeriod(s.date, period),
                    ).length
                  }
                  suffix="workouts"
                  detail="Strength, cardio & mobility"
                />
                <Stat
                  icon={Target}
                  label="Practice library"
                  value={data.techniques.length}
                  suffix="techniques"
                  detail={`${data.techniques.filter((t) => t.favorite).length} saved favorites`}
                />
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="section-heading">
                    <h2>On the mat</h2>
                    <button
                      className="text-button"
                      onClick={() => go("Mat journal")}
                    >
                      View journal <ArrowRight size={15} />
                    </button>
                  </div>
                  <Calendar sessions={data.sessions} />
                  <div className="calendar-legend">
                    <span>
                      <i />
                      Training day
                    </span>
                    <span>Show up. It adds up.</span>
                  </div>
                  {data.sessions.slice(0, 2).map((s) => (
                    <div className="recent-session" key={s.id}>
                      <span className="icon-tile">
                        <BookOpen size={18} />
                      </span>
                      <div>
                        <b>{s.title}</b>
                        <small>
                          {prettyDate(s.date)} · {s.kind} · {s.duration} min
                        </small>
                      </div>
                      <span className="badge">{s.rating}/5</span>
                    </div>
                  ))}
                </section>
                <section className="panel focus-panel">
                  <span className="eyebrow">A SMALL STEP FOR TODAY</span>
                  <div className="focus-icon">
                    <GitBranch size={29} />
                  </div>
                  <h2>
                    What’s your
                    <br />
                    next connection?
                  </h2>
                  <p>
                    Pick a position. Add your favorite attack and a backup. A
                    clear plan gives your next session purpose.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => go("Game plan")}
                  >
                    Build your game plan <ArrowRight size={17} />
                  </button>
                  <div className="mini-flow">
                    <span>Position</span>
                    <ArrowRight size={15} />
                    <span>Control</span>
                    <ArrowRight size={15} />
                    <span>Finish</span>
                  </div>
                </section>
              </div>
              <div className="section-heading">
                <h2>Round out your practice</h2>
                <span className="muted">The work around the work</span>
              </div>
              <div className="quick-grid">
                {[
                  [
                    Dumbbell,
                    "Move with purpose",
                    "Build a workout or mobility routine.",
                    "Workouts",
                  ],
                  [
                    Droplets,
                    "Fuel the next round",
                    "Meals, macros and daily hydration.",
                    "Nutrition",
                  ],
                  [
                    Timer,
                    "Make every round count",
                    "Your timer and match scoreboard.",
                    "Round timer",
                  ],
                ].map(([Icon, title, text, p]) => (
                  <button
                    className="quick-card"
                    key={title}
                    onClick={() => go(p)}
                  >
                    <Icon size={24} />
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <ArrowRight size={19} />
                  </button>
                ))}
              </div>
            </>
          )}
          {page === "Mat journal" && (
            <>
              <div className="section-heading">
                <h2>Your training record</h2>
                <Period value={period} onChange={setPeriod} />
              </div>
              <div className="stats three">
                <Stat
                  icon={CalendarDays}
                  label="Attendance"
                  value={sessions.length}
                  suffix="classes"
                />
                <Stat
                  icon={Timer}
                  label="Total mat time"
                  value={(sum(sessions, "duration") / 60).toFixed(1)}
                  suffix="hours"
                />
                <Stat
                  icon={Activity}
                  label="Rolling time"
                  value={(sum(sessions, "rolling") / 60).toFixed(1)}
                  suffix="hours"
                />
              </div>
              <div className="panel">
                <Calendar sessions={data.sessions} />
              </div>
              <section className="panel">
                <h2>Sessions · {period.toLowerCase()}</h2>
                {sessions.length ? (
                  sessions.map((s) => (
                    <div className="record" key={s.id}>
                      <div>
                        <span className="badge">{s.kind}</span>
                        <h3>{s.title}</h3>
                        <p>
                          {prettyDate(s.date)} · {s.duration} min · {s.rolling}{" "}
                          min rolling · {"★".repeat(s.rating)}
                        </p>
                        <p>{s.focus}</p>
                        <p className="muted">{s.notes}</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => edit("sessions", s)}
                      >
                        Edit <ChevronRight size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <Empty
                    title="Your next chapter starts on the mat"
                    text="Log a class to start seeing your attendance and rolling time."
                    action={() => edit("sessions")}
                    label="Log a session"
                  />
                )}
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Academy schedule</h2>
                  {action("Add class", () => edit("schedule"))}
                </div>
                <p className="muted">
                  Your own schedule and instructor-confirmed focus. No academy
                  feed is connected.
                </p>
                {data.schedule.map((s) => (
                  <div className="record" key={s.id}>
                    <div>
                      <h3>{s.title}</h3>
                      <p>
                        {
                          [
                            "Sunday",
                            "Monday",
                            "Tuesday",
                            "Wednesday",
                            "Thursday",
                            "Friday",
                            "Saturday",
                          ][s.day]
                        }{" "}
                        · {s.time} · {s.kind}
                      </p>
                      <p>{s.focus}</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => edit("schedule", s)}
                    >
                      Edit
                    </button>
                  </div>
                ))}
              </section>
              <Notice
                title="Belt progress is personal"
                text={`Track attendance and your belt award date in Settings. Promotion decisions belong to your instructor; this edition does not predict a promotion date.`}
              />
            </>
          )}
          {page === "Technique library" && (
            <Library data={data} edit={edit} save={save} />
          )}
          {page === "Game plan" && (
            <Plans data={data} save={save} remove={remove} />
          )}
          <div hidden={page !== "Round timer"}>
            <RoundTimer />
          </div>
          {page === "Workouts" && (
            <>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Start from a training template</h2>
                    <p className="muted">
                      Editable starting points, ready to make your own.
                    </p>
                  </div>
                  <span className="badge">Templates · not AI generated</span>
                </div>
                <div className="template-grid">
                  {[
                    "Strength",
                    "Kettlebell",
                    "Cardio",
                    "Mobility",
                    "Yoga",
                    "Pilates",
                  ].map((t, i) => (
                    <button
                      className="template-card"
                      key={t}
                      onClick={() =>
                        edit("workouts", makeProgram(t, i < 3 ? 45 : 15))
                      }
                    >
                      <span className="template-num">0{i + 1}</span>
                      <h3>{t}</h3>
                      <p>
                        {i < 3
                          ? "Build power & capacity"
                          : "Move well & recover"}
                      </p>
                      <Plus size={18} />
                    </button>
                  ))}
                </div>
              </section>
              {cardList(
                "workouts",
                "Make room for the work off the mat",
                "Log a workout or personalize a template above.",
                (w) => (
                  <div>
                    <span className="badge">
                      {w.type} · {w.status || "Completed"}
                      {w.favorite ? " · Favorite" : ""}
                    </span>
                    <h3>{w.title}</h3>
                    <p>
                      {prettyDate(w.date)} · {w.duration} min ·{" "}
                      {volume(w).toLocaleString()} kg total volume
                    </p>
                    {w.exercises.map((e, i) => (
                      <p key={i}>
                        {e.name}: {e.sets} × {e.reps} at {e.weight} kg
                        {estimated1RM(e)
                          ? ` · estimated 1RM ${estimated1RM(e)} kg`
                          : ""}
                      </p>
                    ))}
                  </div>
                ),
              )}
              <section className="panel">
                <h2>Training volume</h2>
                <Bars
                  entries={data.workouts
                    .filter((w) => w.status !== "Template")
                    .map((w) => ({ date: w.date, value: volume(w) }))}
                  unit="kg"
                />
              </section>
            </>
          )}
          {page === "Nutrition" && (
            <Nutrition
              data={data}
              profile={profile}
              edit={edit}
              save={save}
              remove={remove}
            />
          )}
          {page === "Body metrics" && (
            <>
              <div className="stats three">
                <Stat
                  icon={Weight}
                  label="Latest body weight"
                  value={latestBody?.weight ?? "—"}
                  suffix="kg"
                />
                <Stat
                  icon={Activity}
                  label="Body fat"
                  value={latestBody?.fat ?? "—"}
                  suffix="%"
                />
                <Stat
                  icon={Target}
                  label="Measurements"
                  value={data.body.length}
                  suffix="entries"
                />
              </div>
              <section className="panel">
                <h2>Your weight trend</h2>
                <Bars
                  entries={data.body.map((b) => ({
                    date: b.date,
                    value: b.weight,
                  }))}
                  unit="kg"
                  aggregate="latest"
                />
              </section>
              {cardList(
                "body",
                "See your progress over time",
                "Add a measurement from your scale to begin.",
                (b) => (
                  <div>
                    <h3>
                      {b.weight} kg{" "}
                      <span className="muted">· {prettyDate(b.date)}</span>
                    </h3>
                    <p>
                      Body fat {b.fat}% · Muscle {b.muscle} kg · Visceral rating{" "}
                      {b.visceral}
                    </p>
                    <p>{b.notes}</p>
                  </div>
                ),
              )}
              <Notice
                title="Scale connection: not configured"
                text="Manual measurements work now. Apple Health, Android Health Connect and RENPHO require a native mobile integration; this web edition does not sync with them."
              />
            </>
          )}
          {page === "Competition" && (
            <>
              <div className="stats three">
                <Stat
                  icon={Trophy}
                  label="Matches recorded"
                  value={data.matches.length}
                />
                <Stat
                  icon={CheckCircle2}
                  label="Wins"
                  value={data.matches.filter((m) => m.result === "Win").length}
                />
                <Stat
                  icon={Target}
                  label="Win rate"
                  value={
                    data.matches.length
                      ? Math.round(
                          (data.matches.filter((m) => m.result === "Win")
                            .length /
                            data.matches.length) *
                            100,
                        )
                      : "—"
                  }
                  suffix="%"
                />
              </div>
              {cardList(
                "matches",
                "Bring the lessons home",
                "Record your matches, footage and reflections.",
                (m) => (
                  <div>
                    <span className="badge">
                      {m.result} · {m.method}
                    </span>
                    <h3>{m.title}</h3>
                    <p>
                      {prettyDate(m.date)} · vs. {m.opponent || "Unspecified"} ·{" "}
                      {m.pointsFor}–{m.pointsAgainst}
                    </p>
                    <p>{m.notes}</p>
                    {m.url && (
                      <a
                        className="text-button"
                        target="_blank"
                        rel="noreferrer"
                        href={m.url}
                      >
                        Watch match <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                ),
              )}
            </>
          )}
          {page === "Partners & places" && (
            <>
              <section className="panel">
                <div className="section-heading">
                  <h2>Training partners</h2>
                  {action("Add partner", () => edit("partners"))}
                </div>
                {cardList(
                  "partners",
                  "Better together",
                  "Keep private notes on the people you train with.",
                  (p) => (
                    <div>
                      <span className="badge">
                        {p.belt || "Training partner"}
                      </span>
                      <h3>{p.title}</h3>
                      <p>{p.style}</p>
                      <p>{p.notes}</p>
                    </div>
                  ),
                )}
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Places to roll</h2>
                  {action("Save a place", () => edit("places"))}
                </div>
                <p className="muted">
                  Your saved directory. Verify visitor policies and schedules
                  with each academy.
                </p>
                <a
                  className="text-button"
                  target="_blank"
                  rel="noreferrer"
                  href="https://www.google.com/maps/search/jiu+jitsu+open+mat/"
                >
                  Find academies on Google Maps <ExternalLink size={15} />
                </a>
                {cardList(
                  "places",
                  "Save your next open mat",
                  "Keep addresses, schedules and visitor notes in one place.",
                  (p) => (
                    <div>
                      <h3>{p.title}</h3>
                      <p>
                        {p.address} · {p.schedule}
                      </p>
                      <p>{p.notes}</p>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noreferrer">
                          Academy website ↗
                        </a>
                      )}
                    </div>
                  ),
                )}
              </section>
            </>
          )}
          {page === "Training studio" && (
            <>
              <Notice
                title="Your personal training journal"
                text="Attach class photos and videos, write captions, and share your text using your device’s share menu. Video editing, overlays and direct social publishing are not connected in this edition."
              />
              {cardList(
                "vlogs",
                "Keep a moment from your practice",
                "Create a journal entry and attach your own clips or photos.",
                (v) => (
                  <div className="vlog">
                    <span className="badge">{prettyDate(v.date)}</span>
                    <h3>{v.title}</h3>
                    <p className="prewrap">{v.caption}</p>
                    <Media ids={v.media} />
                    <button
                      className="button"
                      onClick={async () => {
                        try {
                          if (navigator.share)
                            await navigator.share({
                              title: v.title,
                              text: v.caption,
                            });
                          else {
                            await navigator.clipboard.writeText(v.caption);
                            setToast("Caption copied");
                          }
                        } catch (e) {
                          if (e.name !== "AbortError")
                            setToast(
                              "Sharing unavailable. Select and copy the caption above.",
                            );
                        }
                      }}
                    >
                      Share caption <ExternalLink size={15} />
                    </button>
                  </div>
                ),
              )}
            </>
          )}
          {page === "Settings" && (
            <>
              <section className="panel">
                <div className="section-heading">
                  <h2>Your athlete profile</h2>
                  {action(
                    "Edit profile",
                    () => edit("profile", profile),
                    Settings,
                  )}
                </div>
                <div className="profile-summary">
                  <span className="big-avatar">{profile.name[0]}</span>
                  <div>
                    <h2>{profile.name}</h2>
                    <p>
                      {profile.belt} belt ·{" "}
                      {profile.academy || "Add your academy"}
                    </p>
                    <p className="muted">
                      {profile.weeklyGoal} classes each week ·{" "}
                      {profile.calorieGoal} kcal daily target
                    </p>
                  </div>
                </div>
              </section>
              {browserEdition && (
                <DataSafety
                  protection={protection}
                  setProtection={setProtection}
                  reload={load}
                />
              )}
              <section className="panel">
                <h2>Your data stays with you</h2>
                <p>
                  {browserEdition
                    ? "You can also export a readable JSON copy of your records. For recovery, use the complete backup above instead."
                    : "Records and uploaded media are saved in this app’s local database on this computer. This edition is single-user and does not provide cloud sync or remote phone access."}
                </p>
                <button
                  className="button"
                  onClick={async () => {
                    try {
                      await exportRecords();
                    } catch (e) {
                      setToast(e.message);
                    }
                  }}
                >
                  <ArrowDownToLine size={17} /> Export records
                </button>
                <p className="muted small">
                  {browserEdition
                    ? "The JSON export includes records and media references, not the uploaded files. Keep originals of your photos and videos outside the browser."
                    : "The JSON export includes records and media references, not uploaded files. Back up the entire .data directory for a complete backup."}
                </p>
              </section>
              <section className="panel">
                <h2>Connections</h2>
                {[
                  "Cloud accounts & device sync",
                  "AI model & voice understanding",
                  "Academy curriculum feed",
                  "Health / RENPHO scale sync",
                  "Food barcode database",
                  "Social publishing",
                ].map((t) => (
                  <div className="record" key={t}>
                    <span>{t}</span>
                    <span className="badge">Not connected</span>
                  </div>
                ))}
              </section>
            </>
          )}
          <footer>
            MATCRAFT{" "}
            <span>Made for the practice. Built for the long game.</span>
            <span>Personal edition · v0.1</span>
          </footer>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {modal && (
        <Editor
          {...modal}
          close={() => setModal(null)}
          save={save}
          remove={remove}
        />
      )}{" "}
      {assistant && (
        <Assistant
          close={() => setAssistant(false)}
          edit={edit}
          go={go}
          notify={setToast}
        />
      )}
    </div>
  );
}
function Period({ value, onChange }) {
  return (
    <div className="segmented">
      {["Week", "Month", "Year", "All time"].map((p) => (
        <button
          className={value === p ? "selected" : ""}
          onClick={() => onChange(p)}
          key={p}
        >
          {p}
        </button>
      ))}
    </div>
  );
}
function Stat({ icon: Icon, label, value, suffix, detail }) {
  return (
    <div className="stat">
      <div className="stat-label">
        {label}
        <Icon size={17} />
      </div>
      <div className="stat-value">
        {value}
        <span>{suffix}</span>
      </div>
      {detail && <small>{detail}</small>}
    </div>
  );
}
function Empty({ title, text, action, label }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <BookOpen size={24} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="button" onClick={action}>
          <Plus size={16} />
          {label}
        </button>
      )}
    </div>
  );
}
function Notice({ title, text }) {
  return (
    <div className="notice">
      <Shield size={20} />
      <div>
        <b>{title}</b>
        <p>{text}</p>
      </div>
    </div>
  );
}
function Calendar({ sessions }) {
  const [offset, setOffset] = useState(0);
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  const y = date.getFullYear(),
    m = date.getMonth(),
    start = (date.getDay() + 6) % 7,
    days = new Date(y, m + 1, 0).getDate();
  return (
    <div className="calendar">
      <div className="section-heading">
        <b>
          {date.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </b>
        <div className="inline">
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() => setOffset(offset - 1)}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() => setOffset(offset + 1)}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div className="calendar-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span className="day-label" key={"d" + i}>
            {d}
          </span>
        ))}
        {Array.from({ length: start }, (_, i) => (
          <span key={"e" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
          const logs = sessions.filter((s) => s.date === key);
          return (
            <span
              title={logs.map((s) => s.title).join(", ") || "No sessions"}
              className={
                "calendar-day " +
                (logs.length ? "trained " : "") +
                (key === today() ? "today" : "")
              }
              key={key}
            >
              {i + 1}
              {logs.length > 0 && <i />}
            </span>
          );
        })}
      </div>
    </div>
  );
}
function Bars({ entries, unit, aggregate = "sum" }) {
  const grouped = {};
  entries.forEach((e) => {
    if (aggregate === "latest") {
      if (grouped[e.date] === undefined) grouped[e.date] = e.value;
    } else grouped[e.date] = (grouped[e.date] || 0) + e.value;
  });
  const values = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14),
    max = Math.max(...values.map(([, v]) => v), 1);
  return values.length ? (
    <div className="bar-chart">
      {values.map(([d, v]) => (
        <div className="bar-column" key={d}>
          <span>{Math.round(v * 10) / 10}</span>
          <div style={{ height: Math.max(3, (v / max) * 130) }} />
          <small>{prettyDate(d)}</small>
        </div>
      ))}
      <span className="chart-unit">
        {unit} · last {values.length} recorded days
      </span>
    </div>
  ) : (
    <div className="chart-empty">
      <Activity size={28} />
      <p>Your chart will appear as you add entries.</p>
    </div>
  );
}
function Media({ ids = [] }) {
  const [files, setFiles] = useState([]);
  useEffect(() => {
    let cancelled = false;
    const urls = [];
    Promise.all(
      ids.map(async (id) => {
        try {
          const file = await request("/media/" + id);
          const url = await mediaUrl(id);
          if (url.startsWith("blob:")) urls.push(url);
          return { ...file, url };
        } catch {
          return null;
        }
      }),
    ).then((result) => {
      if (!cancelled) setFiles(result.filter(Boolean));
      else urls.forEach((u) => URL.revokeObjectURL(u));
    });
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [ids.join(",")]);
  return (
    <div className="media-grid">
      {files.map((f) =>
        f.type.startsWith("video") ? (
          <video key={f.id} controls preload="metadata" src={f.url} />
        ) : (
          <img key={f.id} src={f.url} alt={f.name} />
        ),
      )}
    </div>
  );
}

function Editor({ kind, record, close, save, remove }) {
  const [form, setForm] = useState(() =>
      kind === "schedule"
        ? {
            ...record,
            day:
              [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ][record.day] || record.day,
          }
        : { ...record },
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmDelete, setConfirmDelete] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const old = document.activeElement;
    ref.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const els = ref.current?.querySelectorAll(
          "button:not(:disabled),input,select,textarea,a[href]",
        );
        if (!els?.length) return;
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      old?.focus();
    };
  }, []);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const values = { ...form };
      for (const f of forms[kind])
        if (f.type === "number") values[f.name] = Number(values[f.name]);
      if (kind === "sessions") values.rating = Number(values.rating);
      if (kind === "schedule")
        values.day = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ].indexOf(values.day);
      await save(kind, values);
      close();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        ref={ref}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <header>
          <div>
            <span className="eyebrow">YOUR PERSONAL RECORD</span>
            <h2 id="editor-title">
              {record.id && !record.id.startsWith("catalog-") ? "Edit" : "New"}{" "}
              {
                {
                  sessions: "training session",
                  techniques: "technique",
                  workouts: "workout",
                  meals: "meal",
                  body: "measurement",
                  matches: "match",
                  partners: "partner",
                  places: "place",
                  schedule: "class",
                  vlogs: "journal entry",
                  profile: "athlete profile",
                }[kind]
              }
            </h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close editor"
            onClick={close}
          >
            <X />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="form-grid">
            {forms[kind].map((f) => (
              <label
                key={f.name}
                className={f.type === "textarea" ? "wide" : ""}
              >
                {f.label}
                {f.type === "textarea" ? (
                  <textarea
                    value={form[f.name] || ""}
                    rows={3}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                ) : f.type === "select" ? (
                  <select
                    value={form[f.name]}
                    onChange={(e) => set(f.name, e.target.value)}
                  >
                    {f.options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    required={["title", "date", "name"].includes(f.name)}
                    type={f.type}
                    step={f.type === "number" ? "any" : undefined}
                    min={f.type === "number" ? 0 : undefined}
                    value={form[f.name] ?? ""}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
          {kind === "workouts" && (
            <div className="exercise-editor">
              <div className="section-heading">
                <h3>Exercises</h3>
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    set("exercises", [
                      ...(form.exercises || []),
                      {
                        name: "",
                        sets: 3,
                        reps: 8,
                        weight: 0,
                        rpe: 6,
                        rest: 60,
                      },
                    ])
                  }
                >
                  <Plus size={16} /> Add exercise
                </button>
              </div>
              {(form.exercises || []).map((e, i) => (
                <div className="exercise-row" key={i}>
                  {[
                    ["name", "Exercise"],
                    ["sets", "Sets"],
                    ["reps", "Reps"],
                    ["weight", "kg"],
                    ["rpe", "RPE"],
                    ["rest", "Rest sec"],
                  ].map(([k, label]) => (
                    <label key={k}>
                      {label}
                      <input
                        aria-label={`${label} ${i + 1}`}
                        required={k === "name"}
                        type={k === "name" ? "text" : "number"}
                        min="0"
                        step={k === "name" ? undefined : "any"}
                        value={e[k]}
                        onChange={(ev) =>
                          set(
                            "exercises",
                            form.exercises.map((x, j) =>
                              i === j
                                ? {
                                    ...x,
                                    [k]:
                                      k === "name"
                                        ? ev.target.value
                                        : Number(ev.target.value),
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Remove exercise"
                    onClick={() =>
                      set(
                        "exercises",
                        form.exercises.filter((_, j) => j !== i),
                      )
                    }
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {["workouts", "techniques"].includes(kind) && (
            <label className="check-label">
              <input
                type="checkbox"
                checked={form.favorite || false}
                onChange={(e) => set("favorite", e.target.checked)}
              />{" "}
              Save as a favorite
            </label>
          )}
          {["techniques", "vlogs"].includes(kind) && (
            <div className="upload-area">
              <label>
                <Upload size={18} /> Attach photos or videos{" "}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                  disabled={busy}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setBusy(true);
                    setError("");
                    try {
                      const body = new FormData();
                      body.append("file", file);
                      const result = await request("/media", {
                        method: "POST",
                        body,
                      });
                      setForm((f) => ({
                        ...f,
                        media: [...(f.media || []), result.id],
                      }));
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              </label>
              <p className="muted small">
                JPG, PNG, WebP, MP4, WebM, MOV · up to 100 MB each
              </p>
              <Media ids={form.media} />
              {form.media?.length > 0 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => set("media", [])}
                >
                  Detach media from this entry
                </button>
              )}
            </div>
          )}
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            {record.id &&
              !record.id.startsWith("catalog-") &&
              kind !== "profile" && (
                <button
                  type="button"
                  className="button danger"
                  disabled={busy}
                  onClick={async () => {
                    if (!confirmDelete) return setConfirmDelete(true);
                    setBusy(true);
                    await remove(kind, record.id);
                    close();
                  }}
                >
                  <Trash2 size={16} />
                  {confirmDelete ? "Confirm removal" : "Remove"}
                </button>
              )}
            <button type="button" className="button" onClick={close}>
              Cancel
            </button>
            <button className="button primary" disabled={busy}>
              {busy ? "Saving…" : "Save entry"}
              <Check size={16} />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
function Library({ data, edit, save }) {
  const [query, setQuery] = useState(""),
    [position, setPosition] = useState("All positions"),
    [category, setCategory] = useState("All types"),
    [view, setView] = useState("All techniques");
  const savedNames = new Set(data.techniques.map((t) => t.title.toLowerCase()));
  const all = [
    ...data.techniques,
    ...catalog.filter((t) => !savedNames.has(t.title.toLowerCase())),
  ];
  const filtered = all.filter(
    (t) =>
      (t.title + " " + t.notes + " " + t.position)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (position === "All positions" || t.position === position) &&
      (category === "All types" || t.category === category) &&
      (view !== "My library" || !t.id.startsWith("catalog-")) &&
      (view !== "Favorites" || t.favorite),
  );
  return (
    <>
      <div className="library-toolbar">
        <div className="search-input">
          <Search size={18} />
          <input
            aria-label="Search techniques"
            placeholder="Search a technique, position or note…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by position"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        >
          {["All positions", ...new Set(catalog.map((t) => t.position))].map(
            (p) => (
              <option key={p}>{p}</option>
            ),
          )}
        </select>
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {["All types", ...new Set(catalog.map((t) => t.category))].map(
            (p) => (
              <option key={p}>{p}</option>
            ),
          )}
        </select>
      </div>
      <div className="section-heading">
        <div className="tabs">
          {["All techniques", "My library", "Favorites"].map((v) => (
            <button
              key={v}
              className={view === v ? "selected" : ""}
              onClick={() => setView(v)}
            >
              {v}
            </button>
          ))}
        </div>
        <span className="muted">{filtered.length} techniques</span>
      </div>
      <div className="technique-grid">
        {filtered.map((t, i) => (
          <article className="technique-card" key={t.id}>
            <div className={"technique-cover tone-" + (i % 4)}>
              <span className="position-label">{t.position}</span>
              <div className="technique-symbol">
                <GitBranch size={57} strokeWidth={1} />
              </div>
              <span className="mode-label">{t.mode}</span>
            </div>
            <div className="technique-body">
              <div className="section-heading">
                <span className="eyebrow">{t.category}</span>
                <Star size={16} fill={t.favorite ? "currentColor" : "none"} />
              </div>
              <h3>{t.title}</h3>
              <p>
                {t.id.startsWith("catalog-")
                  ? "Make this technique part of your practice."
                  : `${t.understanding} · ${t.difficulty}`}
              </p>
              <div className="technique-actions">
                <button
                  className="text-button"
                  onClick={() => edit("techniques", t)}
                >
                  {t.id.startsWith("catalog-") ? "Add notes" : "Open notes"}{" "}
                  <ArrowRight size={15} />
                </button>
                <a
                  aria-label={"Find " + t.title + " videos"}
                  href={
                    t.url ||
                    "https://www.youtube.com/results?search_query=" +
                      encodeURIComponent("BJJ " + t.title + " instructional")
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.url ? "Saved video" : "Video search"}{" "}
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <Empty
          title="No techniques found"
          text="Try a different search or add a technique of your own."
        />
      )}
      <p className="muted small">
        Starter catalog · video search opens YouTube. Search results are not
        curated or verified instructionals.
      </p>
    </>
  );
}
function Plans({ data, save, remove }) {
  const [selected, setSelected] = useState(""),
    [title, setTitle] = useState("My passing game"),
    [style, setStyle] = useState("Guard passer"),
    [nodes, setNodes] = useState([
      { id: "start", label: "Standing", parent: "" },
    ]),
    [label, setLabel] = useState(""),
    [parent, setParent] = useState("start"),
    [error, setError] = useState(""),
    [quiz, setQuiz] = useState(0),
    [answer, setAnswer] = useState(null),
    [score, setScore] = useState(0),
    [attempts, setAttempts] = useState(0);
  const s = scenarios[quiz];
  function select(id) {
    setSelected(id);
    const p = data.plans.find((p) => p.id === id);
    if (p) {
      setTitle(p.title);
      setStyle(p.style);
      setNodes(p.nodes);
      setParent(p.nodes[0]?.id || "");
    } else {
      setTitle("My game plan");
      setNodes([{ id: "start", label: "Standing", parent: "" }]);
      setParent("start");
    }
  }
  const renderNode = (n, depth = 0) => (
    <div className="flow-branch" key={n.id}>
      <div className="flow-node">
        <span className="node-dot" />
        <span>{n.label}</span>
        {n.parent && (
          <button
            className="icon-button"
            aria-label={"Remove " + n.label + " branch"}
            onClick={() => {
              const removeIds = new Set([n.id]);
              let changed = true;
              while (changed) {
                changed = false;
                nodes.forEach((x) => {
                  if (removeIds.has(x.parent) && !removeIds.has(x.id)) {
                    removeIds.add(x.id);
                    changed = true;
                  }
                });
              }
              setNodes(nodes.filter((x) => !removeIds.has(x.id)));
              setParent("start");
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>
      {nodes.filter((x) => x.parent === n.id).length > 0 && (
        <div className="flow-children">
          {nodes
            .filter((x) => x.parent === n.id)
            .map((x) => renderNode(x, depth + 1))}
        </div>
      )}
    </div>
  );
  return (
    <>
      <div className="panel">
        <div className="section-heading">
          <h2>Your strategy board</h2>
          <select
            aria-label="Saved plans"
            value={selected}
            onChange={(e) => select(e.target.value)}
          >
            <option value="">New game plan</option>
            {data.plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="form-grid">
          <label>
            Plan name
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Your style
            <select value={style} onChange={(e) => setStyle(e.target.value)}>
              {[
                "Guard passer",
                "Guard player",
                "Submission specialist",
                "Defensive player",
                "All-rounder",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="flow-board">
          {nodes.filter((n) => !n.parent).map((n) => renderNode(n))}
        </div>
        <form
          className="flow-add"
          onSubmit={(e) => {
            e.preventDefault();
            if (label.trim()) {
              setNodes([
                ...nodes,
                { id: crypto.randomUUID(), label: label.trim(), parent },
              ]);
              setLabel("");
            }
          }}
        >
          <label>
            From
            <select value={parent} onChange={(e) => setParent(e.target.value)}>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Next position or technique
            <input
              required
              placeholder="e.g. Knee slice pass"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <button className="button">
            <Plus size={16} /> Add connection
          </button>
        </form>
        <p className="muted small">
          Add multiple connections from one position to create a Plan B.
        </p>
        <button
          className="button primary"
          onClick={async () => {
            try {
              const p = await save("plans", {
                ...(selected ? { id: selected } : {}),
                title,
                style,
                nodes,
                notes: "",
              });
              setSelected(p.id);
              setError("");
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Save game plan <Check size={16} />
        </button>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MENTAL REPS</span>
            <h2>Think through the next move.</h2>
          </div>
          <span className="badge">
            {score}/{attempts} this visit
          </span>
        </div>
        <span className="pill pale">{s.position}</span>
        <h3 className="quiz-prompt">{s.prompt}</h3>
        <div className="quiz-options">
          {s.choices.map((choice, i) => (
            <button
              disabled={answer !== null}
              className={
                answer !== null
                  ? i === s.answer
                    ? "correct"
                    : i === answer
                      ? "incorrect"
                      : ""
                  : ""
              }
              key={choice}
              onClick={() => {
                setAnswer(i);
                setAttempts((a) => a + 1);
                if (i === s.answer) setScore((a) => a + 1);
              }}
            >
              <span>{String.fromCharCode(65 + i)}</span>
              {choice}
              {answer !== null && i === s.answer && <Check size={18} />}
            </button>
          ))}
        </div>
        {answer !== null && (
          <div className="quiz-feedback">
            <p>{s.explanation}</p>
            <button
              className="text-button"
              onClick={() => {
                setQuiz((quiz + 1) % scenarios.length);
                setAnswer(null);
              }}
            >
              Next scenario <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
      <Notice
        title="Long-term planning"
        text="Use separate saved plans for monthly focus areas. Automated annual periodization and a draggable strategy canvas are planned; the current builder supports saved branching sequences."
      />
    </>
  );
}
function RoundTimer() {
  const [minutes, setMinutes] = useState(5),
    [rest, setRest] = useState(1),
    [rounds, setRounds] = useState(5),
    [left, setLeft] = useState(300),
    [round, setRound] = useState(1),
    [phase, setPhase] = useState("Ready"),
    [running, setRunning] = useState(false),
    [scores, setScores] = useState([
      { points: 0, advantages: 0, penalties: 0 },
      { points: 0, advantages: 0, penalties: 0 },
    ]),
    [sound, setSound] = useState(true);
  const deadline = useRef(0),
    audio = useRef(null);
  function beep() {
    if (!sound) return;
    try {
      const ctx = audio.current;
      if (!ctx) return;
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.15;
      osc.frequency.value = 750;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }
  useEffect(() => {
    if (!running) return;
    deadline.current = Date.now() + left * 1000;
    const id = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setLeft(remaining);
      if (remaining === 0) {
        beep();
        setRunning(false);
        if (phase === "Rest") {
          setRound((r) => r + 1);
          setPhase("Round");
          setLeft(minutes * 60);
          setRunning(true);
        } else if (round >= rounds) {
          setPhase("Complete");
        } else if (rest > 0) {
          setPhase("Rest");
          setLeft(rest * 60);
          setRunning(true);
        } else {
          setRound((r) => r + 1);
          setPhase("Round");
          setLeft(minutes * 60);
          setRunning(true);
        }
      }
    }, 150);
    return () => clearInterval(id);
  }, [running, phase, round]);
  function reset() {
    setRunning(false);
    setRound(1);
    setPhase("Ready");
    setLeft(minutes * 60);
  }
  return (
    <>
      <section className="timer-panel">
        <div className="timer-settings">
          <label>
            Round · minutes
            <input
              type="number"
              min="1"
              max="60"
              value={minutes}
              disabled={phase !== "Ready"}
              onChange={(e) => {
                const v = Math.max(
                  1,
                  Math.min(60, Number(e.target.value) || 1),
                );
                setMinutes(v);
                setLeft(v * 60);
              }}
            />
          </label>
          <label>
            Rest · minutes
            <input
              type="number"
              min="0"
              max="10"
              value={rest}
              disabled={phase !== "Ready"}
              onChange={(e) =>
                setRest(Math.max(0, Math.min(10, Number(e.target.value) || 0)))
              }
            />
          </label>
          <label>
            Total rounds
            <input
              type="number"
              min="1"
              max="50"
              value={rounds}
              disabled={phase !== "Ready"}
              onChange={(e) =>
                setRounds(
                  Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                )
              }
            />
          </label>
        </div>
        <div className="timer-stage">
          <span className="pill">
            {phase === "Ready" ? "READY WHEN YOU ARE" : phase.toUpperCase()} ·
            ROUND {round} OF {rounds}
          </span>
          <div className={"clock " + (phase === "Rest" ? "rest" : "")}>
            {String(Math.floor(left / 60)).padStart(2, "0")}
            <span>:</span>
            {String(left % 60).padStart(2, "0")}
          </div>
          <div className="timer-controls">
            <button
              className="button lime"
              disabled={phase === "Complete"}
              onClick={() => {
                try {
                  audio.current ||= new (
                    window.AudioContext || window.webkitAudioContext
                  )();
                  audio.current.resume();
                } catch {}
                if (phase === "Ready") setPhase("Round");
                setRunning(!running);
              }}
            >
              {running ? <Pause size={19} /> : <Play size={19} />}{" "}
              {running
                ? "Pause"
                : phase === "Ready"
                  ? "Start rounds"
                  : "Resume"}
            </button>
            <button className="button dark-button" onClick={reset}>
              <RotateCcw size={17} /> Reset
            </button>
            <button
              className="button dark-button"
              aria-pressed={sound}
              onClick={() => setSound(!sound)}
            >
              <Volume2 size={17} />
              {sound ? "Sound on" : "Sound off"}
            </button>
          </div>
          <p>
            Keep this window open for round alerts. Mobile browsers may pause
            audio in the background.
          </p>
        </div>
      </section>
      <div className="section-heading">
        <h2>Match scoreboard</h2>
        <button
          className="text-button"
          onClick={() =>
            setScores([
              { points: 0, advantages: 0, penalties: 0 },
              { points: 0, advantages: 0, penalties: 0 },
            ])
          }
        >
          Clear score
        </button>
      </div>
      <div className="scoreboard">
        {scores.map((s, i) => (
          <section key={i} className={"score-card " + (i ? "blue" : "red")}>
            <span className="eyebrow">{i ? "BLUE" : "RED"} CORNER</span>
            <h2>{s.points}</h2>
            <div className="inline">
              {[2, 3, 4].map((v) => (
                <button
                  className="button"
                  key={v}
                  onClick={() =>
                    setScores(
                      scores.map((x, j) =>
                        j === i ? { ...x, points: x.points + v } : x,
                      ),
                    )
                  }
                >
                  +{v}
                </button>
              ))}
              <button
                className="button"
                onClick={() =>
                  setScores(
                    scores.map((x, j) =>
                      j === i ? { ...x, points: Math.max(0, x.points - 1) } : x,
                    ),
                  )
                }
              >
                −1
              </button>
            </div>
            <div className="score-extras">
              {["advantages", "penalties"].map((k) => (
                <div key={k}>
                  <span>
                    {k} <b>{s[k]}</b>
                  </span>
                  <button
                    aria-label={"Add " + k + " " + (i ? "blue" : "red")}
                    onClick={() =>
                      setScores(
                        scores.map((x, j) =>
                          j === i ? { ...x, [k]: x[k] + 1 } : x,
                        ),
                      )
                    }
                  >
                    +
                  </button>
                  <button
                    aria-label={"Subtract " + k + " " + (i ? "blue" : "red")}
                    onClick={() =>
                      setScores(
                        scores.map((x, j) =>
                          j === i ? { ...x, [k]: Math.max(0, x[k] - 1) } : x,
                        ),
                      )
                    }
                  >
                    −
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
function Nutrition({ data, profile, edit, save, remove }) {
  const [date, setDate] = useState(today()),
    [detail, setDetail] = useState(false),
    [error, setError] = useState("");
  const meals = data.meals.filter((m) => m.date === date),
    waters = data.water.filter((w) => w.date === date),
    water = sum(waters, "amount");
  const nutrients = detail
    ? ["protein", "carbs", "fat", "fiber", "saturated", "sodium"]
    : ["protein", "carbs", "fat", "fiber"];
  return (
    <>
      <div className="section-heading">
        <h2>Daily fuel</h2>
        <input
          aria-label="Nutrition date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="nutrition-grid">
        <section className="panel calorie-card">
          <span className="eyebrow">DAILY INTAKE</span>
          <div className="nutrition-number">
            {Math.round(sum(meals, "calories")).toLocaleString()}
            <span> / {profile.calorieGoal.toLocaleString()} kcal</span>
          </div>
          <div className="progress-track">
            <i
              style={{
                width:
                  Math.min(
                    100,
                    (sum(meals, "calories") / profile.calorieGoal) * 100,
                  ) + "%",
              }}
            />
          </div>
          <p>
            {Math.max(
              0,
              profile.calorieGoal - sum(meals, "calories"),
            ).toLocaleString()}{" "}
            kcal remaining against your saved target
          </p>
          <div className="nutrients">
            {nutrients.map((n) => (
              <div key={n}>
                <small>{n}</small>
                <b>
                  {Math.round(sum(meals, n))}
                  <span>{n === "sodium" ? "mg" : "g"}</span>
                </b>
              </div>
            ))}
          </div>
          <button className="text-button" onClick={() => setDetail(!detail)}>
            {detail ? "Show summary" : "Show more nutrients"}{" "}
            <ChevronRight size={14} />
          </button>
        </section>
        <section className="panel water-card">
          <Droplets size={30} />
          <h2>Stay in your flow.</h2>
          <div className="water-value">
            {(water / 1000).toFixed(2)}
            <span> / {(profile.waterGoal / 1000).toFixed(1)} L</span>
          </div>
          <div className="progress-track">
            <i
              style={{
                width: Math.min(100, (water / profile.waterGoal) * 100) + "%",
              }}
            />
          </div>
          <div className="inline">
            {[250, 500].map((amount) => (
              <button
                key={amount}
                className="button"
                onClick={async () => {
                  try {
                    await save("water", { date, amount });
                    setError("");
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                <Plus size={15} />
                {amount} mL
              </button>
            ))}
          </div>
          {waters.length > 0 && (
            <button
              className="text-button"
              onClick={() => remove("water", waters[0].id)}
            >
              Undo last water entry
            </button>
          )}
          {error && <p role="alert">{error}</p>}
        </section>
      </div>
      <section className="panel">
        <div className="section-heading">
          <h2>Food journal</h2>
          <button
            className="text-button"
            onClick={() => edit("meals", { ...initial("meals"), date })}
          >
            Add meal <Plus size={16} />
          </button>
        </div>
        {meals.length ? (
          meals.map((m) => (
            <div className="record" key={m.id}>
              <div>
                <span className="eyebrow">{m.meal}</span>
                <h3>{m.title}</h3>
                <p>
                  {m.calories} kcal · P {m.protein}g · C {m.carbs}g · F {m.fat}g
                </p>
                <p className="muted">{m.notes}</p>
              </div>
              <button className="text-button" onClick={() => edit("meals", m)}>
                Edit
              </button>
            </div>
          ))
        ) : (
          <Empty
            title="What’s fueling you today?"
            text="Log foods and serving information from their nutrition labels."
          />
        )}
      </section>
      <Notice
        title="Targets you control"
        text="Calories and hydration use your saved daily goals. Automatic exercise adjustments, food-photo recognition and barcode lookup are not connected. Set goals in your profile; no nutrition score or weight-loss prediction is inferred from incomplete food logs."
      />
    </>
  );
}
function Assistant({ close, edit, go, notify }) {
  const [text, setText] = useState(""),
    [error, setError] = useState(""),
    [listening, setListening] = useState(false);
  const recognition = useRef(null);
  useEffect(() => () => recognition.current?.abort(), []);
  function listen() {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition)
      return setError(
        "Speech recognition is not available in this browser. You can type a command below.",
      );
    const r = new Recognition();
    recognition.current = r;
    r.lang = "en-CA";
    r.onresult = (e) => {
      setText(e.results[0][0].transcript);
      setListening(false);
    };
    r.onerror = () => {
      setListening(false);
      setError(
        "Microphone unavailable or speech was not recognized. Try typing instead.",
      );
    };
    r.onend = () => setListening(false);
    r.start();
    setListening(true);
  }
  function run() {
    const q = text.toLowerCase();
    let m = q.match(/log\s+(\d+)\s*(?:min|minute)/);
    if (m) {
      edit("sessions", {
        ...initial("sessions"),
        duration: Number(m[1]),
        rolling: 0,
        kind: /no.?gi/.test(q) ? "No-Gi" : "Gi",
        notes: text,
      });
      close();
      return;
    }
    if (/timer|round/.test(q)) {
      go("Round timer");
      close();
      return;
    }
    if (/meal|food|ate/.test(q)) {
      edit("meals", { ...initial("meals"), notes: text });
      close();
      return;
    }
    if (/workout|mobility|yoga|pilates/.test(q)) {
      const type = /mobility/.test(q)
        ? "Mobility"
        : /yoga/.test(q)
          ? "Yoga"
          : /pilates/.test(q)
            ? "Pilates"
            : "Strength";
      edit("workouts", makeProgram(type));
      close();
      return;
    }
    setError(
      "Try “log 60 minutes no-gi”, “open timer”, “log a meal”, or “create mobility workout”.",
    );
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal assistant-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-title"
      >
        <header>
          <div>
            <span className="eyebrow">LESS TAPPING. MORE TRAINING.</span>
            <h2 id="assistant-title">Quick assistant</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close assistant"
            onClick={close}
          >
            <X />
          </button>
        </header>
        <p>
          This local command helper opens drafts for you to review. It uses a
          small set of commands, not a connected AI model.
        </p>
        <label>
          Your command
          <textarea
            autoFocus
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Log 60 minutes no-gi…"
          />
        </label>
        <div className="command-chips">
          {[
            "Log 60 minutes no-gi",
            "Open timer",
            "Create mobility workout",
            "Log a meal",
          ].map((c) => (
            <button key={c} onClick={() => setText(c)}>
              {c}
            </button>
          ))}
        </div>
        <p className="muted small">
          Optional voice dictation uses your browser’s speech service, which may
          process audio online.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button className="button" disabled={listening} onClick={listen}>
            <Mic size={17} />
            {listening ? "Listening…" : "Dictate"}
          </button>
          <button className="button primary" onClick={run}>
            Open draft <ArrowRight size={16} />
          </button>
        </div>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
