export const limits = {
  calories: 20000,
  protein: 2000,
  carbs: 2000,
  fat: 2000,
  fiber: 1000,
  saturated: 1000,
  sodium: 100000,
};
export function validateEstimate(input) {
  if (!input || typeof input !== "object" || input.isFood !== true)
    throw new Error(
      "No clear meal was identified. Try a clearer photo and describe the portion.",
    );
  const result = {};
  for (const [key, max] of Object.entries(limits)) {
    const value = input[key];
    if (value === null && ["fiber", "saturated", "sodium"].includes(key))
      continue;
    if (
      typeof value !== "number" ||
      !Number.isFinite(value) ||
      value < 0 ||
      value > max
    )
      throw new Error(
        "The estimate was incomplete. Try again with portion details.",
      );
    result[key] = Math.round(value * 10) / 10;
  }
  if (
    typeof input.assumptions !== "string" ||
    !input.assumptions.trim() ||
    input.assumptions.length > 2000
  )
    throw new Error(
      "The estimate did not explain its assumptions. Please try again.",
    );
  return { nutrients: result, assumptions: input.assumptions.trim() };
}
