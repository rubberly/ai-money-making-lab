// "Start here" course + per-page tips. Shared by Repurpose Desk and Site Makeover Kit.
// Progress is personal, so it lives in this browser (localStorage), not on the server.
// All text is inserted with textContent.

function el(tag, cls, ...children) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return n;
}

function store(key) {
  let mem = {};
  return {
    get() { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return mem; } },
    set(v) { mem = v; try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode: keep in memory */ } },
  };
}

export function createLearn({ storageKey, title, intro, lessons, glossary, tips, onAction }) {
  const progress = store(`${storageKey}.progress`);
  const tipState = store(`${storageKey}.tips`);
  const done = () => new Set(progress.get().done || []);

  function setDone(id, on) {
    const d = done();
    if (on) d.add(id); else d.delete(id);
    progress.set({ done: [...d] });
  }

  function actionButtons(lesson) {
    if (!lesson.actions?.length) return null;
    return el('div', 'l-actions', lesson.actions.map((a, i) => {
      const b = el('button', i === 0 ? 'l-btn' : 'l-btn l-btn-quiet', a.label);
      b.type = 'button';
      b.addEventListener('click', () => onAction(a.action, b));
      return b;
    }));
  }

  function lessonCard(lesson, index, isNext) {
    const isDone = done().has(lesson.id);
    const box = el('details', `l-lesson${isDone ? ' is-done' : ''}${isNext ? ' is-next' : ''}`);
    box.id = `lesson-${lesson.id}`;
    if (isNext) box.open = true;

    const badge = el('span', 'l-num', isDone ? '✓' : String(index + 1));
    badge.setAttribute('aria-hidden', 'true');
    const summary = el('summary', 'l-summary', badge,
      el('span', 'l-title', lesson.title, isNext ? el('span', 'l-next', 'Next up') : null),
      el('span', 'l-time', lesson.time));
    box.append(summary);

    const body = el('div', 'l-body');
    body.append(el('p', 'l-why', lesson.why));
    if (lesson.steps?.length) {
      body.append(el('h4', 'l-h', 'Do this'), el('ol', 'l-steps', lesson.steps.map((s) => el('li', '', s))));
    }
    if (lesson.example) {
      body.append(el('h4', 'l-h', lesson.example.title || 'Example'),
        el('div', 'l-compare',
          el('div', 'l-good', el('strong', '', 'Good'), el('p', '', lesson.example.good)),
          el('div', 'l-bad', el('strong', '', 'Weak'), el('p', '', lesson.example.bad))));
    }
    if (lesson.tip) body.append(el('p', 'l-note', lesson.tip));
    if (lesson.check) {
      const ans = el('details', 'l-answer', el('summary', '', 'Show answer'), el('p', '', lesson.check.a));
      body.append(el('div', 'l-check', el('strong', '', 'Check yourself'), el('p', '', lesson.check.q), ans));
    }
    const acts = actionButtons(lesson);
    if (acts) body.append(acts);

    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = isDone;
    cb.id = `done-${lesson.id}`;
    const label = el('label', 'l-done', cb, el('span', '', 'I’ve done this'));
    label.htmlFor = cb.id;
    cb.addEventListener('change', () => { setDone(lesson.id, cb.checked); renderInto(box.closest('.l-page').parentElement, lesson.id); });
    body.append(label);
    box.append(body);
    return box;
  }

  function renderInto(container, keepOpenId) {
    const d = done();
    const nextIndex = lessons.findIndex((l) => !d.has(l.id));
    const count = lessons.filter((l) => d.has(l.id)).length;
    const pct = Math.round((count / lessons.length) * 100);

    const bar = el('div', 'l-bar', el('span', 'l-fill'));
    bar.firstChild.style.width = `${pct}%`;
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(lessons.length));
    bar.setAttribute('aria-valuenow', String(count));
    bar.setAttribute('aria-label', 'Lessons done');

    const head = el('header', 'l-head',
      el('h1', 'l-h1', title),
      el('p', 'l-intro', intro),
      el('div', 'l-progress', bar, el('span', 'l-count', count === lessons.length ? `All ${lessons.length} lessons done. Keep going with real prospects.` : `${count} of ${lessons.length} lessons done`)));

    const list = el('div', 'l-list', lessons.map((l, i) => {
      const card = lessonCard(l, i, i === nextIndex);
      if (keepOpenId === l.id) card.open = true;
      return card;
    }));

    const reset = el('button', 'l-btn l-btn-quiet', 'Reset my progress');
    reset.type = 'button';
    reset.addEventListener('click', () => {
      if (reset.dataset.armed) { progress.set({ done: [] }); renderInto(container); return; }
      reset.dataset.armed = '1';
      reset.textContent = 'Click again to reset';
      setTimeout(() => { delete reset.dataset.armed; reset.textContent = 'Reset my progress'; }, 4000);
    });

    const gloss = el('section', 'l-glossary', el('h2', 'l-h2', 'Words you’ll see'),
      el('dl', 'l-dl', glossary.flatMap(([term, def]) => [el('dt', '', term), el('dd', '', def)])));

    const page = el('div', 'l-page', head, list, gloss, el('div', 'l-foot', el('span', '', 'Your progress is saved in this browser only.'), reset));
    container.replaceChildren(page);
  }

  function tip(container, route, after) {
    const t = tips[route];
    if (!t) return;
    const state = tipState.get();
    const box = el('details', 'l-tip');
    box.open = state[route] !== 'closed';
    box.append(el('summary', '', 'How to use this page'),
      el('ul', '', t.map((line) => el('li', '', line))));
    const more = el('a', 'l-tiplink', 'Not sure what to do next? Open Start here →');
    more.href = '#start';
    more.addEventListener('click', (e) => { e.preventDefault(); onAction('start'); });
    box.append(more);
    box.addEventListener('toggle', () => { const s = tipState.get(); s[route] = box.open ? 'open' : 'closed'; tipState.set(s); });
    if (after && after.parentNode) after.after(box); else container.prepend(box);
  }

  return { render: (container) => renderInto(container), tip, progress: () => ({ done: done().size, total: lessons.length }) };
}
