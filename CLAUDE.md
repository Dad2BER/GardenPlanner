# CLAUDE.md — GardenPlanner

> **RULE: Update this file as part of every feature commit.**
> After completing a feature or fix, update the relevant sections below before committing.
> This file is the single source of truth for the project — keep it accurate so future
> conversations require zero codebase archaeology.

---

## Git & Workflow

- **Commit to `main` after every completed feature or bug fix**, then `git push origin main`.
- No CI, no linters, no tests — the commit is the checkpoint.
- Batch file on user's desktop: `C:\Users\Dad2BER\Desktop\Garden Planner.bat`
  — starts `python server.py` and opens `http://localhost:3000`.

---

## Running the App

The app **must be served over HTTP** — ES modules refuse to load from `file://` URLs.

```bash
# From C:\Claude\GardenPlanner\
python server.py     # port 3000
```

After editing files, **Ctrl+Shift+R** (hard reload) is sufficient — no build step.

---

## File Structure

```
GardenPlanner/
├── index.html                  All CSS (one <style> block) + app shell HTML + loads src/app.js
├── server.py                   HTTP server: static files + GET/POST /api/data → data/gardens.json
├── data/
│   └── gardens.json            Runtime data (gitignored)
└── src/
    ├── app.js                  Bootstrap, navigation, render dispatch (header/sidebar/content)
    ├── state.js                Central pub/sub state store + CRUD
    ├── services/
    │   └── storage.js          REST helpers: loadData() / saveData(data)
    └── views/
        ├── gardensView.js      Garden list page: create, open, delete gardens
        └── layoutView.js       Fabric.js layout designer (the most complex file)
```

**No build step. No package.json. No framework.**
Fabric.js v5.3.1 loaded from CDN in `index.html`:
`https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js`

---

## Navigation Model (`src/app.js`)

View state object: `{ page, gardenId? }`

```
navigate({ page: 'gardens' })               Garden list
navigate({ page: 'layout', gardenId })      Layout designer
navigate({ page: 'season', gardenId })      Season tracking     ← STUB
navigate({ page: 'history', gardenId })     Year-over-year      ← STUB
navigate({ page: 'costs', gardenId })       Cost log            ← STUB
navigate({ page: 'notes', gardenId })       Notes & events      ← STUB
navigate({ page: 'calendar', gardenId })    Planting calendar   ← STUB
```

**Adding a new page:** add to the `pages` array in `renderSidebar()`, remove it from
the stubs list in the click handler, and add a `case` to `renderContent()` in `app.js`.
Stubs show a "Coming Soon" placeholder automatically via the `default` case.

State changes call `notify()` → `subscribe` callback in `app.js` re-renders everything
**except** layout (layout manages its own Fabric canvas and must not be wiped on state change).

---

## State Layer (`src/state.js`)

Single in-memory object `_data = { gardens: [] }` with pub/sub.

```js
// Init
initState(data)                    // called by app.js after async load

// Subscribe
subscribe(fn)                      // returns unsubscribe fn; triggers on notify()

// Getters
getGardens()                       // returns array
getGarden(id)                      // returns garden or null

// Mutations (all call persist() + notify() except updateGardenLayout)
addGarden(name, description)       // returns new garden object
updateGarden(id, patch)
deleteGarden(id)
updateGardenLayout(id, layout)     // persist() only — no notify() to avoid re-render
```

**Rule:** `updateGardenLayout` must never call `notify()` — doing so would destroy the
Fabric canvas mid-session.

---

## Persistence

| What | How | When |
|------|-----|-------|
| All garden data | POST `/api/data` → `data/gardens.json` | Every mutation |
| Layout canvas | Inside garden's `layout` field | Auto-save 800ms after last change |

`server.py` uses atomic writes (`.tmp` file → `os.replace()`) to prevent corruption.

---

## Layout Designer (`src/views/layoutView.js`)

The most complex file. Read carefully before modifying.

### Constants
```js
GRID_SIZE = 40   // px per foot at zoom 1:1
GARDEN_FT = 50   // virtual garden is 50ft × 50ft
GARDEN_PX = 2000 // GRID_SIZE × GARDEN_FT
ZOOM_MIN  = 0.08
ZOOM_MAX  = 5
```

### Canvas initialisation order — CRITICAL
`loadFromJSON` **wipes all canvas objects**. The grid must be drawn *inside* the
`loadFromJSON` callback, not before it. For new gardens (no saved JSON), draw directly.

```js
if (savedJson) {
  canvas.loadFromJSON(json, () => {
    const beds = canvas.getObjects().filter(o => o.bedId);
    canvas.clear();
    drawGardenSurface();   // soil-coloured rect, isGrid:true
    drawGrid();            // lines + labels + border, isGrid:true
    beds.forEach(obj => { canvas.add(obj); addFloatingLabel(obj); });
    fitToGarden();
    canvas.renderAll();
  });
} else {
  drawGardenSurface();
  drawGrid();
  fitToGarden();
}
```

### Grid lines — strokeUniform: true
Grid lines use `strokeUniform: true` so stroke width stays constant in **screen pixels**
regardless of zoom. Without it, 1px lines become sub-pixel at the default ~15% fit zoom
and are completely invisible.

### Bed objects (fabric.Rect / fabric.Ellipse)
Custom properties stored on each shape:
```js
shape.bedId    // UUID string
shape.bedName  // display name
shape.bedType  // 'rect' | 'circle'
shape.bedFill  // hex fill colour
```
Serialised via `canvas.toJSON(['bedId','bedName','bedType','bedFill','isGrid'])`.
On save, filter to bed shapes only: `json.objects = json.objects.filter(o => o.bedId)`.

### Floating labels (fabric.Text)
Labels are **not serialised** — recreated from bed props on every load.
- Tracked in `_labels: Map<shape, fabric.Text>`
- Use `originX:'center', originY:'center'` so position = shape center point exactly.
  Do NOT use `left = center.x - label.width/2` — `label.width` is unreliable before
  first render.
- After any position update call `label.setCoords()`.
- `syncLabel(shape, label)` → `label.set({ left: c.x, top: c.y }); label.setCoords()`
- `syncAllLabels()` called on `object:modified`.

### Grid objects (isGrid: true)
All non-bed canvas objects (surface rect, grid lines, foot labels, border) are marked
`isGrid: true`. They are:
- Filtered out of saved JSON
- Not selectable / not evented
- Drawn bottom-to-top in this order: surface → minor lines → major lines → foot labels → border

### Zoom & pan
- **Zoom:** `canvas.zoomToPoint(point, zoom)` — mouse wheel + toolbar ± buttons
- **Pan:** `canvas.relativePan(delta)` — Space+drag, Alt+drag, middle-mouse-drag
- **Fit:** `canvas.setViewportTransform([zoom,0,0,zoom,panX,panY])` computed to centre
  the 2000×2000 garden in the viewport with 32px padding
- `updateZoomIndicator()` must be called after any zoom change

### Scrollbars
Custom overlay scrollbars (H + V) inside `.layout-canvas-wrap` (position:relative).
- Hidden when full garden fits; visible when zoomed in past fit level
- Updated via `canvas.on('after:render', updateScrollbars)` — fires after every render
- Thumb drag and track-click both update `viewportTransform` directly and call `renderAll()`
- `bindScrollbar(axis)` is a shared helper for both axes ('h' / 'v')

### New bed placement
Beds are added at the **viewport centre** (canvas coordinates), not the virtual canvas
centre. Use `getViewportCenter()` which inverts the current viewport transform.

### Default bed sizes
```
Rectangle: 160px wide × 320px tall  = 4ft × 8ft  (standard raised bed)
Circle:    rx=80, ry=80              = 4ft diameter
```

### Cleanup
`destroyLayoutView()` is called by `navigate()` whenever leaving the layout page.
It: disposes the Fabric canvas, removes keydown/keyup listeners, clears the save timer.

---

## CSS (`index.html` — one `<style>` block)

| Prefix | Used for |
|--------|----------|
| `.garden-*` | Garden list cards, grid, empty state |
| `.layout-*` | Layout designer shell (wrap, toolbar, body, sidebar, canvas-outer) |
| `.scrollbar-*` | Custom H/V scrollbar overlays in the canvas |
| `.sidebar-*` | App-level sidebar navigation |
| `.bed-*` | Bed list items inside the layout sidebar |
| `.toolbar-*` | Toolbar elements (label, sep, spacer, hint, save status) |
| `.tool-btn` | Toolbar buttons (modifiers: `--danger`, `--icon`) |
| `.rename-*` | Rename overlay modal |
| `.stub-*` | "Coming Soon" placeholder pages |
| `.btn` | General buttons (modifiers: `-primary`, `-ghost`, `-danger`, `-sm`) |
| `.form-*` | Create-garden form inputs |
| `.create-form-*` | Create-garden form wrapper |
| `.empty-*` | Empty-state illustration block |
| `.page-*` | Page header row |
| `.zoom-indicator` | Zoom % readout in toolbar |

CSS variables are defined on `:root` — greens (`--green-*`), earth tones (`--earth-*`),
text (`--text-*`), surface/bg/border/shadow/radius.

---

## Known Patterns & Gotchas

1. **`loadFromJSON` wipes everything** — always draw grid inside its callback.
2. **`strokeUniform:true` on grid lines** — mandatory for visibility at low zoom.
3. **`originX/Y:'center'` on labels** — avoids unreliable `label.width` pre-render.
4. **`updateGardenLayout` must not call `notify()`** — would destroy the live canvas.
5. **`requestAnimationFrame` before `initCanvas`** — ensures DOM layout is complete so
   `wrap.clientWidth` is non-zero when sizing the canvas.
6. **`after:render` hook for scrollbars** — simplest way to keep them in sync with all
   pan/zoom paths without threading update calls through every function.
7. **State subscriber skips layout page** — `if (_view.page !== 'layout') render()`.

---

## Planned Features (not yet built)

In priority order as discussed:
1. **Season view** — per-bed plant tracking (name, variety, seed/transplant, date, cost, notes)
2. **Costs** — garden-level cost log (fertilizer, soil, tools, other)
3. **Notes** — watering schedule, weather events, general observations
4. **Planting Calendar** — visual calendar with reminders
5. **History** — year-over-year view of plantings and spend across seasons

When implementing seasons, each garden will need a `seasons` array added to the data model.
The layout's `beds` array (registry of `{ id, name, type, fill }`) is the bridge between
the canvas and the season data — bed IDs are stable across seasons.
