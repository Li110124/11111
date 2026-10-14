(function (root) {
  'use strict';

  // Ignore only floating-point noise, not a meaningful shortfall.
  const EPSILON = 1e-10;
  const fields = {
    completedWeight: '已完成权重',
    currentScore: '当前成绩',
    targetScore: '目标总分',
    remainingWeight: '剩余权重',
  };

  function validate(input) {
    for (const [key, label] of Object.entries(fields)) {
      const value = input[key];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`请填写${label}。`);
      }
      if (value < 0 || value > 100) {
        throw new Error(`${label}必须在 0 到 100 之间。`);
      }
    }
    if (Math.abs(input.completedWeight + input.remainingWeight - 100) > EPSILON) {
      throw new Error('已完成权重与剩余权重合计必须为 100%。');
    }
  }

  function roundUp(value, places = 2) {
    const factor = 10 ** places;
    return Math.ceil(value * factor - EPSILON) / factor;
  }

  function calculate(input) {
    validate(input);
    const { completedWeight, currentScore, targetScore, remainingWeight } = input;
    const earnedScore = currentScore * completedWeight / 100;
    const maximumScore = earnedScore + remainingWeight;
    const shortfall = targetScore - earnedScore;

    if (remainingWeight === 0) {
      return {
        status: earnedScore + EPSILON >= targetScore ? 'completed-met' : 'completed-missed',
        earnedScore, maximumScore, requiredScore: null, suggestedScore: null, scenarios: [],
      };
    }

    const requiredScore = shortfall / (remainingWeight / 100);
    const status = shortfall <= EPSILON ? 'secured'
      : maximumScore + EPSILON < targetScore ? 'impossible' : 'achievable';
    const suggestedScore = status === 'secured' ? 0
      : status === 'achievable' ? Math.min(100, roundUp(requiredScore)) : null;
    const scenarioScores = [50, 60, 70, 80, 90, 100];
    if (suggestedScore !== null && !scenarioScores.includes(suggestedScore)) {
      scenarioScores.push(suggestedScore);
    }
    const scenarios = scenarioScores.sort((a, b) => a - b).map(score => {
      const finalScore = earnedScore + score * remainingWeight / 100;
      return { score, finalScore, meetsTarget: finalScore + EPSILON >= targetScore };
    });
    return { status, earnedScore, maximumScore, requiredScore, suggestedScore, scenarios };
  }

  const api = Object.freeze({ calculate, roundUp });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ExamCalculator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
