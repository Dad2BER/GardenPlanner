// src/views/seasonView.js
// Current Season view — place plants on beds and track name, date, and origin.

import { getGarden, getPlantings, addPlanting, updatePlanting, deletePlanting } from '../state.js';
import { PLANTS, plantIconInner, getPlant } from './seasonData.js';

// px per foot — must match layoutView.js
const GRID_SIZE = 40;

// ── Module-level UI state (persists across re-renders of the same garden) ─────
let _gardenId          = null;
let _selectedBedId     = null;
let _selectedPlantingId = null;
let _placingPlantType  = null;

// ── Public entry point ────────────────────────────────────────────────────────

export function renderSeasonView(container, gardenId) {
  // Reset UI state when switching gardens
  if (_gardenId !== gardenId) {
    _gardenId           = gardenId;
    _selectedBedId      = null;
    _selectedPlantingId = null;
    _placingPlantType   = null;
  }

  const garden = getGarden(gardenId);
  if (!garden) {
    container.innerHTML = '<p class="season-error">Garden not found.</p>';
    return;
  }

  const beds = garden.layout?.beds ?? [];
  // Auto-select first bed when none is selected
  if (!_selectedBedId && beds.length) _selectedBedId = beds[0].id;

  render();

  // ── Core render ─────────────────────────────────────────────────────────────

  function render() {
    const plantings = getPlantings(gardenId);
    const bed       = beds.find(b => b.id === _selectedBedId) ?? null;

    container.innerHTML = `
      <div class="season-layout">

        <!-- Left panel: bed list -->
        <aside class="season-sidebar">
          <div class="season-sidebar-head">Beds</div>
          ${beds.length
            ? beds.map(b => {
                const cnt = plantings.filter(p => p.bedId === b.id).length;
                return `
                  <button class="season-bed-item${b.id === _selectedBedId ? ' season-bed-item--active' : ''}"
                          data-bed-id="${b.id}">
                    <span class="season-bed-swatch" style="background:${b.fill}"></span>
                    <span class="season-bed-name">${esc(b.name)}</span>
                    ${cnt ? `<span class="season-bed-badge">${cnt}</span>` : ''}
                  </button>`;
              }).join('')
            : '<p class="season-no-beds">No beds yet — add some in Layout Designer.</p>'
          }
        </aside>

        <!-- Right panel: bed canvas + plant palette + detail form -->
        <main class="season-main">
          ${bed ? renderMain(bed, plantings.filter(p => p.bedId === bed.id)) : renderNoBed()}
        </main>

      </div>`;

    bindEvents();
  }

  // ── Render helpers ──────────────────────────────────────────────────────────

  function renderNoBed() {
    return `<div class="season-empty">Select a bed from the list to start planning.</div>`;
  }

  function renderMain(bed, bedPlantings) {
    const dims            = getBedDimensions(garden, bed.id);
    const selectedPlanting = bedPlantings.find(p => p.id === _selectedPlantingId) ?? null;

    return `
      <div class="season-bed-header">
        <span class="season-bed-swatch-lg" style="background:${bed.fill}"></span>
        <h2 class="season-bed-title">${esc(bed.name)}</h2>
        ${dims ? `<span class="season-dims">${fmtDims(dims)}</span>` : ''}
      </div>

      <div class="season-canvas-row">
        <div class="season-svg-wrap">
          ${renderBedSVG(bed, dims, bedPlantings)}
        </div>
        <aside class="season-palette">
          <div class="season-palette-head">Plants</div>
          <div class="season-palette-hint">
            ${_placingPlantType
              ? 'Click the bed to place · click again to cancel'
              : 'Select a plant, then click the bed'}
          </div>
          <div class="season-palette-list">
            ${PLANTS.map(p => `
              <button class="season-plant-btn${p.key === _placingPlantType ? ' season-plant-btn--active' : ''}"
                      data-plant-key="${p.key}" title="${p.label}">
                <svg viewBox="0 0 32 32" class="season-plant-icon" aria-hidden="true">${plantIconInner(p.key)}</svg>
                <span class="season-plant-label">${p.label}</span>
              </button>`).join('')}
          </div>
        </aside>
      </div>

      ${selectedPlanting ? renderDetail(selectedPlanting) : ''}`;
  }

  function renderBedSVG(bed, dims, bedPlantings) {
    const MAX_W = 500, MAX_H = 360, PAD = 32;

    // Bed dimensions in feet (with fallback)
    let wFt, hFt, isCircle;
    if (dims) {
      wFt      = Math.max(dims.widthFt,  0.5);
      hFt      = Math.max(dims.heightFt, 0.5);
      isCircle = dims.type === 'circle';
    } else {
      wFt = bed.type === 'circle' ? 4 : 4;
      hFt = bed.type === 'circle' ? 4 : 8;
      isCircle = bed.type === 'circle';
    }

    // Scale to fit MAX_W × MAX_H with padding
    const scale = Math.min((MAX_W - PAD * 2) / wFt, (MAX_H - PAD * 2) / hFt);
    const bW    = wFt * scale;
    const bH    = hFt * scale;
    const svgW  = bW + PAD * 2;
    const svgH  = bH + PAD * 2;
    const ox = PAD, oy = PAD;

    // Grid lines at 1-foot increments
    let gridLines = '';
    for (let x = 0; x <= Math.ceil(wFt); x++) {
      const px = ox + x * scale;
      if (px > ox + bW + 0.5) break;
      gridLines += `<line x1="${f(px)}" y1="${oy}" x2="${f(px)}" y2="${f(oy + bH)}"
        stroke="#00000020" stroke-width="${x === 0 || x === Math.ceil(wFt) ? 1.5 : 0.6}"/>`;
    }
    for (let y = 0; y <= Math.ceil(hFt); y++) {
      const py = oy + y * scale;
      if (py > oy + bH + 0.5) break;
      gridLines += `<line x1="${ox}" y1="${f(py)}" x2="${f(ox + bW)}" y2="${f(py)}"
        stroke="#00000020" stroke-width="${y === 0 || y === Math.ceil(hFt) ? 1.5 : 0.6}"/>`;
    }

    // Clip path + bed shape
    const clipId = `sclip-${bed.id}`;
    let clipShape, bedShape;
    if (isCircle) {
      const cx = f(ox + bW / 2), cy = f(oy + bH / 2);
      const rx = f(bW / 2),      ry = f(bH / 2);
      clipShape = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
      bedShape  = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
        fill="${bed.fill}28" stroke="${bed.fill}" stroke-width="2"/>`;
    } else {
      clipShape = `<rect x="${ox}" y="${oy}" width="${f(bW)}" height="${f(bH)}"/>`;
      bedShape  = `<rect x="${ox}" y="${oy}" width="${f(bW)}" height="${f(bH)}"
        fill="${bed.fill}28" stroke="${bed.fill}" stroke-width="2"/>`;
    }

    // Dimension label below bed
    const dimLabel = dims
      ? `<text x="${f(ox + bW / 2)}" y="${f(oy + bH + 18)}"
           text-anchor="middle" font-size="11" fill="#718096"
           font-family="system-ui,sans-serif">${fmtDims(dims)}</text>`
      : '';

    // Placed plant icons
    const ICON_R = Math.min(14, Math.max(9, scale * 0.45));
    let plantIcons = '';
    bedPlantings.forEach(pl => {
      const px  = f(ox + pl.x * bW);
      const py  = f(oy + pl.y * bH);
      const sel = pl.id === _selectedPlantingId;
      plantIcons += `
        <g class="season-planted${sel ? ' season-planted--sel' : ''}"
           data-planting-id="${pl.id}"
           transform="translate(${px},${py})"
           style="cursor:pointer">
          <circle r="${ICON_R + 2}"
            fill="${sel ? '#ebf8ff' : '#ffffffdd'}"
            stroke="${sel ? '#3182ce' : '#00000033'}"
            stroke-width="${sel ? 2.5 : 1}"/>
          <svg x="${-ICON_R}" y="${-ICON_R}"
               width="${ICON_R * 2}" height="${ICON_R * 2}"
               viewBox="0 0 32 32" overflow="visible">
            ${plantIconInner(pl.plantType)}
          </svg>
        </g>`;
    });

    // Blue dashed border when in placement mode
    const placingBorder = _placingPlantType
      ? `<rect x="2" y="2" width="${f(svgW - 4)}" height="${f(svgH - 4)}"
           rx="6" fill="none" stroke="#3182ce" stroke-width="2"
           stroke-dasharray="8 4" pointer-events="none" opacity="0.55"/>`
      : '';

    return `
      <svg id="season-svg"
           class="season-svg${_placingPlantType ? ' season-svg--placing' : ''}"
           viewBox="0 0 ${f(svgW)} ${f(svgH)}"
           width="${f(svgW)}" height="${f(svgH)}"
           data-ox="${ox}" data-oy="${oy}"
           data-bw="${bW.toFixed(3)}" data-bh="${bH.toFixed(3)}"
           data-is-circle="${isCircle}"
           data-svgw="${f(svgW)}" data-svgh="${f(svgH)}"
           style="max-width:100%;display:block">
        <defs><clipPath id="${clipId}">${clipShape}</clipPath></defs>
        <g clip-path="url(#${clipId})">${gridLines}</g>
        ${bedShape}
        ${plantIcons}
        ${placingBorder}
        ${dimLabel}
      </svg>`;
  }

  function renderDetail(pl) {
    const plant = getPlant(pl.plantType);
    return `
      <div class="season-detail">
        <div class="season-detail-head">
          <svg viewBox="0 0 32 32" width="26" height="26" style="flex-shrink:0;display:block">
            ${plantIconInner(pl.plantType)}
          </svg>
          <span class="season-detail-title">${plant?.label ?? pl.plantType}</span>
          <button class="btn btn-ghost btn-sm season-detail-x" id="sd-close">✕</button>
        </div>
        <div class="season-detail-body">
          <div class="season-field">
            <label class="season-label">Name / Variety</label>
            <input class="season-input" id="sd-name" type="text"
                   placeholder="e.g. Cherokee Purple" value="${esc(pl.name ?? '')}"/>
          </div>
          <div class="season-field">
            <label class="season-label">Date Planted</label>
            <input class="season-input season-input--date" id="sd-date"
                   type="date" value="${pl.datePlanted ?? ''}"/>
          </div>
          <div class="season-field">
            <label class="season-label">Started From</label>
            <div class="season-radios">
              <label class="season-radio">
                <input type="radio" name="sd-origin" value="seed"
                  ${pl.origin === 'seed' ? 'checked' : ''}> Seed
              </label>
              <label class="season-radio">
                <input type="radio" name="sd-origin" value="transplant"
                  ${(!pl.origin || pl.origin === 'transplant') ? 'checked' : ''}> Transplant
              </label>
            </div>
          </div>
          <div class="season-detail-actions">
            <button class="btn btn-primary btn-sm" id="sd-save">Save</button>
            <button class="btn btn-danger  btn-sm" id="sd-delete">Remove</button>
          </div>
        </div>
      </div>`;
  }

  // ── Event binding ───────────────────────────────────────────────────────────

  function bindEvents() {

    // Bed list clicks
    container.querySelectorAll('[data-bed-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        _selectedBedId      = btn.dataset.bedId;
        _selectedPlantingId = null;
        _placingPlantType   = null;
        render();
      });
    });

    // Plant palette buttons
    container.querySelectorAll('[data-plant-key]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.plantKey;
        // Toggle: clicking same type again cancels placement
        _placingPlantType   = (_placingPlantType === key) ? null : key;
        _selectedPlantingId = null;
        render();
      });
    });

    // Bed SVG: place new plants or select existing ones
    const svg = container.querySelector('#season-svg');
    if (svg) {
      svg.addEventListener('click', e => {

        // Clicked an existing plant icon?
        const plantEl = e.target.closest('[data-planting-id]');
        if (plantEl) {
          _selectedPlantingId = plantEl.dataset.plantingId;
          _placingPlantType   = null;
          render();
          return;
        }

        // No active placement tool — just deselect
        if (!_placingPlantType) {
          _selectedPlantingId = null;
          render();
          return;
        }

        // Calculate fractional position within bed bounds
        const svgRect = svg.getBoundingClientRect();
        const svgW  = parseFloat(svg.dataset.svgw);
        const svgH  = parseFloat(svg.dataset.svgh);
        const ox    = parseFloat(svg.dataset.ox);
        const oy    = parseFloat(svg.dataset.oy);
        const bW    = parseFloat(svg.dataset.bw);
        const bH    = parseFloat(svg.dataset.bh);
        const isCircle = svg.dataset.isCircle === 'true';

        const canvasX = (e.clientX - svgRect.left)  / svgRect.width  * svgW;
        const canvasY = (e.clientY - svgRect.top)   / svgRect.height * svgH;
        const fx = (canvasX - ox) / bW;
        const fy = (canvasY - oy) / bH;

        // Validate click is inside bed shape
        if (isCircle) {
          const dx = fx - 0.5, dy = fy - 0.5;
          if (dx * dx + dy * dy > 0.25) return; // outside ellipse
        } else {
          if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;
        }

        const planting = {
          id:          crypto.randomUUID(),
          bedId:       _selectedBedId,
          plantType:   _placingPlantType,
          x:           +fx.toFixed(4),
          y:           +fy.toFixed(4),
          name:        '',
          datePlanted: '',
          origin:      'transplant',
        };

        // Set module state BEFORE addPlanting, which fires notify() → re-render
        _selectedPlantingId = planting.id;
        _placingPlantType   = null;
        addPlanting(gardenId, planting);
        // DOM has been replaced; click handler returns cleanly
      });
    }

    // Detail form: close
    container.querySelector('#sd-close')?.addEventListener('click', () => {
      _selectedPlantingId = null;
      render();
    });

    // Detail form: save — read values BEFORE calling updatePlanting (which triggers re-render)
    container.querySelector('#sd-save')?.addEventListener('click', () => {
      const name     = container.querySelector('#sd-name')?.value ?? '';
      const date     = container.querySelector('#sd-date')?.value ?? '';
      const originEl = container.querySelector('[name="sd-origin"]:checked');
      const origin   = originEl?.value ?? 'transplant';
      updatePlanting(gardenId, _selectedPlantingId, { name, datePlanted: date, origin });
    });

    // Detail form: remove
    container.querySelector('#sd-delete')?.addEventListener('click', () => {
      const id = _selectedPlantingId;
      _selectedPlantingId = null;
      deletePlanting(gardenId, id);
    });
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Extract actual bed dimensions (in feet) from the saved Fabric canvas JSON. */
function getBedDimensions(garden, bedId) {
  const objs = garden.layout?.canvasJson?.objects;
  if (!objs) return null;
  const obj = objs.find(o => o.bedId === bedId);
  if (!obj) return null;

  const sx = obj.scaleX || 1;
  const sy = obj.scaleY || 1;

  if (obj.type === 'ellipse') {
    return {
      type:     'circle',
      widthFt:  (obj.rx * sx * 2) / GRID_SIZE,
      heightFt: (obj.ry * sy * 2) / GRID_SIZE,
    };
  }
  return {
    type:     'rect',
    widthFt:  (obj.width  * sx) / GRID_SIZE,
    heightFt: (obj.height * sy) / GRID_SIZE,
  };
}

function fmtDims(dims) {
  const r1 = n => Math.round(n * 10) / 10;
  if (dims.type === 'circle') {
    const rx = r1(dims.widthFt / 2), ry = r1(dims.heightFt / 2);
    return rx === ry ? `r = ${rx}'` : `${r1(dims.widthFt)}' × ${r1(dims.heightFt)}'`;
  }
  return `${r1(dims.widthFt)}' × ${r1(dims.heightFt)}'`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Round to 1 decimal for SVG attribute values */
function f(n) { return n.toFixed(1); }
