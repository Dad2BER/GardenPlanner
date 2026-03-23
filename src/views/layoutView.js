import { getGarden, updateGardenLayout } from '../state.js';

// Module-level canvas state (destroyed/recreated on each navigation to this page)
let _canvas    = null;
let _gardenId  = null;
let _labels    = new Map();   // fabric shape → fabric.Text label
let _saveTimer = null;

const BED_COLORS = [
  '#3a7d44', '#4a9e5c', '#2d6a4f', '#52b788',
  '#6a994e', '#a7c957', '#386641', '#bc4749',
];
let _colorIdx = 0;

function nextColor() {
  return BED_COLORS[_colorIdx++ % BED_COLORS.length];
}

// ── Public entry point ───────────────────────────────────────────────────────

export function renderLayoutView(container, gardenId, navigate) {
  _gardenId = gardenId;
  _labels   = new Map();
  _colorIdx = 0;

  const garden = getGarden(gardenId);
  if (!garden) {
    container.innerHTML = `<p class="error-msg">Garden not found.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="layout-wrap">
      <div class="layout-toolbar">
        <span class="toolbar-label">Add Bed:</span>
        <button class="tool-btn" id="btn-add-rect" title="Add rectangle bed">
          ▭ Rectangle
        </button>
        <button class="tool-btn" id="btn-add-circle" title="Add circle/ellipse bed">
          ◯ Circle
        </button>
        <div class="toolbar-sep"></div>
        <button class="tool-btn tool-btn--danger" id="btn-delete-bed" title="Delete selected bed (Del)">
          🗑 Delete
        </button>
        <div class="toolbar-spacer"></div>
        <span class="toolbar-hint" id="layout-hint">Click a bed to select · Double-click to rename</span>
        <span class="toolbar-save" id="layout-save-status">✓ Saved</span>
      </div>

      <div class="layout-body">
        <div class="layout-sidebar">
          <div class="bed-list-header">Beds</div>
          <div class="bed-list" id="bed-list"></div>
          <div class="bed-list-empty hidden" id="bed-list-empty">No beds yet</div>
        </div>
        <div class="layout-canvas-wrap">
          <canvas id="garden-canvas"></canvas>
        </div>
      </div>

      <!-- Inline rename overlay -->
      <div class="rename-overlay hidden" id="rename-overlay">
        <div class="rename-box">
          <label class="rename-label">Bed Name</label>
          <input class="rename-input" id="rename-input" type="text" maxlength="40" />
          <div class="rename-actions">
            <button class="btn btn-ghost btn-sm" id="rename-cancel">Cancel</button>
            <button class="btn btn-primary btn-sm" id="rename-confirm">Rename</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Wait for Fabric.js to be available (it's a CDN script, not a module)
  waitForFabric(() => initCanvas(garden));
}

// ── Fabric.js initialisation ─────────────────────────────────────────────────

function waitForFabric(cb) {
  if (typeof fabric !== 'undefined') { cb(); return; }
  let attempts = 0;
  const t = setInterval(() => {
    if (typeof fabric !== 'undefined') { clearInterval(t); cb(); }
    if (++attempts > 40) { clearInterval(t); console.error('Fabric.js not loaded'); }
  }, 100);
}

function initCanvas(garden) {
  const el = document.getElementById('garden-canvas');
  if (!el) return;

  // Size canvas to fill its wrapper
  const wrap = el.parentElement;
  const W = wrap.clientWidth  || 800;
  const H = wrap.clientHeight || 600;

  _canvas = new fabric.Canvas('garden-canvas', {
    width:           W,
    height:          H,
    backgroundColor: '#c8b560',
    selection:       true,
    preserveObjectStacking: true,
  });

  drawGrid(_canvas);

  // Load existing layout
  if (garden.layout?.canvasJson) {
    _canvas.loadFromJSON(garden.layout.canvasJson, () => {
      // Rebuild floating labels for all bed shapes
      _canvas.getObjects().forEach(obj => {
        if (obj.bedId) addFloatingLabel(obj);
      });
      _canvas.renderAll();
      updateBedList();
    }, (o, fabricObj) => {
      // Per-object reviver: restore custom props
      if (o.bedId) {
        fabricObj.bedId   = o.bedId;
        fabricObj.bedName = o.bedName;
        fabricObj.bedType = o.bedType;
        fabricObj.bedFill = o.bedFill;
      }
    });
  }

  bindCanvasEvents();
  bindToolbar();
  updateBedList();
}

// ── Grid ─────────────────────────────────────────────────────────────────────

function drawGrid(canvas) {
  const step = 40;
  const W = canvas.getWidth();
  const H = canvas.getHeight();
  const opts = {
    stroke: 'rgba(0,0,0,0.12)',
    strokeWidth: 1,
    selectable: false,
    evented: false,
    isGrid: true,
    hoverCursor: 'default',
  };
  for (let x = step; x < W; x += step) {
    canvas.add(new fabric.Line([x, 0, x, H], { ...opts }));
  }
  for (let y = step; y < H; y += step) {
    canvas.add(new fabric.Line([0, y, W, y], { ...opts }));
  }
  // Foot markers (every 4 cells = 4 ft if 1 cell = 1 ft)
  // Labels at left edge
  canvas.sendToBack(canvas.getObjects('line')[0]);
}

// ── Bed creation ──────────────────────────────────────────────────────────────

function createBed(type) {
  const id   = crypto.randomUUID();
  const name = `Bed ${(_canvas.getObjects().filter(o => o.bedId).length) + 1}`;
  const fill = nextColor();
  const cx   = _canvas.getWidth()  / 2;
  const cy   = _canvas.getHeight() / 2;

  let shape;
  if (type === 'rect') {
    shape = new fabric.Rect({
      left:        cx - 80,
      top:         cy - 50,
      width:       160,
      height:      100,
      fill,
      stroke:      'rgba(0,0,0,0.4)',
      strokeWidth: 2,
      rx: 4, ry: 4,
      opacity:     0.92,
    });
  } else {
    shape = new fabric.Ellipse({
      left:        cx - 70,
      top:         cy - 50,
      rx:          70,
      ry:          50,
      fill,
      stroke:      'rgba(0,0,0,0.4)',
      strokeWidth: 2,
      opacity:     0.92,
    });
  }

  shape.bedId   = id;
  shape.bedName = name;
  shape.bedType = type;
  shape.bedFill = fill;

  _canvas.add(shape);
  addFloatingLabel(shape);
  _canvas.setActiveObject(shape);
  _canvas.renderAll();
  scheduleSave();
  updateBedList();
}

// ── Floating labels ───────────────────────────────────────────────────────────

function addFloatingLabel(shape) {
  const label = new fabric.Text(shape.bedName || '', {
    fontSize:   14,
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 'bold',
    fill:       'white',
    shadow:     new fabric.Shadow({ color: 'rgba(0,0,0,0.6)', blur: 3, offsetX: 1, offsetY: 1 }),
    selectable: false,
    evented:    false,
    textAlign:  'center',
  });
  _canvas.add(label);
  _labels.set(shape, label);
  syncLabel(shape, label);
}

function syncLabel(shape, label) {
  if (!label) return;
  const center = shape.getCenterPoint();
  label.set({
    left: center.x - label.width / 2,
    top:  center.y - label.height / 2,
  });
}

function syncAllLabels() {
  _labels.forEach((label, shape) => syncLabel(shape, label));
}

function removeLabel(shape) {
  const label = _labels.get(shape);
  if (label) {
    _canvas.remove(label);
    _labels.delete(shape);
  }
}

// ── Canvas events ─────────────────────────────────────────────────────────────

function bindCanvasEvents() {
  _canvas.on('object:moving',   e => { if (e.target.bedId) syncLabel(e.target, _labels.get(e.target)); });
  _canvas.on('object:scaling',  e => { if (e.target.bedId) syncLabel(e.target, _labels.get(e.target)); });
  _canvas.on('object:rotating', e => { if (e.target.bedId) syncLabel(e.target, _labels.get(e.target)); });
  _canvas.on('object:modified', () => { syncAllLabels(); scheduleSave(); updateBedList(); });

  _canvas.on('mouse:dblclick', e => {
    const target = _canvas.findTarget(e.e);
    if (target?.bedId) startRename(target);
  });

  _canvas.on('selection:created', e => updateHint(e.selected?.[0]));
  _canvas.on('selection:updated', e => updateHint(e.selected?.[0]));
  _canvas.on('selection:cleared', () => updateHint(null));

  // Delete key
  document.addEventListener('keydown', onKeyDown);
}

function onKeyDown(e) {
  if (!_canvas) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') &&
      !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) {
    deleteSelected();
  }
}

function updateHint(obj) {
  const el = document.getElementById('layout-hint');
  if (!el) return;
  if (obj?.bedId) {
    el.textContent = `"${obj.bedName}" selected · Double-click to rename · Del to delete`;
  } else {
    el.textContent = 'Click a bed to select · Double-click to rename';
  }
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function bindToolbar() {
  document.getElementById('btn-add-rect')?.addEventListener('click', () => createBed('rect'));
  document.getElementById('btn-add-circle')?.addEventListener('click', () => createBed('circle'));
  document.getElementById('btn-delete-bed')?.addEventListener('click', deleteSelected);
}

function deleteSelected() {
  const obj = _canvas.getActiveObject();
  if (!obj?.bedId) return;
  removeLabel(obj);
  _canvas.remove(obj);
  _canvas.discardActiveObject();
  _canvas.renderAll();
  scheduleSave();
  updateBedList();
}

// ── Rename ────────────────────────────────────────────────────────────────────

let _renamingShape = null;

function startRename(shape) {
  _renamingShape = shape;
  const overlay = document.getElementById('rename-overlay');
  const input   = document.getElementById('rename-input');
  if (!overlay || !input) return;
  input.value = shape.bedName || '';
  overlay.classList.remove('hidden');
  input.focus();
  input.select();
}

function confirmRename() {
  const input = document.getElementById('rename-input');
  const name  = input?.value.trim();
  if (!name || !_renamingShape) return cancelRename();
  _renamingShape.bedName = name;
  const label = _labels.get(_renamingShape);
  if (label) { label.set('text', name); syncLabel(_renamingShape, label); }
  _canvas.renderAll();
  scheduleSave();
  updateBedList();
  cancelRename();
}

function cancelRename() {
  document.getElementById('rename-overlay')?.classList.add('hidden');
  _renamingShape = null;
}

// Wire rename overlay buttons (called once after innerHTML is set)
document.addEventListener('click', e => {
  if (e.target.id === 'rename-confirm') confirmRename();
  if (e.target.id === 'rename-cancel')  cancelRename();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && _renamingShape) confirmRename();
  if (e.key === 'Escape' && _renamingShape) cancelRename();
});

// ── Bed list sidebar ──────────────────────────────────────────────────────────

function updateBedList() {
  const list  = document.getElementById('bed-list');
  const empty = document.getElementById('bed-list-empty');
  if (!list || !_canvas) return;

  const beds = _canvas.getObjects().filter(o => o.bedId);

  if (beds.length === 0) {
    list.innerHTML = '';
    empty?.classList.remove('hidden');
    return;
  }
  empty?.classList.add('hidden');
  list.innerHTML = beds.map(b => `
    <div class="bed-item" data-bed-id="${b.bedId}">
      <span class="bed-swatch" style="background:${b.fill}"></span>
      <span class="bed-item-name">${escHtml(b.bedName)}</span>
    </div>
  `).join('');

  list.querySelectorAll('.bed-item').forEach(el => {
    el.addEventListener('click', () => {
      const id  = el.dataset.bedId;
      const obj = _canvas.getObjects().find(o => o.bedId === id);
      if (obj) { _canvas.setActiveObject(obj); _canvas.renderAll(); }
    });
  });
}

// ── Save ──────────────────────────────────────────────────────────────────────

function scheduleSave() {
  clearTimeout(_saveTimer);
  setSaveStatus('saving');
  _saveTimer = setTimeout(doSave, 800);
}

function doSave() {
  if (!_canvas || !_gardenId) return;
  // Serialize only bed shapes (not grid lines, not labels)
  const shapes = _canvas.getObjects().filter(o => o.bedId);
  const beds   = shapes.map(o => ({ id: o.bedId, name: o.bedName, type: o.bedType, fill: o.fill }));

  // Create a temporary canvas clone with only bed objects to get clean JSON
  const json = _canvas.toJSON(['bedId', 'bedName', 'bedType', 'bedFill', 'isGrid']);
  // Strip grid lines and labels from the JSON
  json.objects = (json.objects || []).filter(o => o.bedId);

  updateGardenLayout(_gardenId, { canvasJson: json, beds });
  setSaveStatus('saved');
}

function setSaveStatus(status) {
  const el = document.getElementById('layout-save-status');
  if (!el) return;
  if (status === 'saving') {
    el.textContent = '● Saving…';
    el.style.color = '#a0522d';
  } else {
    el.textContent = '✓ Saved';
    el.style.color = '#2d6a4f';
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

export function destroyLayoutView() {
  document.removeEventListener('keydown', onKeyDown);
  if (_canvas) { _canvas.dispose(); _canvas = null; }
  _labels   = new Map();
  _gardenId = null;
  clearTimeout(_saveTimer);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
