import test from 'node:test';
import assert from 'node:assert/strict';
import { setupCanting } from '../public/assets/js/story-scenes.js';

test('canting menghormati reduced motion, layout compact, dan satu render per frame', function (t) {
  const saved = new Map();
  const frames = new Map();
  let frameId = 0;
  let measurements = 0;
  let stop;
  function install(name, value) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  t.after(function () {
    if (stop) stop();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  function item(top = 0, bottom = 100) {
    return {
      dataset: {}, attributes: new Map(),
      getBoundingClientRect: function () { return { top, bottom, width: 1200, height: bottom - top }; },
      setAttribute: function (key, value) { this.attributes.set(key, value); },
      getTotalLength: function () { measurements += 1; return 1000; },
      getPointAtLength: function (value) { return { x: 7, y: value }; }
    };
  }
  const nodes = new Map([
    ['#story-main', item(80, 6000)], ['#beranda', item(80, 800)],
    ['#canting-thread', item()], ['#canting-track', item()], ['#canting-ink', item()],
    ['#canting-drop', item()], ['.future-scene', item(4400, 4900)]
  ]);
  const chapters = [item(900, 2800), item(2800, 5100)];
  const futurePaths = [item(), item(), item(), item(), item()];
  const reduced = Object.assign(new EventTarget(), { matches: false });
  const compact = Object.assign(new EventTarget(), { matches: false });
  const fakeWindow = Object.assign(new EventTarget(), { scrollY: 0, innerHeight: 900 });
  install('window', fakeWindow);
  install('document', {
    querySelector: function (selector) { return nodes.get(selector); },
    querySelectorAll: function (selector) { return selector === '.chapter' ? chapters : futurePaths; }
  });
  install('matchMedia', function (query) { return query.includes('reduced-motion') ? reduced : compact; });
  install('requestAnimationFrame', function (callback) { frames.set(++frameId, callback); return frameId; });
  install('cancelAnimationFrame', function (id) { frames.delete(id); });
  function flush() {
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback();
  }
  stop = setupCanting();
  flush();
  const initialMeasurements = measurements;
  fakeWindow.scrollY = 1700;
  for (let index = 0; index < 100; index += 1) fakeWindow.dispatchEvent(new Event('scroll'));
  assert.equal(frames.size, 1);
  flush();
  assert.equal(measurements, initialMeasurements);
  assert.ok(Number(nodes.get('#canting-ink').attributes.get('stroke-dashoffset')) > 0);

  reduced.matches = true;
  reduced.dispatchEvent(new Event('change'));
  flush();
  assert.equal(nodes.get('#canting-thread').dataset.motion, 'reduced');
  for (const path of [nodes.get('#canting-ink')]) assert.equal(path.attributes.get('stroke-dashoffset'), '0');
  fakeWindow.dispatchEvent(new Event('scroll'));
  assert.equal(frames.size, 0);

  compact.matches = true;
  compact.dispatchEvent(new Event('change'));
  flush();
  assert.equal(nodes.get('#canting-thread').dataset.layout, 'compact');
  assert.doesNotMatch(nodes.get('#canting-track').attributes.get('d'), /C/);
  stop();
  fakeWindow.dispatchEvent(new Event('resize'));
  assert.equal(frames.size, 0);
});
