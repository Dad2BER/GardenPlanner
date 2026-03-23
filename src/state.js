import { saveData } from './services/storage.js';

let _data = { gardens: [] };
const _subs = new Set();

export function initState(data) {
  _data = data && data.gardens ? data : { gardens: [] };
}

export function subscribe(fn) {
  _subs.add(fn);
  return () => _subs.delete(fn);
}

export function notify() {
  _subs.forEach(fn => fn());
}

function persist() {
  saveData(_data);
}

// ── Getters ──────────────────────────────────────────────────────────────────

export function getGardens() {
  return _data.gardens;
}

export function getGarden(id) {
  return _data.gardens.find(g => g.id === id) ?? null;
}

// ── Gardens CRUD ──────────────────────────────────────────────────────────────

export function addGarden(name, description = '') {
  const garden = {
    id: crypto.randomUUID(),
    name,
    description,
    createdAt: new Date().toISOString(),
    layout: { canvasJson: null, beds: [] },
  };
  _data.gardens.push(garden);
  persist();
  notify();
  return garden;
}

export function updateGarden(id, patch) {
  const g = _data.gardens.find(g => g.id === id);
  if (!g) return;
  Object.assign(g, patch);
  persist();
  notify();
}

export function deleteGarden(id) {
  _data.gardens = _data.gardens.filter(g => g.id !== id);
  persist();
  notify();
}

export function updateGardenLayout(id, layout) {
  const g = _data.gardens.find(g => g.id === id);
  if (!g) return;
  g.layout = layout;
  persist();
  // No notify() — layout saves should not trigger a full re-render
}
