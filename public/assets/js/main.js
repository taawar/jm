import { createChapterScene, setupCanting } from './story-scenes.js';
import { freshProgress, validateProgress, storageKey, readStoredProgress, writeStoredProgress } from './progress-model.js';
import { setupEngagement } from './engagement.js';

const themes = new Set(['nila', 'kabut', 'lereng', 'mori', 'daun']);
let story;
let progress;
let storageAvailable = true;
let chapterObserver;
let sceneObserver;
let toastTimer;
let lastDialogTrigger;
let loading = false;
let stopCanting;
let engagement;
const visitedThisSession = new Set();

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function loadProgress() {
  const result = readStoredProgress(story);
  storageAvailable = result.available;
  return result.progress;
}

function saveProgress() {
  storageAvailable = writeStoredProgress(progress);
  updateStorageNote();
}

function updateStorageNote() {
  const note = document.querySelector('#storage-note');
  if (storageAvailable) {
    note.textContent = 'Nama, jawaban kuis, dan progres misi tersimpan hanya di browser ini.';
  } else {
    note.textContent = 'Penyimpanan browser tidak tersedia. Progres hanya bertahan selama halaman ini terbuka.';
  }
}

function showToast(message) {
  const toast = document.querySelector('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(function () { toast.hidden = true; }, 4500);
}

function openDialog(id, trigger) {
  lastDialogTrigger = trigger;
  const dialog = document.getElementById(id);
  if (!dialog.open) dialog.showModal();
}

function closeDialog(dialog) {
  dialog.close();
}

function setupDialogs() {
  document.querySelector('#help-open').addEventListener('click', function (event) {
    openDialog('help-dialog', event.currentTarget);
  });
  document.querySelector('#journey-open').addEventListener('click', function (event) {
    if (!story) {
      showToast('Cerita belum termuat. Coba muat ulang melalui bagian cerita.');
      return;
    }
    document.querySelector('#nickname').value = progress.nickname;
    openDialog('journey-dialog', event.currentTarget);
  });
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), [tabindex="0"]')].filter(function (control) { return control.getClientRects().length > 0; });
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    for (const closeButton of dialog.querySelectorAll('[data-close]')) {
      closeButton.addEventListener('click', function () { closeDialog(dialog); });
    }
    dialog.addEventListener('click', function (event) {
      const box = dialog.getBoundingClientRect();
      const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
      if (event.target === dialog && outside) closeDialog(dialog);
    });
    dialog.addEventListener('close', function () {
      document.querySelector('#reset-confirm').hidden = true;
      if (lastDialogTrigger) lastDialogTrigger.focus({ preventScroll: true });
    });
  }
  document.querySelector('#hotspot-continue').addEventListener('click', function () {
    closeDialog(document.querySelector('#hotspot-dialog'));
    setTimeout(function () { focusChapter('bab-1'); }, 0);
  });
  for (const link of document.querySelectorAll('[data-journey-link]')) {
    link.addEventListener('click', function () {
      closeDialog(document.querySelector('#journey-dialog'));
      setTimeout(function () { focusChapter(link.hash.slice(1)); }, 0);
    });
  }
}

function setupMenu() {
  const toggle = document.querySelector('#menu-toggle');
  const menu = document.querySelector('#main-nav');
  function closeMenu() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Buka menu');
  }
  toggle.addEventListener('click', function () {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    menu.classList.toggle('is-open', !expanded);
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.setAttribute('aria-label', expanded ? 'Buka menu' : 'Tutup menu');
  });
  for (const link of menu.querySelectorAll('a')) link.addEventListener('click', closeMenu);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      closeMenu();
      toggle.focus();
    }
  });
  document.addEventListener('click', function (event) {
    if (!event.target.closest('.site-header')) closeMenu();
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const id = link.hash.slice(1);
    setActiveNavigation(id);
    setTimeout(function () { focusChapter(id); }, 0);
  });
}

function setActiveNavigation(id) {
  let section = id;
  if (id.startsWith('bab-') || ['motif', 'proses'].includes(id)) section = 'cerita';
  if (id === 'selanjutnya') section = 'kuis';
  for (const link of document.querySelectorAll('#main-nav a')) {
    const active = link.hash === '#' + section;
    link.classList.toggle('nav-current', active);
    if (active) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}

function safeAsset(path) {
  if (typeof path !== 'string' || !path.startsWith('/assets/') || path.includes('..') || path.includes('\\')) return null;
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) return null;
  return url.pathname;
}

function safeSource(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function applyPhoto(image, caption, photo, fallback, fallbackCaption) {
  const source = photo ? safeAsset(photo.src) : null;
  if (!source || photo.status !== 'siap') return;
  image.addEventListener('error', function () {
    image.src = fallback;
    image.alt = fallbackCaption;
    caption.textContent = fallbackCaption;
  }, { once: true });
  image.src = source;
  image.alt = photo.alt;
  caption.textContent = photo.kredit;
}

function renderHero() {
  document.querySelector('#hero-eyebrow').textContent = story.hero.eyebrow;
  document.querySelector('#hero-subtitle').textContent = story.hero.subtitle;
  document.querySelector('#hero-description').textContent = story.hero.description;
  const hotspots = document.querySelector('#hero-hotspots');
  hotspots.replaceChildren();
  for (const hotspot of story.hero.hotspots) {
    if (!['gunung', 'kebun', 'kota'].includes(hotspot.id)) continue;
    const button = element('button', 'hotspot hotspot-' + hotspot.id);
    button.type = 'button';
    button.setAttribute('aria-label', 'Kenali ' + hotspot.label);
    button.setAttribute('aria-haspopup', 'dialog');
    const dot = element('span', 'hotspot-dot', '+');
    dot.setAttribute('aria-hidden', 'true');
    button.append(dot, element('span', 'hotspot-label', hotspot.label));
    button.addEventListener('click', function () {
      document.querySelector('#hotspot-title').textContent = hotspot.title;
      document.querySelector('#hotspot-text').textContent = hotspot.text;
      openDialog('hotspot-dialog', button);
    });
    hotspots.append(button);
  }
  applyPhoto(document.querySelector('#hero-image'), document.querySelector('#hero-caption'), story.hero.photo, story.hero.illustration, 'Ilustrasi original bentang alam Temanggung.');
}

function renderNavigation() {
  const overview = document.querySelector('#chapter-overview');
  const rail = document.querySelector('#chapter-rail');
  overview.replaceChildren();
  rail.replaceChildren();
  for (const chapter of story.bab) {
    const number = String(chapter.number).padStart(2, '0');
    const overviewLink = element('a', 'overview-link');
    overviewLink.href = '#' + chapter.id;
    overviewLink.dataset.chapter = chapter.id;
    const numberNode = element('span', 'overview-number', number);
    numberNode.append(element('span', '', '↗'));
    overviewLink.append(numberNode, element('span', 'overview-title', chapter.title));
    overview.append(overviewLink);
    const railLink = element('a', 'rail-link');
    railLink.href = '#' + chapter.id;
    railLink.dataset.chapter = chapter.id;
    railLink.append(element('span', 'rail-number', number), element('span', '', chapter.shortTitle));
    rail.append(railLink);
  }
}

function sourceLink(source, label) {
  const link = element('a', '', label || source.title);
  const url = safeSource(source.url);
  if (url) {
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', (label || source.title) + ', buka sumber di tab baru');
  }
  return link;
}

function renderChapter(chapter, index) {
  const section = element('section', 'chapter');
  section.id = chapter.id;
  section.dataset.theme = themes.has(chapter.theme) ? chapter.theme : 'mori';
  section.setAttribute('aria-labelledby', chapter.id + '-title');
  const header = element('div', 'chapter-header');
  const titleGroup = element('div');
  const label = 'BAB ' + String(chapter.number).padStart(2, '0') + ' / ' + chapter.eyebrow;
  titleGroup.append(element('p', 'eyebrow', label));
  const title = element('h2', '', chapter.title);
  title.id = chapter.id + '-title';
  title.tabIndex = -1;
  titleGroup.append(title);
  const stamp = element('span', 'chapter-stamp', String(chapter.number).padStart(2, '0'));
  stamp.setAttribute('aria-hidden', 'true');
  header.append(titleGroup, stamp);
  const figure = element('figure', 'chapter-figure');
  const image = element('img', 'chapter-image');
  image.src = safeAsset(chapter.illustration) || '/assets/img/leaf-study.svg';
  image.alt = chapter.visualTitle;
  image.width = 640;
  image.height = 560;
  image.loading = 'lazy';
  image.decoding = 'async';
  const caption = element('figcaption', '', chapter.visualCaption);
  figure.append(image, caption);
  applyPhoto(image, caption, chapter.photo, chapter.illustration, chapter.visualCaption);
  const prose = element('div', 'chapter-prose');
  for (const paragraph of chapter.paragraphs) prose.append(element('p', '', paragraph));
  const lesson = element('div', 'lesson');
  lesson.append(element('p', 'eyebrow', 'BEKAL UNTUK PEMUDA'), element('p', '', chapter.lesson));
  const sources = element('div', 'chapter-sources');
  sources.append(element('span', '', 'Jejak sumber:'));
  for (const id of chapter.sourceIds) {
    const source = story.sumber.find(function (item) { return item.id === id; });
    if (source) sources.append(sourceLink(source, source.publisher.split(' · ').pop()));
  }
  const end = element('div', 'chapter-end');
  const status = element('span', 'chapter-completion', 'Tandai selesai dengan melanjutkan');
  status.dataset.status = chapter.id;
  const nextButton = element('button', 'button button-primary', chapter.nextLabel);
  nextButton.type = 'button';
  const arrow = element('span', '', '→');
  arrow.setAttribute('aria-hidden', 'true');
  nextButton.append(arrow);
  nextButton.addEventListener('click', function () { completeChapter(chapter, index); });
  end.append(status, nextButton);
  const scene = createChapterScene(chapter, story);
  section.append(header, element('p', 'chapter-summary', chapter.summary), scene || figure, prose);
  if (chapter.reflection) {
    const reflection = element('aside', 'chapter-reflection');
    reflection.append(element('p', 'eyebrow', 'COBA PIKIRKAN'), element('p', '', chapter.reflection));
    section.append(reflection);
  }
  section.append(lesson, sources, end);
  return section;
}

function renderSources() {
  const list = document.querySelector('#source-list');
  list.replaceChildren();
  for (const source of story.sumber) {
    const row = element('div', 'source-entry');
    row.append(sourceLink(source), element('p', '', source.publisher), element('p', '', source.note));
    list.append(row);
  }
}

function updateProgressUI() {
  const completed = progress.completedChapters.length;
  document.querySelector('#journey-count').textContent = completed + ' dari ' + story.bab.length + ' bab · ' + progress.completedMissions.length + ' misi';
  document.querySelector('#mobile-progress').max = story.bab.length;
  document.querySelector('#mobile-progress').value = completed;
  const dots = document.querySelector('#journey-dots');
  dots.replaceChildren();
  for (const chapter of story.bab) dots.append(element('i', progress.completedChapters.includes(chapter.id) ? 'is-complete' : ''));
  for (const link of document.querySelectorAll('[data-chapter]')) {
    const isComplete = progress.completedChapters.includes(link.dataset.chapter);
    link.classList.toggle('is-complete', isComplete);
    const number = link.querySelector('.rail-number');
    if (number) number.textContent = isComplete ? '✓' : String(story.bab.find(function (chapter) { return chapter.id === link.dataset.chapter; }).number).padStart(2, '0');
  }
  for (const status of document.querySelectorAll('[data-status]')) {
    status.textContent = progress.completedChapters.includes(status.dataset.status) ? '✓ Jejak bab tersimpan' : 'Tandai selesai dengan melanjutkan';
    if (!storageAvailable && progress.completedChapters.includes(status.dataset.status)) status.textContent = '✓ Selesai untuk sesi ini';
  }
  const greeting = progress.nickname ? progress.nickname + ', ' : '';
  document.querySelector('#journey-summary').textContent = greeting + completed + ' dari ' + story.bab.length + ' bab sudah kamu selesaikan.';
  const list = document.querySelector('#journey-chapters');
  list.replaceChildren();
  for (const chapter of story.bab) {
    const complete = progress.completedChapters.includes(chapter.id);
    const row = element('li');
    const link = element('a');
    link.href = '#' + chapter.id;
    link.append(element('span', '', complete ? '✓' : String(chapter.number).padStart(2, '0')), element('span', '', chapter.title), element('span', '', complete ? 'Selesai' : 'Baca →'));
    link.addEventListener('click', function () {
      closeDialog(document.querySelector('#journey-dialog'));
      setTimeout(function () { focusChapter(chapter.id); }, 0);
    });
    row.append(link);
    list.append(row);
  }
  const start = document.querySelector('#start-story');
  const lastChapter = progress.lastChapter || story.bab[0].id;
  start.href = '#' + lastChapter;
  start.replaceChildren(document.createTextNode(progress.lastChapter ? 'Lanjutkan cerita ' : story.hero.cta + ' '));
  const arrow = element('span', '', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  start.append(arrow);
  updateStorageNote();
  const quizStatus = document.querySelector('#journey-quiz-status');
  quizStatus.textContent = progress.quiz?.completed ? 'Kuis selesai · ' + progress.quiz.score + ' dari ' + progress.quiz.total + ' benar' : progress.quiz?.answers.length ? 'Kuis · ' + progress.quiz.answers.length + ' soal dijawab' : 'Kuis belum dimulai';
  if (engagement) engagement.sync();
}

function focusChapter(id) {
  const target = document.getElementById(id);
  if (!target) return;
  const heading = target.querySelector('h1, h2, h3');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

function completeChapter(chapter, index) {
  if (!progress.completedChapters.includes(chapter.id)) progress.completedChapters.push(chapter.id);
  const next = story.bab[index + 1];
  if (next) progress.lastChapter = next.id;
  saveProgress();
  updateProgressUI();
  if (next) {
    window.location.hash = next.id;
    focusChapter(next.id);
  } else {
    window.location.hash = 'selanjutnya';
    focusChapter('selanjutnya');
    const allDone = progress.completedChapters.length === story.bab.length;
    showToast(allDone ? 'Lima jejak selesai. Terima kasih sudah mengenal cerita ini.' : 'Bab 5 selesai. Bab lain masih bisa kamu jelajahi melalui Perjalananmu.');
  }
}

function markActiveChapter(chapterId) {
  const chapter = story.bab.find(function (item) { return item.id === chapterId; });
  if (!chapter) return;
  document.body.dataset.theme = themes.has(chapter.theme) ? chapter.theme : 'mori';
  setActiveNavigation(chapterId);
  for (const link of document.querySelectorAll('.rail-link')) {
    if (link.dataset.chapter === chapterId) link.setAttribute('aria-current', 'step');
    else link.removeAttribute('aria-current');
  }
  if (progress.lastChapter !== chapterId) {
    progress.lastChapter = chapterId;
    saveProgress();
    updateProgressUI();
  }
  if (!visitedThisSession.has(chapterId)) {
    visitedThisSession.add(chapterId);
    recordVisit(chapterId);
  }
}

async function recordVisit(chapterId) {
  try {
    await fetch('/api/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chapterId: chapterId }), signal: AbortSignal.timeout(5000) });
  } catch {
    return;
  }
}

function observeChapters() {
  if (chapterObserver) chapterObserver.disconnect();
  if (sceneObserver) sceneObserver.disconnect();
  if (!('IntersectionObserver' in window)) {
    document.body.dataset.theme = 'mori';
    return;
  }
  chapterObserver = new IntersectionObserver(function (entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) markActiveChapter(entry.target.id);
    }
  }, { rootMargin: '-20% 0px -55% 0px', threshold: 0 });
  for (const chapter of document.querySelectorAll('.chapter')) chapterObserver.observe(chapter);
  sceneObserver = new IntersectionObserver(function (entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        document.body.dataset.theme = entry.target.dataset.theme || 'mori';
        setActiveNavigation(entry.target.id);
      }
    }
  }, { rootMargin: '-10% 0px -60% 0px', threshold: 0 });
  for (const id of ['beranda', 'cerita', 'selanjutnya', 'kuis', 'beraksi', 'sumber']) {
    const bagian = document.getElementById(id);
    if (bagian) sceneObserver.observe(bagian);
  }
}

function setupMotion() {
  const art = document.querySelector('#hero-art');
  const allowed = matchMedia('(min-width: 801px) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  let scheduled = false;
  art.addEventListener('pointermove', function (event) {
    if (!allowed.matches || scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () {
      const bounds = art.getBoundingClientRect();
      art.dataset.drift = event.clientX < bounds.left + bounds.width / 2 ? 'left' : 'right';
      scheduled = false;
    });
  }, { passive: true });
  art.addEventListener('pointerleave', function () { delete art.dataset.drift; });
  allowed.addEventListener('change', function () { delete art.dataset.drift; });
}

function setupProgressActions() {
  document.querySelector('#nickname-form').addEventListener('submit', function (event) {
    event.preventDefault();
    if (!progress) return;
    progress.nickname = [...document.querySelector('#nickname').value.trim()].slice(0, 24).join('');
    saveProgress();
    updateProgressUI();
    document.querySelector('#nickname-note').textContent = storageAvailable ? 'Nama panggilan tersimpan hanya di browser ini.' : 'Nama hanya disimpan selama halaman ini terbuka.';
  });
  document.querySelector('#reset-open').addEventListener('click', function () {
    document.querySelector('#reset-confirm').hidden = false;
    document.querySelector('#reset-cancel').focus();
  });
  document.querySelector('#reset-cancel').addEventListener('click', function () {
    document.querySelector('#reset-confirm').hidden = true;
    document.querySelector('#reset-open').focus();
  });
  document.querySelector('#reset-confirm-button').addEventListener('click', function () {
    progress = freshProgress();
    saveProgress();
    updateProgressUI();
    document.querySelector('#nickname').value = '';
    document.querySelector('#reset-confirm').hidden = true;
    closeDialog(document.querySelector('#journey-dialog'));
    window.location.hash = 'beranda';
    document.querySelector('#beranda').scrollIntoView({ behavior: 'instant', block: 'start' });
    showToast('Perjalanan di browser ini sudah dimulai ulang.');
  });
  window.addEventListener('storage', function (event) {
    if (!story || (event.key !== storageKey && event.key !== null)) return;
    progress = loadProgress();
    updateProgressUI();
    document.querySelector('#nickname').value = progress.nickname;
  });
}

async function loadStory() {
  if (loading) return;
  loading = true;
  const retry = document.querySelector('#retry-story');
  const chapters = document.querySelector('#chapters');
  const loadState = document.querySelector('#load-state');
  retry.hidden = true;
  chapters.setAttribute('aria-busy', 'true');
  document.querySelector('#load-message').textContent = 'Menyiapkan perjalananmu…';
  try {
    const response = await fetch('/api/story', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('story-unavailable');
    story = await response.json();
    if (!Array.isArray(story.bab) || story.bab.length === 0) throw new Error('story-invalid');
    progress = loadProgress();
    renderHero();
    renderNavigation();
    const fragment = document.createDocumentFragment();
    for (const [index, chapter] of story.bab.entries()) fragment.append(renderChapter(chapter, index));
    renderSources();
    chapters.replaceChildren(fragment);
    if (engagement) engagement.destroy();
    engagement = setupEngagement(story, {
      getProgress: function () { return progress; },
      commit: function (change) {
        change(progress);
        progress = validateProgress(progress, story);
        saveProgress();
        updateProgressUI();
      }
    });
    document.querySelector('#engagement-sections').hidden = false;
    updateProgressUI();
    observeChapters();
    if (stopCanting) stopCanting();
    stopCanting = setupCanting();
    if (window.location.hash) {
      const target = document.getElementById(window.location.hash.slice(1));
      if (target) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
    setActiveNavigation(window.location.hash.slice(1));
  } catch {
    if (chapterObserver) chapterObserver.disconnect();
    if (sceneObserver) sceneObserver.disconnect();
    if (stopCanting) { stopCanting(); stopCanting = null; }
    if (engagement) { engagement.destroy(); engagement = null; }
    document.querySelector('#engagement-sections').hidden = true;
    story = null;
    chapters.replaceChildren(loadState);
    document.querySelector('#load-message').textContent = 'Cerita belum dapat dimuat. Pastikan server lokal berjalan, lalu coba lagi.';
    retry.hidden = false;
  } finally {
    loading = false;
    chapters.setAttribute('aria-busy', 'false');
  }
}

setupDialogs();
setupMenu();
setupMotion();
setupProgressActions();
window.addEventListener('hashchange', function () { setActiveNavigation(window.location.hash.slice(1)); });
document.querySelector('#retry-story').addEventListener('click', loadStory);
loadStory();
