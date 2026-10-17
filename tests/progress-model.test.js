import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { gradeQuiz, validateProgress, freshProgress, storageKey, readStoredProgress, writeStoredProgress } from '../public/assets/js/progress-model.js';

const story = JSON.parse(await readFile(new URL('../data/story.json', import.meta.url), 'utf8'));
const correct = story.kuis.map(function (question) { return { id: question.id, choice: question.answer }; });

test('hasil dihitung dari jawaban; skor dan status kiriman tidak dipercaya', function () {
  const input = { ...freshProgress(), completedMissions: ['kuis'], quiz: { answers: correct.slice(0, 1), score: 999, completed: true } };
  const clean = validateProgress(input, story);
  assert.equal(clean.quiz.score, 1);
  assert.equal(clean.quiz.completed, false);
  assert.deepEqual(clean.completedMissions, []);
  assert.equal(clean.completedMissions.length === story.misi.length, false);
});

test('jawaban rusak, duplikat, atau urutan lama berhenti pada bagian yang valid', function () {
  for (const invalid of [{ id: correct[1].id, choice: -1 }, { id: correct[1].id, choice: 99 }, { id: correct[1].id, choice: '1' }, correct[0], null]) {
    assert.deepEqual(gradeQuiz([correct[0], invalid, correct[2]], story.kuis).answers, [correct[0]]);
  }
  assert.equal(gradeQuiz(null, story.kuis).score, 0);
  assert.equal(gradeQuiz([], []).completed, false);
});

test('misi kuis selesai setelah semua jawaban, termasuk bila skor nol', function () {
  const wrong = story.kuis.map(function (question) { return { id: question.id, choice: (question.answer + 1) % question.options.length }; });
  const clean = validateProgress({ quiz: { answers: wrong }, completedMissions: ['cerita', 'bagikan'] }, story);
  assert.equal(clean.quiz.score, 0);
  assert.equal(clean.quiz.completed, true);
  assert.equal(clean.completedMissions.length === story.misi.length, true);
});

test('mengulang kuis membatalkan misi kuis tanpa menghapus dua misi manual', function () {
  const clean = validateProgress({ completedMissions: ['kuis', 'cerita', 'bagikan'], quiz: null }, story);
  assert.deepEqual(clean.completedMissions, ['cerita', 'bagikan']);
  assert.equal(clean.completedMissions.length === story.misi.length, false);
  const restored = validateProgress({ ...clean, quiz: { answers: correct } }, story);
  assert.equal(restored.completedMissions.length === story.misi.length, true);
  const unchecked = validateProgress({ ...restored, completedMissions: ['kuis', 'cerita'] }, story);
  assert.equal(unchecked.completedMissions.length === story.misi.length, false);
});

test('progres fase 2 dipertahankan, ID asing dibuang, dan input tidak dimutasi', function () {
  const input = { nickname: '  Ayu  ', completedChapters: ['bab-1', 'bab-1', 'asing'], lastChapter: 'bab-3', completedMissions: ['asing'], quiz: { score: 3 } };
  const before = structuredClone(input);
  const clean = validateProgress(input, story);
  assert.equal(clean.nickname, 'Ayu');
  assert.deepEqual(clean.completedChapters, ['bab-1']);
  assert.equal(clean.lastChapter, 'bab-3');
  assert.equal(clean.quiz, null);
  assert.deepEqual(input, before);
  for (const malformed of [null, [], 'teks', 42]) assert.deepEqual(validateProgress(malformed, story), freshProgress());
});

test('round-trip progres lengkap tetap menyimpan semua misi', function () {
  const input = { ...freshProgress(), nickname: '<Ayu & teman>', quiz: { answers: correct }, completedMissions: ['cerita', 'bagikan'] };
  const clean = validateProgress(input, story);
  assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(clean)), story), clean);
  assert.equal(clean.completedMissions.length === story.misi.length, true);
  assert.equal(validateProgress({ nickname: '🌿'.repeat(30) }, story).nickname, '🌿'.repeat(24));
});

test('konten fase 3 lengkap, ilustrasi lokal ada, dan kuis memiliki sumber', async function () {
  assert.ok(story.meta.phase >= 3);
  assert.equal(story.kuis.length, 3);
  assert.equal(story.misi.length, 3);
  assert.equal(story.ideUsaha.length, 6);
  for (const item of story.galeri) {
    assert.match(item.illustration, /^\/assets\//);
    await access(new URL('../public' + item.illustration, import.meta.url));
    assert.ok(item.title && item.description && item.illustrationAlt);
  }
  const ids = new Set(story.sumber.map(function (source) { return source.id; }));
  for (const question of story.kuis) {
    assert.ok(Number.isInteger(question.answer) && question.answer >= 0 && question.answer < question.options.length);
    assert.ok(question.feedback);
    for (const id of question.sourceIds) assert.ok(ids.has(id));
  }
  for (const idea of story.ideUsaha) assert.ok(idea.skill && idea.firstStep);
});

test('storage diblokir tetap mengembalikan progres sesi tanpa melempar error', function () {
  const denied = function () { throw new DOMException('Blocked', 'SecurityError'); };
  assert.deepEqual(readStoredProgress(story, denied), { progress: freshProgress(), available: false });
  const progress = { ...freshProgress(), nickname: 'Nama sesi' };
  assert.equal(writeStoredProgress(progress, denied), false);
  assert.equal(progress.nickname, 'Nama sesi');
});

test('JSON rusak dapat pulih dan penyimpanan penuh tidak menghapus data lain', function () {
  const data = new Map([[storageKey, '{rusak'], ['aplikasi-lain', 'tetap']]);
  const storage = { getItem: function (key) { return data.get(key); }, setItem: function (key, value) { data.set(key, value); } };
  assert.deepEqual(readStoredProgress(story, function () { return storage; }), { progress: freshProgress(), available: true });
  assert.equal(writeStoredProgress(freshProgress(), function () { return storage; }), true);
  assert.equal(data.get('aplikasi-lain'), 'tetap');
  storage.setItem = function () { throw new DOMException('Full', 'QuotaExceededError'); };
  assert.equal(writeStoredProgress({ ...freshProgress(), nickname: 'Ayu' }, function () { return storage; }), false);
  assert.deepEqual(JSON.parse(data.get(storageKey)), freshProgress());
});
