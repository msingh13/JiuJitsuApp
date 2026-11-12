import React, { useEffect, useRef, useState } from "react";
import { cloud, cloudActive } from "./cloud.js";
export const foodAIEnabled = import.meta.env.VITE_FOOD_PHOTO_AI === "true";

export default function FoodPhotoEstimate({
  media = [],
  labels = {},
  disabled,
  onBusy,
  onApply,
}) {
  const [selected, setSelected] = useState("");
  const [portion, setPortion] = useState("");
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const photo = media.includes(selected) ? selected : media[0] || "";
  useEffect(() => {
    setEstimate(null);
  }, [photo, portion]);
  async function analyze() {
    setWorking(true);
    onBusy(true);
    setError("");
    setEstimate(null);
    try {
      const { data, error: failure } = await cloud.functions.invoke(
        "estimate-nutrition",
        { body: { mediaId: photo, portion } },
      );
      if (failure) {
        let message =
          "Could not reach food-photo estimates. Try again later; your meal values are unchanged.";
        try {
          message = (await failure.context.json()).error || message;
        } catch {}
        throw new Error(message);
      }
      if (!data?.nutrients || !data?.assumptions)
        throw new Error(
          "No usable estimate was returned. Your values are unchanged.",
        );
      if (alive.current) setEstimate(data);
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      if (alive.current) {
        setWorking(false);
        onBusy(false);
      }
    }
  }
  return (
    <div className="photo-ai-status">
      <strong>
        {foodAIEnabled
          ? "Estimate calories & macros"
          : "Photo saved separately from calories"}
      </strong>
      {!foodAIEnabled ? (
        <p>
          Taking a photo does not calculate calories yet. Food-photo AI is
          awaiting connection. Enter calories and macros above to include them
          in your daily totals, then save the meal to keep the photo.
        </p>
      ) : !cloudActive() ? (
        <p>
          Sign in with Google to estimate nutrition from a photo in your private
          cloud journal.
        </p>
      ) : (
        <>
          <p>
            Send your chosen photo and portion description to Google Gemini for
            an estimate. Its free service may use submissions to improve Google
            products. Use a food-only photo without faces, documents or private
            information. Review the estimate before applying; hidden ingredients
            and serving sizes can change the result. Up to 10 attempts per day,
            subject to shared free-service limits.
          </p>
          <label>
            Meal photo
            <select
              value={photo}
              disabled={disabled || !media.length}
              onChange={(e) => setSelected(e.target.value)}
            >
              {!media.length && (
                <option value="">Take or upload a photo first</option>
              )}
              {media.map((id, i) => (
                <option value={id} key={id}>
                  {labels[id] || `Photo ${i + 1}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            Portion & preparation
            <textarea
              maxLength={1000}
              value={portion}
              disabled={disabled}
              placeholder="For example: one bowl, about 1 cup rice, grilled chicken, 1 tbsp sauce"
              onChange={(e) => setPortion(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={
              disabled || working || !photo || portion.trim().length < 3
            }
            onClick={analyze}
          >
            {working ? "Estimating…" : "Estimate from this photo"}
          </button>
          {error && <p role="alert">{error}</p>}
          {estimate && (
            <div aria-live="polite">
              <h4>Review estimated nutrition</h4>
              <p>
                {Object.entries(estimate.nutrients)
                  .map(
                    ([key, value]) =>
                      `${key}: ${value}${key === "calories" ? " kcal" : key === "sodium" ? " mg" : " g"}`,
                  )
                  .join(" · ")}
              </p>
              <p>{estimate.assumptions}</p>
              <p>
                Applying replaces the listed nutrition fields. You can edit them
                above before saving.
              </p>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onApply(estimate);
                  setEstimate(null);
                }}
              >
                Apply estimate to meal
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setEstimate(null)}
              >
                Discard estimate
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
