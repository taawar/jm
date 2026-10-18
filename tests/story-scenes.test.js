import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readingFraction } from '../public/assets/js/story-scenes.js';

const story = JSON.parse(await readFile(new URL('../data/story.json', import.meta.url), 'utf8'));

test('garis berhenti pada batas cerita dan dapat mundur saat membaca ulang', function () {
  assert.equal(readingFraction(-10, 100, 1100), 0);
  assert.equal(readingFraction(100, 100, 1100), 0);
  assert.equal(readingFraction(600, 100, 1100), 0.5);
  assert.equal(readingFraction(1100, 100, 1100), 1);
  assert.equal(readingFraction(8000, 100, 1100), 1);
  assert.equal(readingFraction(350, 100, 1100), 0.25);
});

test('pengukuran kosong atau tidak valid tidak menghasilkan NaN', function () {
  assert.equal(readingFraction(400, 100, 100), 0);
  assert.equal(readingFraction(400, 500, 100), 0);
  assert.equal(readingFraction(NaN, 100, 1100), 0);
  assert.equal(readingFraction(400, 100, Infinity), 0);
});

test('ID bab lama tetap kompatibel dan interaksi fase 2 memiliki konten lengkap', function () {
  assert.ok(story.meta.phase >= 2);
  assert.deepEqual(story.bab.map(function (chapter) { return chapter.id; }), ['bab-1', 'bab-2', 'bab-3', 'bab-4', 'bab-5']);

});

test('setiap rujukan konten fase 2 menunjuk sumber yang ada', function () {
  const sourceIds = new Set(story.sumber.map(function (source) { return source.id; }));
  assert.equal(sourceIds.size, story.sumber.length);
  for (const item of story.bab) {
    for (const id of item.sourceIds || []) assert.ok(sourceIds.has(id), item.id + ': ' + id);
  }
  for (const source of story.sumber) assert.equal(new URL(source.url).protocol, 'https:');
});
