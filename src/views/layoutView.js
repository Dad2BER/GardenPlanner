import { getGarden, updateGardenLayout } from '../state.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const GRID_SIZE  = 40;           // px per foot at zoom 1
const GARDEN_FT  = 50;           // garden is 50 ft × 50 ft
const GARDEN_PX  = GRID_SIZE * GARDEN_FT;  // 2000 px virtual size
const ZOOM_MIN   = 0.08;
const ZOOM_MAX   = 5;

// ── Module state ──────────────────────────────────────────────────────────────
let _canvas     = null;
let _gardenId   = null;
let _labels     = new Map();   // fabric shape → fabric.Text label
let _saveTimer  = null;
let _isPanning  = false;
let _panStart   = { x: 0, y: 0 };
let _spaceDown  = false;

const BED_COLORS = [
  '#3a7d44', '#4a9e5c', '#2d6a4f', '#52b788',
  '#6a994e', '#a7c957', '#386641', '#bc4749',
];
let _colorIdx = 0;
function nextColor() { return BED_COLORS[_colorIdx++ % BED_COLORS.length]; }

// ── Public entry point ────────────────────────────────────────────────────────

export function renderLayoutView(container, gardenId, navigate) {
  _gardenId  = gardenId;
  _labels    = new Map();
  _colorIdx  = 0;
  _spaceDown = false;

  const garden = getGarden(gardenId);
  if (!garden) {
    container.innerHTML = `<p class="error-msg">Garden not found.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="layout-wrap">

      <div class="layout-toolbar">
        <span class="toolbar-label">Add Bed:</span>
        <button class="tool-btn" id="btn-add-rect"   title="Add rectangle bed (4ft × 8ft)">▭ Rectangle</button>
        <button class="tool-btn" id="btn-add-circle" title="Add circle bed (4ft diameter)">◯ Circle</button>
        <div class="toolbar-sep"></div>
        <button class="tool-btn tool-btn--danger" id="btn-delete-bed" title="Delete selected bed (Del)">🗑 Delete</button>
        <div class="toolbar-sep"></div>
        <button class="tool-btn tool-btn--icon" id="btn-zoom-out"  title="Zoom out">−</button>
        <span  class="zoom-indicator" id="zoom-indicator">—</span>
        <button class="tool-btn tool-btn--icon" id="btn-zoom-in"   title="Zoom in">+</button>
        <button class="tool-btn" id="btn-zoom-fit" title="Fit garden to window">⊡ Fit</button>
        <div class="toolbar-spacer"></div>
        <span class="toolbar-hint" id="layout-hint">Click a bed to select · Double-click to rename</span>
        <span class="toolbar-save" id="layout-save-status">✓ Saved</span>
      </div>

      <div class="layout-body">
        <div class="layout-sidebar">
          <div class="bed-list-header">Beds</div>
          <div class="bed-list" id="bed-list"></div>
          <div class="bed-list-empty" id="bed-list-empty">No beds yet.<br>Add one above.</div>
        </div>
        <div class="layout-canvas-outer">
          <div class="layout-canvas-wrap">
            <canvas id="garden-canvas"></canvas>
          </div>
          <div class="layout-scale-bar">
            <span>1 square = 1 ft &nbsp;·&nbsp; Garden: ${GARDEN_FT}ft × ${GARDEN_FT}ft</span>
            <span>Scroll to zoom &nbsp;·&nbsp; Space or Alt + drag to pan</span>
          </div>
        </div>
      </div>

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

  waitForFabric(() => initCanvas(garden));
}

// ── Fabric.js init ─────────────────────────────────────────────────────────────

function waitForFabric(cb) {
  if (typeof fabric !== 'undefined') { requestAnimationFrame(cb); return; }
  let n = 0;
  const t = setInterval(() => {
    if (typeof fabric !== 'undefined') { clearInterval(t); requestAnimationFrame(cb); }
    if (++n > 50) { clearInterval(t); console.error('Fabric.js not loaded'); }
  }, 100);
}

function initCanvas(garden) {
  const el = document.getElementById('garden-canvas');
  if (!el) return;

  const wrap = el.parentElement;
  const W = wrap.clientWidth  || 900;
  const H = wrap.clientHeight || 620;

  _canvas = new fabric.Canvas('garden-canvas', {
    width:    W,
    height:   H,
    backgroundColor: '#6b5c3e',   // outside-garden colour
    selection: true,
    preserveObjectStacking: true,
  });

  drawGardenSurface();
  drawGrid();
  fitToGarden();   // set initial zoom before loading shapes

  // Load existing layout
  if (garden.layout?.canvasJson) {
    _canvas.loadFromJSON(garden.layout.canvasJson, () => {
      _canvas.getObjects().forEach(obj => {
        if (obj.bedId) addFloatingLabel(obj);
      });
      _canvas.renderAll();
      updateBedList();
    }, (o, fabricObj) => {
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
  bindKeyboard();
  updateBedList();
}

// ── Garden surface + grid ─────────────────────────────────────────────────────

function drawGardenSurface() {
  // Filled rect representing the 50×50 ft soil area
  _canvas.add(new fabric.Rect({
    left: 0, top: 0,
    width: GARDEN_PX, height: GARDEN_PX,
    fill: '#c8b560',
    selectable: false, evented: false, isGrid: true, hoverCursor: 'default',
  }));
}

function drawGrid() {
  const minor = GRID_SIZE;          // 1 ft
  const major = GRID_SIZE * 5;      // 5 ft

  const lineBase = { selectable: false, evented: false, isGrid: true, hoverCursor: 'default' };
  const minorOpts = { ...lineBase, stroke: 'rgba(0,0,0,0.10)', strokeWidth: 0.5 };
  const majorOpts = { ...lineBase, stroke: 'rgba(0,0,0,0.25)', strokeWidth: 1 };

  for (let x = 0; x <= GARDEN_PX; x += minor) {
    const opts = x % major === 0 ? majorOpts : minorOpts;
    _canvas.add(new fabric.Line([x, 0, x, GARDEN_PX], opts));
  }
  for (let y = 0; y <= GARDEN_PX; y += minor) {
    const opts = y % major === 0 ? majorOpts : minorOpts;
    _canvas.add(new fabric.Line([0, y, GARDEN_PX, y], opts));
  }

  // Foot labels at every 5-ft mark
  const labelBase = {
    fontSize: 9, fontFamily: 'system-ui, sans-serif',
    fill: 'rgba(0,0,0,0.38)',
    selectable: false, evented: false, isGrid: true, hoverCursor: 'default',
  };
  for (let x = 5; x <= GARDEN_FT; x += 5) {
    _canvas.add(new fabric.Text(`${x}'`, { ...labelBase, left: x * GRID_SIZE + 2, top: 2 }));
  }
  for (let y = 5; y <= GARDEN_FT; y += 5) {
    _canvas.add(new fabric.Text(`${y}'`, { ...labelBase, left: 2, top: y * GRID_SIZE + 2 }));
  }

  // Garden border
  _canvas.add(new fabric.Rect({
    left: 0, top: 0,
    width: GARDEN_PX, height: GARDEN_PX,
    fill: 'transparent',
    stroke: 'rgba(0,0,0,0.45)', strokeWidth: 2,
    selectable: false, evented: false, isGrid: true, hoverCursor: 'default',
  }));
}

// ── Zoom helpers ──────────────────────────────────────────────────────────────

function fitToGarden() {
  const W  = _canvas.getWidth();
  const H  = _canvas.getHeight();
  const pad = 32;
  const zoom = Math.min((W - pad * 2) / GARDEN_PX, (H - pad * 2) / GARDEN_PX);
  const panX = (W - GARDEN_PX * zoom) / 2;
  const panY = (H - GARDEN_PX * zoom) / 2;
  _canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
  updateZoomIndicator();
}

function zoomBy(factor) {
  const cx = _canvas.getWidth()  / 2;
  const cy = _canvas.getHeight() / 2;
  const z  = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, _canvas.getZoom() * factor));
  _canvas.zoomToPoint(new fabric.Point(cx, cy), z);
  updateZoomIndicator();
}

function updateZoomIndicator() {
  const el = document.getElementById('zoom-indicator');
  if (el) el.textContent = Math.round(_canvas.getZoom() * 100) + '%';
}

// ── Bed creation ──────────────────────────────────────────────────────────────

function getViewportCenter() {
  const vpt  = _canvas.viewportTransform;
  const zoom = _canvas.getZoom();
  return {
    x: (_canvas.getWidth()  / 2 - vpt[4]) / zoom,
    y: (_canvas.getHeight() / 2 - vpt[5]) / zoom,
  };
}

function createBed(type) {
  const id   = crypto.randomUUID();
  const name = `Bed ${_canvas.getObjects().filter(o => o.bedId).length + 1}`;
  const fill = nextColor();
  const c    = getViewportCenter();

  let shape;
  if (type === 'rect') {
    // Default: 4ft wide × 8ft tall raised bed (160 × 320 px)
    shape = new fabric.Rect({
      left: c.x - 80, top: c.y - 160,
      width: 160, height: 320,
      fill, stroke: 'rgba(0,0,0,0.35)', strokeWidth: 2,
      rx: 4, ry: 4, opacity: 0.92,
    });
  } else {
    // Default: 4ft-diameter circle (rx=ry=80 px)
    shape = new fabric.Ellipse({
      left: c.x - 80, top: c.y - 80,
      rx: 80, ry: 80,
      fill, stroke: 'rgba(0,0,0,0.35)', strokeWidth: 2,
      opacity: 0.92,
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
    fontSize: 14, fontFamily: 'system-ui, sans-serif', fontWeight: 'bold',
    fill: 'white',
    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.65)', blur: 4, offsetX: 1, offsetY: 1 }),
    selectable: false, evented: false, textAlign: 'center',
  });
  _canvas.add(label);
  _labels.set(shape, label);
  syncLabel(shape, label);
}

function syncLabel(shape, label) {
  if (!label) return;
  const c = shape.getCenterPoint();
  label.set({ left: c.x - label.width / 2, top: c.y - label.height / 2 });
}

function syncAllLabels() {
  _labels.forEach((lbl, shape) => syncLabel(shape, lbl));
}

function removeLabel(shape) {
  const lbl = _labels.get(shape);
  if (lbl) { _canvas.remove(lbl); _labels.delete(shape); }
}

// ── Canvas events ─────────────────────────────────────────────────────────────

function bindCanvasEvents() {
  _canvas.on('object:moving',   e => { if (e.target.bedId) syncLabel(e.target, _labels.get(e.target)); });
  _canvas.on('object:scaling',  e => { if (e.target.bedId) syncLabel(e.target, _labels.get(e.target)); });
  _canvas.on('object:rotating', e => { if (e.target.bedId) syncLabel(e.target, _labels.get(e.target)); });
  _canvas.on('object:modified', () => { syncAllLabels(); scheduleSave(); updateBedList(); });

  _canvas.on('selection:created', e => updateHint(e.selected?.[0]));
  _canvas.on('selection:updated', e => updateHint(e.selected?.[0]));
  _canvas.on('selection:cleared', () => updateHint(null));

  _canvas.on('mouse:dblclick', e => {
    const target = _canvas.findTarget(e.e);
    if (target?.bedId) startRename(target);
  });

  // ── Zoom via mouse wheel ──────────────────────────────────────────────────
  _canvas.on('mouse:wheel', opt => {
    const e = opt.e;
    let z = _canvas.getZoom() * (0.999 ** e.deltaY);
    z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
    _canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), z);
    updateZoomIndicator();
    e.preventDefault();
    e.stopPropagation();
  });

  // ── Pan via Alt+drag or middle-mouse drag ─────────────────────────────────
  _canvas.on('mouse:down', opt => {
    const e = opt.e;
    if (e.altKey || e.button === 1 || _spaceDown) {
      _isPanning = true;
      _panStart  = { x: e.clientX, y: e.clientY };
      _canvas.selection = false;
      _canvas.setCursor('grabbing');
      e.preventDefault();
    }
  });

  _canvas.on('mouse:move', opt => {
    if (!_isPanning) return;
    const e = opt.e;
    _canvas.relativePan(new fabric.Point(e.clientX - _panStart.x, e.clientY - _panStart.y));
    _panStart = { x: e.clientX, y: e.clientY };
  });

  _canvas.on('mouse:up', () => {
    if (_isPanning) {
      _isPanning = false;
      _canvas.selection = true;
      _canvas.setCursor(_spaceDown ? 'grab' : 'default');
    }
  });
}

// ── Keyboard ──────────────────────────────────────────────────────────────────

function onKeyDown(e) {
  if (!_canvas) return;
  const inField = ['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);

  if (e.code === 'Space' && !inField) {
    if (!_spaceDown) {
      _spaceDown = true;
      _canvas.setCursor('grab');
    }
    e.preventDefault();
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && !inField) {
    deleteSelected();
  }
  if (e.key === 'Enter' && _renamingShape) confirmRename();
  if (e.key === 'Escape' && _renamingShape) cancelRename();
}

function onKeyUp(e) {
  if (e.code === 'Space') {
    _spaceDown = false;
    if (_canvas && !_isPanning) _canvas.setCursor('default');
  }
}

function bindKeyboard() {
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup',   onKeyUp);
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function bindToolbar() {
  document.getElementById('btn-add-rect')?.addEventListener('click', () => createBed('rect'));
  document.getElementById('btn-add-circle')?.addEventListener('click', () => createBed('circle'));
  document.getElementById('btn-delete-bed')?.addEventListener('click', deleteSelected);
  document.getElementById('btn-zoom-in')?.addEventListener('click', () => zoomBy(1.25));
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => zoomBy(1 / 1.25));
  document.getElementById('btn-zoom-fit')?.addEventListener('click', fitToGarden);
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

function updateHint(obj) {
  const el = document.getElementById('layout-hint');
  if (!el) return;
  el.textContent = obj?.bedId
    ? `"${obj.bedName}" selected · Double-click to rename · Del to delete`
    : 'Click a bed to select · Double-click to rename';
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
  const name = document.getElementById('rename-input')?.value.trim();
  if (!name || !_renamingShape) { cancelRename(); return; }
  _renamingShape.bedName = name;
  const lbl = _labels.get(_renamingShape);
  if (lbl) { lbl.set('text', name); syncLabel(_renamingShape, lbl); }
  _canvas.renderAll();
  scheduleSave();
  updateBedList();
  cancelRename();
}

function cancelRename() {
  document.getElementById('rename-overlay')?.classList.add('hidden');
  _renamingShape = null;
}

// Rename button events wired via delegation on document
document.addEventListener('click', e => {
  if (e.target.id === 'rename-confirm') confirmRename();
  if (e.target.id === 'rename-cancel')  cancelRename();
});

// ── Bed list sidebar ──────────────────────────────────────────────────────────

function updateBedList() {
  const list  = document.getElementById('bed-list');
  const empty = document.getElementById('bed-list-empty');
  if (!list || !_canvas) return;

  const beds = _canvas.getObjects().filter(o => o.bedId);
  empty.style.display = beds.length === 0 ? 'block' : 'none';

  list.innerHTML = beds.map(b => `
    <div class="bed-item" data-bed-id="${b.bedId}">
      <span class="bed-swatch" style="background:${b.fill}"></span>
      <span class="bed-item-name">${escHtml(b.bedName)}</span>
    </div>
  `).join('');

  list.querySelectorAll('.bed-item').forEach(el => {
    el.addEventListener('click', () => {
      const obj = _canvas.getObjects().find(o => o.bedId === el.dataset.bedId);
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
  const shapes = _canvas.getObjects().filter(o => o.bedId);
  const beds   = shapes.map(o => ({ id: o.bedId, name: o.bedName, type: o.bedType, fill: o.fill }));
  const json   = _canvas.toJSON(['bedId', 'bedName', 'bedType', 'bedFill', 'isGrid']);
  json.objects = (json.objects || []).filter(o => o.bedId);
  updateGardenLayout(_gardenId, { canvasJson: json, beds });
  setSaveStatus('saved');
}

function setSaveStatus(s) {
  const el = document.getElementById('layout-save-status');
  if (!el) return;
  el.textContent = s === 'saving' ? '● Saving…' : '✓ Saved';
  el.style.color = s === 'saving' ? '#a0522d' : '#2d6a4f';
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

export function destroyLayoutView() {
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup',   onKeyUp);
  if (_canvas) { _canvas.dispose(); _canvas = null; }
  _labels    = new Map();
  _gardenId  = null;
  _spaceDown = false;
  _isPanning = false;
  clearTimeout(_saveTimer);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
