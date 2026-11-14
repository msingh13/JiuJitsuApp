import { schemas } from "../server/schema.js";

export function readScaleCSV(text) {
  if (text.length > 2 * 1024 * 1024)
    throw new Error("Choose a CSV smaller than 2 MB.");
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/)[0];
  const delimiter =
    first.split(";").length > first.split(",").length ? ";" : ",";
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === delimiter || c === "\n" || c === "\r")) {
      row.push(cell.trim());
      cell = "";
      if (c !== delimiter) {
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (c === "\r" && text[i + 1] === "\n") i++;
      }
    } else cell += c;
    if (rows.length > 10001)
      throw new Error("Import at most 10,000 readings at a time.");
  }
  if (quoted) throw new Error("The CSV has an unfinished quoted field.");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2 || rows[0].length < 2)
    throw new Error("Choose a CSV with a header row and measurements.");
  const headers = rows.shift();
  if (rows.some((r) => r.length !== headers.length))
    throw new Error(
      "CSV rows have inconsistent columns. Export the file again.",
    );
  return { headers, rows };
}

export function scaleDate(value, format) {
  const match = value
    .trim()
    .match(/^(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})(?:\b|T)/);
  if (!match)
    throw new Error("Date could not be read. Check your date format.");
  let [, a, b, c] = match;
  const [y, m, d] =
    format === "YMD" ? [a, b, c] : format === "MDY" ? [c, a, b] : [c, b, a];
  const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  if (
    y.length !== 4 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  )
    throw new Error("Invalid date. Check the selected date format.");
  return date;
}
function reading(value, optional = false) {
  const cleaned = value
    .trim()
    .replace(/\s*(kg|lbs?|%)$/i, "")
    .replace(",", ".");
  if (optional && (!cleaned || cleaned === "--" || cleaned === "-"))
    return null;
  if (!/^\d+(?:\.\d+)?$/.test(cleaned))
    throw new Error("A measurement is not a valid number.");
  return Number(cleaned);
}
export function prepareScaleImport(csv, mapping, units, format, existing = []) {
  if (!["kg", "lb"].includes(units))
    throw new Error("Choose the weight unit used in your export.");
  if (!["YMD", "MDY", "DMY"].includes(format))
    throw new Error("Choose the date format used in your export.");
  for (const name of ["date", "weight"])
    if (
      !Number.isInteger(mapping[name]) ||
      mapping[name] < 0 ||
      mapping[name] >= csv.headers.length
    )
      throw new Error("Select the date and weight columns.");
  if (mapping.muscle >= 0 && /%|percent/i.test(csv.headers[mapping.muscle]))
    throw new Error(
      "Muscle mass must use a weight column, not a percentage. Choose Not included if your export only has muscle percentage.",
    );
  const seen = new Set(existing.map((r) => r.sourceId).filter(Boolean));
  const records = [];
  const errors = [];
  let duplicates = 0;
  csv.rows.forEach((row, index) => {
    try {
      const rawDate = row[mapping.date];
      const date = scaleDate(rawDate, format);
      const kg = (v) =>
        Math.round(v * (units === "lb" ? 0.45359237 : 1) * 1000) / 1000;
      const optional = (k) =>
        mapping[k] >= 0 ? reading(row[mapping[k]], true) : null;
      const muscle = optional("muscle");
      const values = {
        date,
        weight: kg(reading(row[mapping.weight])),
        fat: optional("fat"),
        muscle: muscle === null ? null : kg(muscle),
        visceral: optional("visceral"),
      };
      const sourceId = JSON.stringify([
        "renpho",
        rawDate,
        values.weight,
        values.fat,
        values.muscle,
        values.visceral,
      ]);
      const record = schemas.body.parse({
        ...values,
        sourceId,
        notes: `Imported from RENPHO export · ${rawDate}`,
      });
      if (seen.has(sourceId)) {
        duplicates++;
        return;
      }
      seen.add(sourceId);
      records.push(record);
    } catch (e) {
      errors.push(
        `Row ${index + 2}: ${e.issues ? "Measurement outside supported range." : e.message}`,
      );
    }
  });
  return { records, duplicates, errors };
}
