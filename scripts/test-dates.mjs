import assert from "node:assert/strict";
import test from "node:test";
import { getInitialWhen, startOfDay } from "../src/shared/utils/dates.ts";

test("getInitialWhen", async (t) => {
  const fixedNow = new Date(2026, 8, 6, 13, 45, 12, 500).getTime();
  const pastDayStart = startOfDay(new Date(2024, 2, 10).getTime());
  const pastTimestampWithTime = new Date(2024, 2, 10, 9, 30, 0, 0).getTime();
  const existingCreatedAt = new Date(2023, 11, 25, 18, 0, 0, 0).getTime();

  await t.test("preserves existing entry createdAt over initialDate and now", () => {
    const result = getInitialWhen(existingCreatedAt, pastDayStart, fixedNow);
    assert.equal(result, existingCreatedAt);
  });

  await t.test("blends start-of-day initialDate with current clock time", () => {
    const result = getInitialWhen(undefined, pastDayStart, fixedNow);
    assert.equal(startOfDay(result), pastDayStart);

    const resultDate = new Date(result);
    const nowDate = new Date(fixedNow);
    assert.equal(resultDate.getHours(), nowDate.getHours());
    assert.equal(resultDate.getMinutes(), nowDate.getMinutes());
    assert.equal(resultDate.getSeconds(), nowDate.getSeconds());
  });

  await t.test("preserves exact timestamp when initialDate has explicit time component", () => {
    const result = getInitialWhen(undefined, pastTimestampWithTime, fixedNow);
    assert.equal(result, pastTimestampWithTime);
  });

  await t.test("falls back to now when neither existing nor initialDate is passed", () => {
    const result = getInitialWhen(undefined, undefined, fixedNow);
    assert.equal(result, fixedNow);
  });

  await t.test("handles initialDate = 0 as start-of-day unix epoch correctly", () => {
    const zeroStart = startOfDay(0);
    const result = getInitialWhen(undefined, zeroStart, fixedNow);
    assert.equal(startOfDay(result), zeroStart);
  });
});
