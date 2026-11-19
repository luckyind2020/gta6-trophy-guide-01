// Leonida Legend — GTA VI trophy guide & tracker.
// Plain static app: reads its own data files, keeps progress in localStorage,
// and never fetches anything outside this folder.
const SAVE_KEY = 'leonida-legend-progress-v1';
const SOURCE_NAMES = {
  PS: 'PlayStation official trophy list, via Exophase',
  PP: 'PSNProfiles GTA VI trophy guide',
};
const SOURCE_LINKS = {
  PS: 'https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/',
  PP: 'https://psnprofiles.com/trophies/grand-theft-auto-vi',
};

const listEl = document.getElementById('trophyList');
const detailEl = document.getElementById('detailPanel');
const countEl = document.getElementById('listCount');
const emptyEl = document.getElementById('emptyNote');
const roadmapEl = document.getElementById('roadmapView');
const missableEl = document.getElementById('missableIntro');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('gradeFilter');
const kindEl = document.getElementById('kindFilter');
const hideEarnedEl = document.getElementById('hideEarned');
const spoilerEl = document.getElementById('spoilerMode');
const spoilerNoteEl = document.getElementById('spoilerNote');

let guideData = { trophies: [] };
let roadData = { stages: [] };
let earned = new Set(readSavedProgress());
let activeView = 'checklist';
let openTrophyId = null;

function readSavedProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : [];
  } catch {
    return [];
  }
}

function storeSavedProgress() {
  localStorage.setItem(SAVE_KEY, JSON.stringify([...earned].sort()));
}

function trophyById(id) {
  return guideData.trophies.find((t) => t.id === id);
}

function spoilerHides(trophy) {
  return spoilerEl.checked && trophy.kinds.includes('story') && !earned.has(trophy.name);
}

function gradeLabel(trophy) {
  return trophy.grade.charAt(0).toUpperCase() + trophy.grade.slice(1);
}

function countLabel(trophy) {
  if (trophy.count == null) return null;
  if (trophy.count >= 1000) return `$${trophy.count.toLocaleString('en-US')}`;
  return `${trophy.count}×`;
}

function visibleTrophies() {
  const query = searchEl.value.trim().toLowerCase();
  const grade = gradeEl.value;
  const kind = kindEl.value;
  return guideData.trophies.filter((trophy) => {
    if (activeView === 'missable' && !trophy.missable) return false;
    if (grade !== 'all' && trophy.grade !== grade) return false;
    if (kind === 'online') return false; // the official list has no online trophies
    if (kind === 'missable' && !trophy.missable) return false;
    if (kind !== 'all' && kind !== 'missable' && !trophy.kinds.includes(kind)) return false;
    if (hideEarnedEl.checked && earned.has(trophy.name)) return false;
    if (query) {
      const haystack = `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

function paintProgress() {
  const total = guideData.trophies.length;
  document.getElementById('earnedCount').textContent = String(earned.size);
  document.getElementById('progressFill').style.width = total ? `${(earned.size / total) * 100}%` : '0%';
  const byGrade = ['platinum', 'gold', 'silver', 'bronze'].map((grade) => {
    const have = guideData.trophies.filter((t) => t.grade === grade && earned.has(t.name)).length;
    const all = guideData.trophies.filter((t) => t.grade === grade).length;
    return `${grade} ${have}/${all}`;
  });
  document.getElementById('progressGrades').textContent = byGrade.join(' · ');
}

function makeTag(text, cssClass) {
  const tag = document.createElement('span');
  tag.className = `tag${cssClass ? ` ${cssClass}` : ''}`;
  tag.textContent = text;
  return tag;
}

function paintList() {
  const shown = visibleTrophies();
  countEl.textContent = `Showing ${shown.length} of ${guideData.trophies.length} trophies` +
    (activeView === 'missable' ? ' — missable only' : '');
  emptyEl.hidden = shown.length !== 0;
  listEl.replaceChildren();
  for (const trophy of shown) {
    const item = document.createElement('li');
    item.className = 'trophy-card' + (earned.has(trophy.name) ? ' earned' : '') +
      (openTrophyId === trophy.id ? ' selected' : '');
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', `Guide for ${spoilerHides(trophy) ? 'a hidden story trophy' : trophy.name}`);
    const openCard = () => {
      openTrophyId = trophy.id;
      paintList();
      paintDetail();
    };
    item.addEventListener('click', (event) => {
      if (event.target.tagName === 'INPUT') return;
      openCard();
    });
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openCard();
      }
    });

    const head = document.createElement('div');
    head.className = 'trophy-head';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earned.has(trophy.name);
    box.setAttribute('aria-label', `Earned: ${trophy.name}`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(trophy.name);
      else earned.delete(trophy.name);
      storeSavedProgress();
      paintProgress();
      paintList();
      paintDetail();
    });
    const name = document.createElement('span');
    name.className = 'trophy-name';
    name.textContent = spoilerHides(trophy) ? 'Hidden story trophy' : trophy.name;
    const badge = document.createElement('span');
    badge.className = `grade-badge grade-${trophy.grade}`;
    badge.textContent = gradeLabel(trophy);
    head.append(box, name, badge);

    const desc = document.createElement('p');
    desc.className = 'trophy-desc';
    desc.textContent = spoilerHides(trophy)
      ? 'Earn this trophy to reveal its name and description.'
      : trophy.description;

    const meta = document.createElement('div');
    meta.className = 'trophy-meta';
    if (trophy.missable) meta.append(makeTag('⚠ Missable', 'missable'));
    const count = countLabel(trophy);
    if (count) meta.append(makeTag(`Count: ${count}`, 'count'));
    for (const kind of trophy.kinds) meta.append(makeTag(kind));
    if (spoilerHides(trophy)) meta.append(makeTag('Story — hidden'));

    item.append(head, desc, meta);
    listEl.append(item);
  }
}

function paintDetail() {
  detailEl.replaceChildren();
  const trophy = openTrophyId == null ? null : trophyById(openTrophyId);
  if (!trophy) {
    const hint = document.createElement('p');
    hint.className = 'detail-empty';
    hint.textContent = 'Pick a trophy from the list to read its guide — what to do, where and how, and whether it can be missed. Every guide names its sources.';
    detailEl.append(hint);
    return;
  }
  const title = document.createElement('h2');
  title.textContent = spoilerHides(trophy) ? 'Hidden story trophy' : trophy.name;
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = spoilerHides(trophy)
    ? 'Earn this trophy to reveal its official description.'
    : `Official: “${trophy.description}” — ${gradeLabel(trophy)}`;
  detailEl.append(title, official);

  const guideHeading = document.createElement('h3');
  guideHeading.textContent = 'Guide';
  const guideText = document.createElement('p');
  guideText.textContent = trophy.guide;
  detailEl.append(guideHeading, guideText);

  const missHeading = document.createElement('h3');
  missHeading.textContent = 'Can it be missed?';
  const missText = document.createElement('p');
  missText.textContent = trophy.missable
    ? 'Yes — this one is tied to a single named story mission, chapter or strand finale. Earn it on your first pass; if a run goes wrong, restart the mission from the pause menu.'
    : 'No — this trophy is earned in free roam or through cumulative play, so you can come back to it any time after the story.';
  detailEl.append(missHeading, missText);

  const sourceHeading = document.createElement('h3');
  sourceHeading.textContent = 'Sources';
  const sourceText = document.createElement('p');
  sourceText.className = 'sources';
  sourceText.textContent = 'Facts from the official description; method written for this guide. Sources: ';
  trophy.sources.forEach((code, index) => {
    if (index > 0) sourceText.append(document.createTextNode(' · '));
    const link = document.createElement('a');
    link.href = SOURCE_LINKS[code];
    link.textContent = SOURCE_NAMES[code];
    link.rel = 'noopener';
    sourceText.append(link);
  });
  detailEl.append(sourceHeading, sourceText);
}

function paintRoadmap() {
  roadmapEl.replaceChildren();
  for (const stage of roadData.stages) {
    const block = document.createElement('article');
    block.className = 'roadmap-stage';
    const heading = document.createElement('h2');
    heading.textContent = stage.title;
    const goal = document.createElement('p');
    goal.className = 'stage-goal';
    goal.textContent = stage.goal;
    const tip = document.createElement('p');
    tip.className = 'stage-tip';
    tip.textContent = `Tip: ${stage.tip}`;
    const chips = document.createElement('ul');
    chips.className = 'stage-trophies';
    for (const id of stage.ids) {
      const trophy = trophyById(id);
      if (!trophy) continue;
      const chip = document.createElement('li');
      chip.className = earned.has(trophy.name) ? 'done' : '';
      chip.textContent = `${earned.has(trophy.name) ? '✓ ' : ''}${trophy.name} (${gradeLabel(trophy)})`;
      chip.addEventListener('click', () => {
        openTrophyId = trophy.id;
        setView('checklist');
        paintList();
        paintDetail();
      });
      chips.append(chip);
    }
    block.append(heading, goal, tip, chips);
    roadmapEl.append(block);
  }
}

function setView(view) {
  activeView = view;
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });
  roadmapEl.hidden = view !== 'roadmap';
  missableEl.hidden = view !== 'missable';
  document.querySelector('.layout').style.display = view === 'roadmap' ? 'none' : '';
  if (view === 'roadmap') paintRoadmap();
  if (view !== 'roadmap') paintList();
}

function applyHashToState() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = raw.split('?');
  const params = new URLSearchParams(queryPart ?? '');
  if (params.get('spoiler') === '1') spoilerEl.checked = true;
  if (params.get('kind')) kindEl.value = params.get('kind');
  if (params.get('grade')) gradeEl.value = params.get('grade');
  const segments = pathPart.split('/').filter(Boolean);
  if (segments[0] === 'roadmap') setView('roadmap');
  else if (segments[0] === 'missable') setView('missable');
  else setView('checklist');
  if (segments[0] === 'trophy' && segments[1]) {
    const id = Number(segments[1]);
    if (trophyById(id)) openTrophyId = id;
  }
}

function downloadProgress() {
  const blob = new Blob([JSON.stringify({ game: 'Grand Theft Auto VI', earned: [...earned].sort() }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'leonida-legend-progress.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const names = Array.isArray(parsed) ? parsed : parsed.earned;
    if (!Array.isArray(names)) throw new Error('bad file');
    const known = new Set(guideData.trophies.map((t) => t.name));
    earned = new Set(names.filter((name) => known.has(name)));
    storeSavedProgress();
    paintProgress();
    paintList();
    paintDetail();
    if (activeView === 'roadmap') paintRoadmap();
  } catch {
    alert('That file is not a Leonida Legend progress export.');
  }
}

async function loadGuideData() {
  const [trophiesRes, roadmapRes] = await Promise.all([
    fetch('data/trophies.json'),
    fetch('data/roadmap.json'),
  ]);
  guideData = await trophiesRes.json();
  roadData = await roadmapRes.json();
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => setView(tab.dataset.view));
});
for (const control of [searchEl, gradeEl, kindEl, hideEarnedEl, spoilerEl]) {
  control.addEventListener('input', () => {
    spoilerNoteEl.hidden = !spoilerEl.checked;
    paintList();
    paintDetail();
  });
}
document.getElementById('exportBtn').addEventListener('click', downloadProgress);
document.getElementById('importFile').addEventListener('change', (event) => {
  importProgress(event.target.files[0]);
  event.target.value = '';
});
window.addEventListener('hashchange', () => {
  applyHashToState();
  paintList();
  paintDetail();
});

await loadGuideData();
applyHashToState();
spoilerNoteEl.hidden = !spoilerEl.checked;
paintProgress();
paintList();
paintDetail();
if (activeView === 'roadmap') paintRoadmap();
