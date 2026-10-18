export function readingFraction(position, start, end) {
  if (![position, start, end].every(Number.isFinite) || end <= start) return 0;
  return Math.max(0, Math.min(1, (position - start) / (end - start)));
}

function threadPath(anchors, x, compact) {
  let path = 'M' + x + ' ' + anchors[0];
  for (let index = 1; index < anchors.length; index += 1) {
    const start = anchors[index - 1];
    const end = anchors[index];
    if (compact) path += ' L' + x + ' ' + end;
    else {
      const swing = index % 2 === 0 ? 14 : -14;
      const middle = (start + end) / 2;
      path +=
        ' C' +
        (x + swing) +
        ' ' +
        (middle - 40) +
        ' ' +
        (x - swing) +
        ' ' +
        (middle + 40) +
        ' ' +
        x +
        ' ' +
        end;
    }
  }
  return path;
}

export function setupCanting() {
  const main = document.querySelector('#story-main');
  const svg = document.querySelector('#canting-thread');
  const track = document.querySelector('#canting-track');
  const ink = document.querySelector('#canting-ink');
  const drop = document.querySelector('#canting-drop');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 800px), (pointer: coarse)');
  const controller = new AbortController();
  const options = { signal: controller.signal };
  let frame = 0;
  let needsMeasure = true;
  let metrics;

  function measure() {
    const base = main.getBoundingClientRect();
    const chapters = [...document.querySelectorAll('.chapter')];
    const finalChapter = chapters[chapters.length - 1];
    if (!finalChapter) return;
    const hero = document.querySelector('#beranda').getBoundingClientRect();
    const anchors = [hero.top - base.top + 100, hero.bottom - base.top];
    for (const chapter of chapters)
      anchors.push(chapter.getBoundingClientRect().top - base.top + 40);
    anchors.push(finalChapter.getBoundingClientRect().bottom - base.top - 48);
    const x = compact.matches ? 7 : Math.max(16, (base.width - 1120) / 2 - 32);
    const path = threadPath(anchors, x, compact.matches);
    svg.setAttribute('viewBox', '0 0 ' + base.width + ' ' + base.height);
    track.setAttribute('d', path);
    ink.setAttribute('d', path);
    const length = ink.getTotalLength();
    const absoluteTop = base.top + window.scrollY;
    metrics = {
      start: absoluteTop + anchors[0],
      end: absoluteTop + anchors[anchors.length - 1],
      length,
    };
    svg.dataset.motion = reduced.matches ? 'reduced' : 'full';
    svg.dataset.layout = compact.matches ? 'compact' : 'desktop';
  }

  function draw() {
    frame = 0;
    if (needsMeasure) {
      measure();
      needsMeasure = false;
    }
    if (!metrics) return;
    const readingLine = window.scrollY + window.innerHeight * 0.65;
    const fraction = reduced.matches
      ? 1
      : readingFraction(readingLine, metrics.start, metrics.end);
    ink.setAttribute('stroke-dasharray', String(metrics.length));
    ink.setAttribute(
      'stroke-dashoffset',
      String(metrics.length * (1 - fraction)),
    );
    const point = ink.getPointAtLength(metrics.length * fraction);
    drop.setAttribute('cx', String(point.x));
    drop.setAttribute('cy', String(point.y));
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function invalidate() {
    needsMeasure = true;
    schedule();
  }

  window.addEventListener(
    'scroll',
    function () {
      if (!reduced.matches) schedule();
    },
    { passive: true, signal: controller.signal },
  );
  window.addEventListener('resize', invalidate, options);
  reduced.addEventListener('change', invalidate, options);
  compact.addEventListener('change', invalidate, options);
  let resizeObserver;
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(invalidate);
    resizeObserver.observe(main);
  }
  if (document.fonts)
    document.fonts.ready.then(function () {
      if (!controller.signal.aborted) invalidate();
    });
  schedule();
  return function () {
    controller.abort();
    cancelAnimationFrame(frame);
    if (resizeObserver) resizeObserver.disconnect();
  };
}
