function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = text;
  return item;
}

function svgNode(tag, attributes = {}) {
  const item = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes))
    item.setAttribute(key, String(value));
  return item;
}

function addSources(container, ids, story) {
  const sources = node('div', 'scene-sources');
  for (const id of ids || []) {
    const source = story.sumber.find(function (item) {
      return item.id === id;
    });
    if (!source) continue;
    let url;
    try {
      url = new URL(source.url);
    } catch {
      continue;
    }
    if (url.protocol !== 'https:') continue;
    const link = node('a', '', source.publisher.split(' · ').pop() + ' ↗');
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', source.title + ', buka sumber di tab baru');
    sources.append(link);
  }
  if (sources.childElementCount) container.append(sources);
}

function makeTabs(items, prefix, label, select) {
  const list = node('div', 'scene-tabs');
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', label);
  const tabs = [];
  for (const [index, item] of items.entries()) {
    const tab = node('button', 'scene-tab');
    tab.type = 'button';
    tab.id = prefix + '-tab-' + item.id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', prefix + '-panel');
    const number = node(
      'span',
      'tab-number',
      String(index + 1).padStart(2, '0'),
    );
    number.setAttribute('aria-hidden', 'true');
    tab.append(
      number,
      node('span', '', item.shortTitle || item.name || item.label),
    );
    tab.addEventListener('click', function () {
      select(index);
    });
    tab.addEventListener('keydown', function (event) {
      let next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
        next = (index + 1) % items.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
        next = (index - 1 + items.length) % items.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = items.length - 1;
      else return;
      event.preventDefault();
      select(next);
      tabs[next].focus({ preventScroll: true });
    });
    tabs.push(tab);
    list.append(tab);
  }
  return { list, tabs };
}

function updateTabs(tabs, selected) {
  for (const [index, tab] of tabs.entries()) {
    tab.setAttribute('aria-selected', String(index === selected));
    tab.tabIndex = index === selected ? 0 : -1;
  }
}

function makeMarker(item, index, prefix, select) {
  const button = node('button', 'scene-marker');
  button.type = 'button';
  const x = Number.isFinite(item.x) ? Math.max(5, Math.min(95, item.x)) : 50;
  const y = Number.isFinite(item.y) ? Math.max(5, Math.min(95, item.y)) : 50;
  button.style.left = x + '%';
  button.style.top = y + '%';
  button.setAttribute('aria-label', 'Pilih ' + (item.name || item.label));
  button.setAttribute('aria-controls', prefix + '-panel');
  button.append(
    node('span', 'marker-number', String(index + 1).padStart(2, '0')),
  );
  const label = node('span', 'marker-name', item.name || item.label);
  label.setAttribute('aria-hidden', 'true');
  button.append(label);
  button.addEventListener('click', function () {
    select(index);
  });
  return button;
}

function makeExplorer(settings, story) {
  const root = node('section', 'story-scene ' + settings.className);
  root.id = settings.id;
  root.setAttribute('aria-labelledby', settings.id + '-title');
  const heading = node('h3', '', settings.title);
  heading.id = settings.id + '-title';
  root.append(
    node('p', 'eyebrow', settings.eyebrow),
    heading,
    node('p', 'scene-intro', settings.description),
  );
  const stage = node('div', 'scene-stage');
  const image = node('img', 'scene-image');
  image.src = settings.image;
  image.width = settings.width;
  image.height = settings.height;
  image.alt = settings.alt;
  image.loading = 'lazy';
  image.decoding = 'async';
  stage.append(image);
  const panel = node('div', 'scene-panel');
  panel.id = settings.id + '-panel';
  panel.setAttribute('role', 'tabpanel');
  panel.tabIndex = 0;
  const status = node('p', 'sr-only');
  status.setAttribute('role', 'status');
  const markers = [];
  let controls;
  function select(index, announce = true) {
    const item = settings.items[index];
    updateTabs(controls.tabs, index);
    for (const [markerIndex, marker] of markers.entries())
      marker.setAttribute('aria-pressed', String(markerIndex === index));
    panel.setAttribute('aria-labelledby', controls.tabs[index].id);
    panel.replaceChildren(
      node('p', 'eyebrow', item.category),
      node('h4', '', item.title || item.name),
    );
    if (item.location) panel.append(node('p', 'place-location', item.location));
    panel.append(node('p', 'scene-description', item.text));
    if (item.note) panel.append(node('p', 'verification-note', item.note));
    if (item.prompt) panel.append(node('p', 'scene-prompt', item.prompt));
    addSources(panel, item.sourceIds, story);
    if (announce)
      status.textContent =
        (item.name || item.label) +
        ' dipilih. Ceritanya tersedia di panel setelah daftar pilihan.';
  }
  controls = makeTabs(settings.items, settings.id, settings.tabsLabel, select);
  for (const [index, item] of settings.items.entries()) {
    const marker = makeMarker(item, index, settings.id, select);
    markers.push(marker);
    stage.append(marker);
  }
  root.append(
    stage,
    node('p', 'scene-caption', settings.caption),
    controls.list,
    panel,
    status,
  );
  select(0, false);
  return root;
}

export function createMap(story) {
  return makeExplorer(
    {
      id: 'peta',
      className: 'map-scene',
      eyebrow: 'PETA CERITA / TEMANGGUNG',
      title: story.peta.title,
      description: story.peta.description,
      items: story.peta.points,
      image: '/assets/img/story-map.svg',
      width: 760,
      height: 480,
      alt: 'Peta ilustratif dengan dua gunung, kebun, embung, sungai, dan ruang kota.',
      caption: story.peta.caption,
      tabsLabel: 'Pilih tempat di Temanggung',
    },
    story,
  );
}

function createMotif(story) {
  return makeExplorer(
    {
      id: 'motif',
      className: 'motif-scene',
      eyebrow: 'DEKATI KAINNYA',
      title: 'Baca cerita di antara garis.',
      description:
        'Pilih titik pada kain atau gunakan pilihan di bawah. Mulai dari bentuk, ikuti garis, lalu temukan iramanya.',
      items: story.motifHotspot,
      image: '/assets/img/cloth.svg',
      width: 640,
      height: 560,
      alt: 'Kain ilustrasi original dengan pola daun dan titik berulang berwarna emas di atas nila.',
      caption:
        'Motif original Jejak Mbako. Bukan reproduksi atau contoh motif resmi Ron Mbako maupun Rigen Mbako.',
      tabsLabel: 'Pilih unsur motif',
    },
    story,
  );
}

function createProcessArt() {
  const art = svgNode('svg', {
    viewBox: '0 0 640 400',
    class: 'process-art',
    role: 'img',
  });
  art.append(
    svgNode('ellipse', {
      cx: 320,
      cy: 351,
      rx: 233,
      ry: 17,
      class: 'fabric-shadow',
    }),
  );
  art.append(
    svgNode('rect', {
      x: 95,
      y: 45,
      width: 450,
      height: 292,
      rx: 8,
      class: 'process-fabric',
    }),
  );
  const guide = svgNode('path', {
    d: 'M113 62H527V320H113ZM248 62V320M392 62V320M113 190H527',
    class: 'process-guides',
  });
  art.append(guide);
  const pattern = svgNode('g', { class: 'process-pattern' });
  for (const x of [132, 275, 418]) {
    for (const y of [78, 208]) {
      const leaf = svgNode('g', {
        transform: 'translate(' + x + ' ' + y + ')',
      });
      leaf.append(
        svgNode('path', {
          d: 'M22 90C-5 54 23 11 89 5 99 53 64 95 22 90ZM13 103 80 17M37 72 24 43M52 50 76 44',
          class: 'process-leaf',
        }),
      );
      pattern.append(leaf);
    }
  }
  art.append(pattern);
  art.append(
    svgNode('path', {
      d: 'M489 58 572 21 581 41 499 78 480 80Z M490 59 499 78',
      class: 'process-pencil',
    }),
  );
  const canting = svgNode('g', {
    class: 'process-canting',
    transform: 'translate(455 30) rotate(24)',
  });
  canting.append(
    svgNode('path', { d: 'M0 0H19V93H0Z', class: 'tool-handle' }),
    svgNode('ellipse', { cx: 10, cy: 108, rx: 31, ry: 23, class: 'tool-bowl' }),
    svgNode('path', { d: 'M36 101 73 123 68 135 31 120Z', class: 'tool-bowl' }),
  );
  art.append(canting);
  art.append(
    svgNode('path', {
      d: 'M74 299Q173 283 249 299T420 299T568 299V361H74Z',
      class: 'process-water',
    }),
  );
  art.append(
    svgNode('path', {
      d: 'M180 39Q167 26 180 15M319 38Q306 24 319 12M455 39Q442 26 455 15',
      class: 'process-steam',
    }),
  );
  return art;
}

function createProcess(story) {
  const root = node('section', 'story-scene process-scene');
  root.id = 'proses';
  root.setAttribute('aria-labelledby', 'process-title');
  const title = node('h3', '', 'Satu kain, banyak ketekunan.');
  title.id = 'process-title';
  root.append(
    node('p', 'eyebrow', 'IKUTI PERUBAHANNYA'),
    title,
    node(
      'p',
      'scene-intro',
      'Empat tahap ringkas untuk membaca proses membatik. Pilih tahap, lalu amati perubahan kainnya.',
    ),
  );
  const panel = node('div', 'process-panel');
  panel.id = 'proses-panel';
  panel.setAttribute('role', 'tabpanel');
  panel.tabIndex = 0;
  const art = createProcessArt();
  const copy = node('div', 'process-copy');
  const indicator = node('p', 'process-indicator');
  indicator.setAttribute('role', 'status');
  const navigation = node('div', 'process-navigation');
  const previous = node('button', 'button button-secondary', '← Sebelumnya');
  const next = node('button', 'button button-secondary', 'Berikutnya →');
  previous.type = 'button';
  next.type = 'button';
  previous.setAttribute('aria-label', 'Tahap sebelumnya');
  next.setAttribute('aria-label', 'Tahap berikutnya');
  let selected = 0;
  let controls;
  function select(index) {
    selected = Math.max(0, Math.min(story.proses.length - 1, index));
    const step = story.proses[selected];
    updateTabs(controls.tabs, selected);
    panel.setAttribute('aria-labelledby', controls.tabs[selected].id);
    art.dataset.stage = step.id;
    art.setAttribute(
      'aria-label',
      'Ilustrasi tahap ' + step.title + '. ' + step.observe,
    );
    copy.replaceChildren(
      node('h4', '', step.title),
      node('p', '', step.text),
      node('p', 'scene-prompt', step.observe),
    );
    addSources(copy, step.sourceIds, story);
    indicator.textContent =
      'Tahap ' +
      (selected + 1) +
      ' dari ' +
      story.proses.length +
      ' · ' +
      step.shortTitle;
    previous.disabled = selected === 0;
    next.disabled = selected === story.proses.length - 1;
  }
  controls = makeTabs(story.proses, 'proses', 'Tahapan membatik', select);
  previous.addEventListener('click', function () {
    select(selected - 1);
    if (previous.disabled) controls.tabs[selected].focus();
  });
  next.addEventListener('click', function () {
    select(selected + 1);
    if (next.disabled) controls.tabs[selected].focus();
  });
  panel.append(art, copy);
  navigation.append(previous, next);
  root.append(
    controls.list,
    panel,
    indicator,
    navigation,
    node(
      'p',
      'scene-caption',
      'Ilustrasi proses umum, bukan resep produksi. Praktik dan hasil warna setiap perajin dapat berbeda.',
    ),
  );
  select(0);
  return root;
}

function createFuture(story) {
  const figure = node('figure', 'future-scene');
  const svg = svgNode('svg', {
    viewBox: '0 0 760 440',
    class: 'future-art',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.append(
    svgNode('circle', { cx: 526, cy: 220, r: 154, class: 'future-orbit' }),
  );
  svg.append(
    svgNode('circle', { cx: 526, cy: 220, r: 177, class: 'future-orbit' }),
  );
  for (let index = 0; index < 5; index += 1) {
    const y = 68 + index * 76;
    svg.append(
      svgNode('circle', { cx: 88, cy: y, r: 6, class: 'future-origin' }),
    );
    const path = svgNode('path', {
      d: 'M88 ' + y + ' C260 ' + y + ' 237 220 368 220',
      class: 'future-thread',
    });
    svg.append(path);
  }
  svg.append(
    svgNode('circle', { cx: 368, cy: 220, r: 7, class: 'future-origin' }),
  );
  const year = svgNode('text', {
    x: 532,
    y: 247,
    'text-anchor': 'middle',
    class: 'future-year',
  });
  year.textContent = '2045';
  svg.append(year);
  const labels = node('ol', 'future-labels');
  for (const chapter of story.bab)
    labels.append(node('li', '', chapter.shortTitle));
  figure.append(
    svg,
    labels,
    node(
      'figcaption',
      '',
      'Lima bab, satu bekal: berakar pada budaya, bertumbuh lewat karya.',
    ),
  );
  return figure;
}

export function createChapterScene(chapter, story) {
  if (chapter.id === 'bab-3') return createMotif(story);
  if (chapter.id === 'bab-4') return createProcess(story);
  if (chapter.id === 'bab-5') return createFuture(story);
  return null;
}

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
  const future = document.querySelector('.future-scene');
  const futurePaths = [...document.querySelectorAll('.future-thread')];
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
    const futureBox = future.getBoundingClientRect();
    metrics = {
      start: absoluteTop + anchors[0],
      end: absoluteTop + anchors[anchors.length - 1],
      length,
      futureStart: futureBox.top + window.scrollY,
      futureEnd: futureBox.bottom + window.scrollY,
      futureLengths: futurePaths.map(function (item) {
        return item.getTotalLength();
      }),
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
    const futureFraction = reduced.matches
      ? 1
      : readingFraction(readingLine, metrics.futureStart, metrics.futureEnd);
    for (const [index, path] of futurePaths.entries()) {
      const length = metrics.futureLengths[index];
      path.setAttribute('stroke-dasharray', String(length));
      path.setAttribute(
        'stroke-dashoffset',
        String(length * (1 - futureFraction)),
      );
    }
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
