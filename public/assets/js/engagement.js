import { gradeQuiz, cardUnlocked } from './progress-model.js';

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function localAsset(path) {
  if (typeof path !== 'string' || !path.startsWith('/assets/') || path.includes('..') || path.includes('\\')) return null;
  const url = new URL(path, window.location.origin);
  return url.origin === window.location.origin ? url.pathname : null;
}

function sources(container, ids, story) {
  const links = node('div', 'scene-sources');
  for (const id of ids || []) {
    const source = story.sumber.find(function (entry) { return entry.id === id; });
    if (!source) continue;
    let url;
    try { url = new URL(source.url); } catch { continue; }
    if (url.protocol !== 'https:') continue;
    const link = node('a', '', source.publisher.split(' · ').pop() + ' ↗');
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', source.title + ', buka sumber di tab baru');
    links.append(link);
  }
  container.append(links);
}

function setupGallery(story, signal) {
  const track = document.querySelector('#gallery-track');
  const previous = document.querySelector('#gallery-previous');
  const next = document.querySelector('#gallery-next');
  const count = document.querySelector('#gallery-position');
  const slides = [];
  let selected = 0;
  let frame = 0;
  let drag;
  let suppressClick = false;
  track.replaceChildren();
  for (const [index, item] of story.galeri.entries()) {
    const slide = node('figure', 'gallery-slide');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'gambar');
    slide.setAttribute('aria-label', (index + 1) + ' dari ' + story.galeri.length + ': ' + item.title);
    const visual = node('div', 'gallery-visual');
    const image = node('img');
    const fallback = localAsset(item.illustration) || '/assets/img/leaf-study.svg';
    image.src = fallback;
    image.alt = item.illustrationAlt;
    image.width = 960;
    image.height = 540;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.draggable = false;
    const badge = node('span', 'gallery-badge', 'Ilustrasi original');
    const credit = node('p', 'gallery-credit', 'Ilustrasi Jejak Mbako. Foto dokumentasi belum tersedia.');
    const photo = localAsset(item.src);
    if (photo && item.status === 'siap') {
      image.addEventListener('error', function () {
        image.src = fallback;
        image.alt = item.illustrationAlt;
        badge.textContent = 'Ilustrasi pengganti';
        credit.textContent = 'Foto tidak dapat dimuat. Ilustrasi original Jejak Mbako.';
      }, { once: true, signal });
      image.src = photo;
      image.alt = item.alt;
      badge.textContent = 'Foto dokumentasi';
      credit.textContent = item.kredit;
    }
    visual.append(image, badge);
    const caption = node('figcaption');
    caption.append(node('span', 'eyebrow', String(index + 1).padStart(2, '0') + ' / RUANG KARYA'), node('h3', '', item.title), node('p', '', item.description), credit);
    slide.append(visual, caption);
    slides.push(slide);
    track.append(slide);
  }
  function position(index) {
    return slides[index].offsetLeft - slides[0].offsetLeft;
  }
  function update() {
    frame = 0;
    selected = slides.reduce(function (closest, slide, index) {
      return Math.abs(position(index) - track.scrollLeft) < Math.abs(position(closest) - track.scrollLeft) ? index : closest;
    }, 0);
    count.textContent = String(selected + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    previous.disabled = selected === 0;
    next.disabled = selected === slides.length - 1;
  }
  function go(index) {
    const target = Math.max(0, Math.min(slides.length - 1, index));
    track.scrollTo({ left: position(target), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    if ((target === 0 && document.activeElement === previous) || (target === slides.length - 1 && document.activeElement === next)) track.focus({ preventScroll: true });
  }
  previous.addEventListener('click', function () { go(selected - 1); }, { signal });
  next.addEventListener('click', function () { go(selected + 1); }, { signal });
  track.addEventListener('scroll', function () { if (!frame) frame = requestAnimationFrame(update); }, { passive: true, signal });
  track.addEventListener('keydown', function (event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    go(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : selected + (event.key === 'ArrowRight' ? 1 : -1));
  }, { signal });
  track.addEventListener('pointerdown', function (event) {
    if (event.pointerType === 'touch' || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, start: track.scrollLeft, moved: false };
    suppressClick = false;
  }, { signal });
  track.addEventListener('pointermove', function (event) {
    if (!drag || event.pointerId !== drag.id) return;
    const distance = event.clientX - drag.x;
    if (Math.abs(distance) > 6 && !drag.moved) {
      drag.moved = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
    }
    if (drag.moved) { event.preventDefault(); track.scrollLeft = drag.start - distance; }
  }, { signal });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = drag.moved;
    suppressClick = moved;
    drag = null;
    track.classList.remove('is-dragging');
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    if (moved) { update(); go(selected); }
  }
  track.addEventListener('pointerup', endDrag, { signal });
  track.addEventListener('pointercancel', endDrag, { signal });
  track.addEventListener('pointerleave', function (event) { if (drag && !drag.moved) endDrag(event); }, { signal });
  track.addEventListener('click', function (event) { if (suppressClick) { event.preventDefault(); suppressClick = false; } }, { capture: true, signal });
  window.addEventListener('resize', update, { signal });
  signal.addEventListener('abort', function () { cancelAnimationFrame(frame); }, { once: true });
  update();
}

function paintCard(canvas, nickname, total) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas-unavailable');
  const width = canvas.width;
  const height = canvas.height;
  ctx.fillStyle = '#17203A';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#D6A53A';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, width - 72, height - 72);
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.arc(1060, 650, 150 + i * 45, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#D6A53A';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('JEJAK MBAKO  /  TEMANGGUNG', 88, 108);
  ctx.fillStyle = '#F3EBDD';
  ctx.font = '600 66px Fraunces, Georgia, serif';
  ctx.fillText('Penjaga Cerita Lokal', 88, 224);
  ctx.fillStyle = '#B9C0D4';
  ctx.font = '400 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Jejak kecil ini milik', 88, 306);
  let size = 64;
  do {
    ctx.font = '600 ' + size + 'px Fraunces, Georgia, serif';
    if (ctx.measureText(nickname).width <= 1000) break;
    size -= 2;
  } while (size > 24);
  ctx.fillStyle = '#FFFDF8';
  ctx.fillText(nickname, 88, 395, 1000);
  ctx.fillStyle = '#D6A53A';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(total + ' MISI SELESAI  ·  KENALI. MAINKAN. BERAKSI.', 88, 493);
  ctx.fillStyle = '#F3EBDD';
  ctx.font = '400 27px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Dari daun jadi karya,', 88, 590);
  ctx.fillText('dari pemuda menuju 2045.', 88, 631);
  ctx.fillStyle = '#B9C0D4';
  ctx.font = '400 19px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Kenang-kenangan perjalanan belajar · Jejak Mbako', 88, 700);
}

export function setupEngagement(story, actions) {
  const controller = new AbortController();
  const signal = controller.signal;
  setupGallery(story, signal);
  const quizRoot = document.querySelector('#quiz-content');
  const missionRoot = document.querySelector('#mission-list');
  const canvas = document.querySelector('#keeper-canvas');
  const download = document.querySelector('#card-download');
  let quizSignature;
  let cardSignature;
  let feedbackId = null;
  let objectUrl;
  let cardVersion = 0;

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
      review.append(node('summary', '', 'Lihat kembali jawaban & sumber'));
      for (const [index, question] of story.kuis.entries()) {
        const row = node('div', 'quiz-review-row');
        row.append(node('h4', '', question.question), node('p', '', 'Jawabanmu: ' + question.options[answers[index].choice]), node('p', '', 'Jawaban benar: ' + question.options[question.answer]), node('p', '', question.feedback));
        sources(row, question.sourceIds, story);
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
      sources(feedback, question.sourceIds, story);
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
    checkboxes.set(mission.id, checkbox);
    missionRoot.append(row);
  }
  const ideas = document.querySelector('#idea-list');
  ideas.replaceChildren();
  for (const [index, idea] of story.ideUsaha.entries()) {
    const item = node('details', 'idea-item');
    const summary = node('summary');
    const plus = node('span', 'idea-plus', '+');
    plus.setAttribute('aria-hidden', 'true');
    summary.append(node('span', 'idea-number', String(index + 1).padStart(2, '0')), node('span', '', idea.title), plus);
    item.append(summary, node('p', '', idea.description), node('p', 'idea-skill', 'Bekal yang dilatih: ' + idea.skill), node('p', '', 'Mulai kecil: ' + idea.firstStep));
    ideas.append(item);
  }

  document.querySelector('#card-name').addEventListener('click', function (event) { actions.openNickname(event.currentTarget); }, { signal });
  document.querySelector('#card-retry').addEventListener('click', function () { cardSignature = null; sync(); }, { signal });
  async function updateCard(progress, unlocked) {
    const nickname = progress.nickname || 'Penjelajah';
    const signature = JSON.stringify([nickname, unlocked]);
    if (signature === cardSignature) return;
    cardSignature = signature;
    const version = ++cardVersion;
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    download.hidden = true;
    download.removeAttribute('href');
    canvas.hidden = !unlocked;
    document.querySelector('#card-locked').hidden = unlocked;
    document.querySelector('#card-retry').hidden = true;
    const status = document.querySelector('#card-status');
    if (!unlocked) { status.textContent = 'Selesaikan semua misi untuk membuka kartu.'; return; }
    status.textContent = 'Menyiapkan kartu untuk ' + nickname + '…';
    try {
      if (document.fonts) await document.fonts.ready;
      if (signal.aborted || version !== cardVersion) return;
      paintCard(canvas, nickname, story.misi.length);
      canvas.setAttribute('aria-label', 'Kartu Penjaga Cerita Lokal milik ' + nickname + ', ' + story.misi.length + ' misi selesai.');
      const blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
      if (signal.aborted || version !== cardVersion) return;
      if (!blob) throw new Error('png-unavailable');
      objectUrl = URL.createObjectURL(blob);
      download.href = objectUrl;
      download.hidden = false;
      status.textContent = 'Kartu ' + nickname + ' siap diunduh · PNG 1200 × 760.';
    } catch {
      status.textContent = 'Kartu belum dapat dibuat di browser ini. Coba siapkan ulang.';
      document.querySelector('#card-retry').hidden = false;
    }
  }

  function sync() {
    const progress = actions.getProgress();
    const signature = JSON.stringify(progress.quiz);
    if (signature !== quizSignature) { quizSignature = signature; renderQuiz(); }
    for (const [id, checkbox] of checkboxes) {
      checkbox.checked = progress.completedMissions.includes(id);
      checkbox.closest('li').classList.toggle('is-complete', checkbox.checked);
    }
    const count = progress.completedMissions.length;
    document.querySelector('#mission-count').textContent = count + ' dari ' + story.misi.length + ' misi selesai';
    const meter = document.querySelector('#mission-progress');
    meter.max = story.misi.length;
    meter.value = count;
    updateCard(progress, cardUnlocked(progress, story.misi));
  }
  signal.addEventListener('abort', function () { if (objectUrl) URL.revokeObjectURL(objectUrl); }, { once: true });
  return { sync, destroy: function () { controller.abort(); } };
}


