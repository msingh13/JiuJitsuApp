import test from "node:test";
import assert from "node:assert/strict";
import { validateEstimate } from "../supabase/functions/estimate-nutrition/validation.js";
const meal = {
  isFood: true,
  calories: 500,
  protein: 25,
  carbs: 60,
  fat: 18,
  fiber: null,
  saturated: null,
  sodium: null,
  assumptions: "Assumes one bowl and one tablespoon of oil.",
};
test("estimates preserve unknown nutrients instead of inventing zero values", () => {
  const result = validateEstimate(meal);
  assert.equal(result.nutrients.calories, 500);
  assert.equal(Object.hasOwn(result.nutrients, "sodium"), false);
});
test("non-food, missing macros, invalid numbers and missing assumptions are rejected", () => {
  for (const change of [
    { isFood: false },
    { calories: -1 },
    { protein: null },
    { carbs: "50" },
    { fat: Infinity },
    { sodium: 100001 },
    { assumptions: "" },
  ])
    assert.throws(() => validateEstimate({ ...meal, ...change }));
});
