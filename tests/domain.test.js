import { test } from "node:test";
import assert from "node:assert/strict";
import { inPeriod, volume, estimated1RM, makeProgram } from "../src/domain.js";
import { schemas } from "../server/schema.js";
import { createStore } from "../server/store.js";
test("week uses Monday boundary, excludes future entries and handles year boundary", () => {
  assert.equal(inPeriod("2026-10-19", "Week", "2026-10-24"), true);
  assert.equal(inPeriod("2026-10-18", "Week", "2026-10-24"), false);
  assert.equal(inPeriod("2026-10-25", "Week", "2026-10-24"), false);
  assert.equal(inPeriod("2025-12-29", "Week", "2026-01-01"), true);
  assert.equal(inPeriod("2025-12-31", "Year", "2026-01-01"), false);
  assert.equal(inPeriod("2026-09-30", "Month", "2026-10-24"), false);
});
test("workout volume aggregates actual sets and 1RM excludes high-repetition estimates", () => {
  assert.equal(
    volume({
      exercises: [
        { sets: 3, reps: 5, weight: 100 },
        { sets: 2, reps: 8, weight: 40 },
      ],
    }),
    2140,
  );
  assert.equal(estimated1RM({ reps: 5, weight: 100 }), 117);
  assert.equal(estimated1RM({ reps: 30, weight: 100 }), null);
});
test("session validation rejects invalid dates, negative durations, and double-counted rolling", () => {
  const base = {
    title: "Practice",
    date: "2026-10-24",
    kind: "Gi",
    duration: 60,
    rolling: 20,
    rating: 4,
  };
  assert.equal(schemas.sessions.safeParse(base).success, true);
  for (const change of [
    { date: "2026-02-31" },
    { rolling: 80 },
    { duration: -1 },
    { rating: 6 },
  ])
    assert.equal(
      schemas.sessions.safeParse({ ...base, ...change }).success,
      false,
    );
});
test("external links cannot execute script schemes", () => {
  const base = {
    title: "Armbar",
    position: "Mount",
    category: "Submission",
    mode: "Both",
  };
  assert.equal(
    schemas.techniques.safeParse({
      ...base,
      url: "https://youtube.com/watch?v=example",
    }).success,
    true,
  );
  assert.equal(
    schemas.techniques.safeParse({ ...base, url: "javascript:alert(1)" })
      .success,
    false,
  );
});
test("every generator template is a valid editable workout", () => {
  for (const type of [
    "Strength",
    "Kettlebell",
    "Cardio",
    "Mobility",
    "Yoga",
    "Pilates",
  ])
    assert.equal(schemas.workouts.safeParse(makeProgram(type)).success, true);
});
test("database preserves records and isolates record types during updates/deletes", () => {
  const store = createStore(":memory:");
  const one = store.put("sessions", { title: "First" });
  assert.equal(store.list("sessions")[0].title, "First");
  assert.equal(store.put("meals", { title: "Wrong kind" }, one.id), null);
  assert.equal(store.remove("meals", one.id), false);
  assert.equal(
    store.put("sessions", { title: "Edited" }, one.id).title,
    "Edited",
  );
  assert.equal(store.list("sessions").length, 1);
  assert.equal(store.remove("sessions", one.id), true);
  assert.equal(store.list("sessions").length, 0);
  store.close();
});
