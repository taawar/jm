import { gradeQuiz } from './progress-model.js';

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function node(tag, className, text) {
  const elemen = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}
export function setupEngagement(story, actions) {
  const controller = new AbortController();
  const quizRoot = document.querySelector('#quiz-content');
  const missionRoot = document.querySelector('#mission-list');
  let quizSignature;
  let feedbackId = null;

  function renderQuiz() {
    const result = actions.getProgress().quiz;
    const answers = result?.answers || [];
    const showFeedback = feedbackId && answers.some(function (answer) { return answer.id === feedbackId; });
    quizRoot.replaceChildren();
    if (result?.completed && !showFeedback) {
      const heading = node('h3', 'quiz-result-title', 'Bekalmu bertambah.');
      heading.tabIndex = -1;
      const score = node('p', 'quiz-score', result.score + ' / ' + result.total);
      score.setAttribute('aria-label', result.score + ' dari ' + result.total + ' jawaban benar');
      quizRoot.append(node('p', 'eyebrow', 'KUIS SELESAI'), score, heading, node('p', '', 'Setiap jawaban adalah kesempatan belajar. Misi kuis sudah tercatat; lanjutkan dua langkah kecil di Beraksi.'));
      const review = node('details', 'quiz-review');
      review.append(node('summary', '', 'Lihat kembali jawaban'));
      for (const [index, question] of story.kuis.entries()) {
        const row = node('div', 'quiz-review-row');
        row.append(node('h4', '', question.question), node('p', '', 'Jawabanmu: ' + question.options[answers[index].choice]), node('p', '', 'Jawaban benar: ' + question.options[question.answer]), node('p', '', question.feedback));
        review.append(row);
      }
      const links = node('div', 'quiz-actions');
      const continueLink = node('a', 'button button-primary', 'Lanjutkan misi ↗');
      continueLink.href = '#beraksi';
      const retry = node('button', 'button button-secondary', 'Ulangi kuis');
      retry.type = 'button';
      retry.addEventListener('click', function () {
        feedbackId = null;
        actions.commit(function (progress) { progress.quiz = null; });
        quizRoot.querySelector('legend').focus();
      });
      links.append(continueLink, retry);
      quizRoot.append(review, links, node('p', 'field-note', 'Mengulang kuis mengganti hasil ini dan membuka kembali misi kuis sampai semua soal dijawab.'));
      return;
    }
    const index = showFeedback ? answers.length - 1 : answers.length;
    const question = story.kuis[index];
    const form = node('form', 'quiz-form');
    const fieldset = node('fieldset');
    const legend = node('legend', '', question.question);
    legend.tabIndex = -1;
    fieldset.append(legend);
    const options = node('div', 'quiz-options');
    const stored = answers[index];
    for (const [choice, label] of question.options.entries()) {
      const row = node('label', 'quiz-option');
      const radio = node('input');
      radio.type = 'radio';
      radio.name = 'quiz-choice';
      radio.value = String(choice);
      radio.required = true;
      radio.checked = showFeedback && stored.choice === choice;
      radio.disabled = Boolean(showFeedback);
      if (showFeedback && choice === question.answer) row.classList.add('is-correct');
      if (showFeedback && stored.choice === choice && choice !== question.answer) row.classList.add('is-incorrect');
      row.append(radio, node('span', '', label));
      options.append(row);
    }
    fieldset.append(options);
    form.append(fieldset);
    quizRoot.append(node('p', 'eyebrow', 'SOAL ' + (index + 1) + ' / ' + story.kuis.length), form);
    if (showFeedback) {
      const correct = stored.choice === question.answer;
      const feedback = node('div', 'quiz-feedback');
      feedback.setAttribute('role', 'status');
      feedback.tabIndex = -1;
      feedback.append(node('strong', '', correct ? 'Tepat, kamu menangkap ceritanya.' : 'Belum tepat. Mari kenali lagi.'), node('p', '', 'Jawaban benar: ' + question.options[question.answer] + '.'), node('p', '', question.feedback));
      const next = node('button', 'button button-primary', result.completed ? 'Lihat hasil →' : 'Soal berikutnya →');
      next.type = 'button';
      next.addEventListener('click', function () {
        feedbackId = null;
        renderQuiz();
        quizRoot.querySelector('legend, h3').focus();
      });
      quizRoot.append(feedback, next);
    } else {
      const submit = node('button', 'button button-primary', 'Periksa jawaban →');
      submit.type = 'submit';
      form.append(submit);
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const checked = form.querySelector('input:checked');
        if (!checked) return;
        feedbackId = question.id;
        actions.commit(function (progress) {
          progress.quiz = gradeQuiz([...answers, { id: question.id, choice: Number(checked.value) }], story.kuis);
        });
        quizRoot.querySelector('.quiz-feedback').focus();
      });
    }
  }

  const checkboxes = new Map();
  missionRoot.replaceChildren();
  for (const [index, mission] of story.misi.entries()) {
    const row = node('li', 'mission-row');
    const label = node('label', 'mission-label');
    const checkbox = node('input');
    checkbox.type = 'checkbox';
    checkbox.disabled = mission.kind === 'quiz';
    checkbox.setAttribute('aria-label', mission.title);
    checkbox.setAttribute('aria-describedby', 'mission-note-' + mission.id);
    const text = node('span');
    text.append(node('span', 'eyebrow', 'MISI ' + String(index + 1).padStart(2, '0')), node('strong', '', mission.title));
    label.append(checkbox, text);
    const note = node('p', '', mission.description);
    note.id = 'mission-note-' + mission.id;
    row.append(label, note);
    const pesanKunci = node('p', 'field-note', 'Selesaikan misi sebelumnya dulu.');
    pesanKunci.hidden = true;
    row.append(pesanKunci);
    if (mission.kind === 'quiz') {
      const link = node('a', 'text-link', 'Buka kuis ↗');
      link.href = '#kuis';
      row.append(link, node('p', 'field-note', 'Otomatis selesai setelah semua soal dijawab, berapa pun skornya.'));
    } else {
      checkbox.addEventListener('change', function () {
        actions.commit(function (progress) {
          progress.completedMissions = progress.completedMissions.filter(function (id) { return id !== mission.id; });
          if (checkbox.checked) progress.completedMissions.push(mission.id);
        });
      });
    }
    checkboxes.set(mission.id, { checkbox, pesanKunci });
    missionRoot.append(row);
  }
  function sync() {
    const progress = actions.getProgress();
    const signature = JSON.stringify(progress.quiz);
    if (signature !== quizSignature) { quizSignature = signature; renderQuiz(); }
    for (const [index, mission] of story.misi.entries()) {
      const { checkbox, pesanKunci } = checkboxes.get(mission.id);
      const sebelumnyaSelesai = story.misi
        .slice(0, index)
        .every(function (item) { return progress.completedMissions.includes(item.id); });

      checkbox.checked = progress.completedMissions.includes(mission.id);
      checkbox.disabled = mission.kind === 'quiz' || !sebelumnyaSelesai;
      checkbox.closest('li').classList.toggle('is-complete', checkbox.checked);
      const terkunci = mission.kind !== 'quiz' && !sebelumnyaSelesai;
      pesanKunci.textContent = 'Selesaikan misi ' + index + ' dulu untuk membuka misi ini.';
      pesanKunci.hidden = !terkunci;
    }
    const count = progress.completedMissions.length;
    document.querySelector('#mission-count').textContent = count + ' dari ' + story.misi.length + ' misi selesai';
    const meter = document.querySelector('#mission-progress');
    meter.max = story.misi.length;
    meter.value = count;
  }
  return { sync, destroy: function () { controller.abort(); } };
}


