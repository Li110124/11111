(function () {
  'use strict';
  const form = document.getElementById('score-form');
  const error = document.getElementById('error');
  const result = document.getElementById('result');
  const metrics = document.getElementById('result-metrics');
  const scenarios = document.getElementById('scenarios');
  const rows = document.getElementById('scenario-rows');
  const emptyState = document.getElementById('empty-state');
  const format = value => value.toFixed(2);
  const put = (id, text) => { document.getElementById(id).textContent = text; };

  function readInput() {
    return Object.fromEntries(['completedWeight', 'currentScore', 'targetScore', 'remainingWeight']
      .map(key => [key, form.elements.namedItem(key).valueAsNumber]));
  }

  function render() {
    let data;
    let input;
    try {
      input = readInput();
      data = ExamCalculator.calculate(input);
    } catch (exception) {
      error.textContent = exception.message;
      error.hidden = false;
      result.hidden = true;
      metrics.hidden = true;
      scenarios.hidden = true;
      emptyState.hidden = false;
      rows.replaceChildren();
      return;
    }
    error.hidden = true;
    error.textContent = '';
    result.hidden = false;
    metrics.hidden = false;
    emptyState.hidden = true;
    const finished = data.requiredScore === null;
    scenarios.hidden = finished;
    const status = document.getElementById('status');
    const missed = data.status === 'impossible' || data.status === 'completed-missed';
    status.className = `badge ${missed ? 'badge-missed' : 'badge-met'}`;
    put('earned-score', `${format(data.earnedScore)} 分`);
    put('maximum-score', `${format(data.maximumScore)} 分`);
    put('score-unit', '分');

    if (finished) {
      put('status', missed ? '考试已结束 · 未达标' : '考试已结束 · 已达标');
      put('result-label', '最终总分');
      put('required-score', format(data.earnedScore));
      put('result-explanation', '剩余权重为 0%，没有剩余考试可调整成绩。');
    } else if (data.status === 'impossible') {
      put('status', '目标暂不可实现');
      put('result-label', '理论所需平均分（超过满分）');
      put('required-score', format(data.requiredScore));
      put('result-explanation', `即使剩余部分拿到 100 分，总分也只能达到 ${format(data.maximumScore)} 分，低于目标 ${format(input.targetScore)} 分。`);
    } else if (data.status === 'secured') {
      put('status', '目标已保障');
      put('result-label', '剩余部分至少需要');
      put('required-score', '0.00');
      put('result-explanation', '已累计的总分已达到目标；即使剩余部分为 0 分，也能达标。仍需留意学校的单项及格要求。');
    } else {
      put('status', '目标可以实现');
      put('result-label', '剩余部分所需平均分');
      put('required-score', format(data.suggestedScore));
      put('result-explanation', `剩余部分的加权平均分达到 ${format(data.suggestedScore)} 分，即可让总分至少达到 ${format(input.targetScore)} 分。所需分数已向上保留两位小数。`);
    }

    const fragment = document.createDocumentFragment();
    for (const scenario of data.scenarios) {
      const row = document.createElement('tr');
      if (scenario.score === data.suggestedScore) row.className = 'suggested-row';
      const score = document.createElement('td');
      score.textContent = `${format(scenario.score)} 分`;
      if (scenario.score === data.suggestedScore) {
        const note = document.createElement('span');
        note.className = 'row-note';
        note.textContent = '最低建议';
        score.append(note);
      }
      const finalScore = document.createElement('td');
      finalScore.textContent = `${format(scenario.finalScore)} 分`;
      const outcome = document.createElement('td');
      outcome.className = scenario.meetsTarget ? 'met' : 'missed';
      outcome.textContent = scenario.meetsTarget ? '✓ 达标' : '未达标';
      row.append(score, finalScore, outcome);
      fragment.append(row);
    }
    rows.replaceChildren(fragment);
  }

  form.addEventListener('input', render);
  form.addEventListener('submit', event => { event.preventDefault(); render(); });
  form.addEventListener('reset', () => { setTimeout(render, 0); });
  document.getElementById('fill-remaining').addEventListener('click', () => {
    const completed = form.elements.namedItem('completedWeight').valueAsNumber;
    if (Number.isFinite(completed) && completed >= 0 && completed <= 100) {
      form.elements.namedItem('remainingWeight').value = Number((100 - completed).toFixed(10));
    }
    render();
  });
  render();
})();
