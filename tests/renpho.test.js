import test from "node:test";
import assert from "node:assert/strict";
import { readScaleCSV, prepareScaleImport, scaleDate } from "../src/renpho.js";
const mapping = { date: 0, weight: 1, fat: 2, muscle: -1, visceral: -1 };
test("RENPHO import converts pounds, keeps missing readings unknown, and skips repeats", () => {
  const csv = readScaleCSV(
    '\uFEFFTime,Weight(lb),Body Fat(%),Note\r\n11/10/2026 08:30,180,20,"morning, before breakfast"\r\n11/10/2026 08:30,180,20,"duplicate"',
  );
  const result = prepareScaleImport(csv, mapping, "lb", "MDY");
  assert.equal(result.errors.length, 0);
  assert.equal(result.records.length, 1);
  assert.equal(result.duplicates, 1);
  assert.equal(result.records[0].date, "2026-11-10");
  assert.equal(result.records[0].weight, 81.647);
  assert.equal(result.records[0].muscle, null);
  assert.equal(
    prepareScaleImport(csv, mapping, "lb", "MDY", result.records).records
      .length,
    0,
  );
});
test("import requires explicit units/date format and rejects invalid dates or measurements", () => {
  assert.throws(
    () =>
      prepareScaleImport(
        readScaleCSV("Date,Weight,Muscle mass (%)\n2026-11-10,80,50"),
        { date: 0, weight: 1, muscle: 2 },
        "kg",
        "YMD",
      ),
    /not a percentage/,
  );
  assert.throws(() => scaleDate("02/30/2026", "MDY"));
  assert.equal(scaleDate("03/04/2026", "DMY"), "2026-04-03");
  const csv = readScaleCSV(
    "Date;Weight;Fat\n2026-11-10;80,5;20,1\n2026-11-11;-50;20",
  );
  assert.equal(prepareScaleImport(csv, mapping, "kg", "YMD").errors.length, 1);
  assert.equal(
    prepareScaleImport(csv, mapping, "kg", "YMD").records[0].weight,
    80.5,
  );
  assert.throws(() => prepareScaleImport(csv, mapping, "", "YMD"));
  assert.throws(() => readScaleCSV('Date,Weight\n"broken,123'));
});
