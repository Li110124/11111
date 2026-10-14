'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculate, roundUp } = require('../calculator.js');
const base = { completedWeight: 67.5, currentScore: 77, targetScore: 70, remainingWeight: 32.5 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test('67.5% at 77 with a target of 70 requires 55.461538…; recommend 55.47', () => {
  const result = calculate(base);
  close(result.earnedScore, 51.975);
  close(result.requiredScore, 55.46153846153846);
  close(result.maximumScore, 84.475);
  assert.equal(result.suggestedScore, 55.47);
  assert.equal(result.status, 'achievable');
  assert.ok(51.975 + result.suggestedScore * .325 >= 70);
  assert.ok(51.975 + 55.46 * .325 < 70);
});

test('50% at 71 with a target of 67 requires 63', () => {
  const result = calculate({ completedWeight: 50, currentScore: 71, targetScore: 67, remainingWeight: 50 });
  assert.equal(result.requiredScore, 63);
  assert.equal(result.suggestedScore, 63);
});

test('67.5% at 67 with a target of 70 requires 76.230769…', () => {
  const result = calculate({ ...base, currentScore: 67 });
  close(result.requiredScore, 76.23076923076923);
  assert.equal(result.suggestedScore, 76.24);
});

test('target beyond the maximum is impossible; exactly 100 remains achievable', () => {
  assert.equal(calculate({ ...base, targetScore: 90 }).status, 'impossible');
  const result = calculate({ ...base, targetScore: 84.475 });
  assert.equal(result.status, 'achievable');
  assert.equal(result.suggestedScore, 100);
});

test('already secured targets require zero, including a target of zero', () => {
  for (const targetScore of [0, 40, 51.975]) {
    const result = calculate({ ...base, targetScore });
    assert.equal(result.status, 'secured');
    assert.equal(result.suggestedScore, 0);
    assert.ok(result.scenarios.every(row => row.meetsTarget));
  }
});

test('zero remaining weight reports the final outcome without division by zero', () => {
  const completed = { completedWeight: 100, currentScore: 70, remainingWeight: 0 };
  assert.equal(calculate({ ...completed, targetScore: 70 }).status, 'completed-met');
  const missed = calculate({ ...completed, targetScore: 71 });
  assert.equal(missed.status, 'completed-missed');
  assert.equal(missed.requiredScore, null);
  assert.deepEqual(missed.scenarios, []);
});

test('zero completed weight needs the target itself', () => {
  const result = calculate({ completedWeight: 0, currentScore: 0, targetScore: 70, remainingWeight: 100 });
  assert.equal(result.requiredScore, 70);
  assert.equal(result.suggestedScore, 70);
});

test('reject missing, non-numeric, out-of-range and mismatched weights', () => {
  for (const field of Object.keys(base)) {
    for (const value of [NaN, Infinity, -1, 101, undefined, null, '', '77']) {
      assert.throws(() => calculate({ ...base, [field]: value }));
    }
  }
  assert.throws(() => calculate({ ...base, remainingWeight: 30 }), /100%/);
  assert.throws(() => calculate({ ...base, completedWeight: 0, remainingWeight: 0 }), /100%/);
  assert.doesNotThrow(() => calculate({ ...base, completedWeight: 66.7, remainingWeight: 33.3 }));
});

test('scenario totals match independent arithmetic and threshold decisions', () => {
  const result = calculate(base);
  const sixty = result.scenarios.find(row => row.score === 60);
  close(sixty.finalScore, 71.475);
  assert.equal(sixty.meetsTarget, true);
  const fifty = result.scenarios.find(row => row.score === 50);
  close(fifty.finalScore, 68.225);
  assert.equal(fifty.meetsTarget, false);
  const suggested = result.scenarios.find(row => row.score === 55.47);
  assert.ok(suggested.meetsTarget);
});

test('round upward without adding a hundredth to an exact decimal', () => {
  assert.equal(roundUp(55.461538), 55.47);
  assert.equal(roundUp(63), 63);
  assert.equal(roundUp(76.24), 76.24);
});

test('recommended scores achieve the goal across many weights and scores', () => {
  for (const completedWeight of [0, 10, 33.3, 50, 67.5, 99.9]) {
    for (const currentScore of [0, 40, 71, 77, 100]) {
      for (const targetScore of [0, 40, 60, 67, 70, 100]) {
        const remainingWeight = 100 - completedWeight;
        const result = calculate({ completedWeight, currentScore, targetScore, remainingWeight });
        if (result.suggestedScore !== null) {
          assert.ok(result.suggestedScore >= 0 && result.suggestedScore <= 100);
          assert.ok(currentScore * completedWeight / 100 + result.suggestedScore * remainingWeight / 100 + 1e-9 >= targetScore);
        } else {
          assert.ok(currentScore * completedWeight / 100 + remainingWeight < targetScore);
        }
      }
    }
  }
});
