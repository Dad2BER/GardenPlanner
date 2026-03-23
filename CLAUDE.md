# CLAUDE.md — GardenPlanner

Guidance for Claude Code when working in this repository.

---

## Git & Workflow

- **Commit to `main` after every completed feature or bug fix**, then `git push origin main`.
- No CI, no linters, no tests — the commit is the checkpoint.

---

## Running the App

The app **must be served over HTTP** — ES modules refuse to load from `file://` URLs.

```bash
# From C:\Claude\GardenPlanner\
python server.py     # port 3000 (preferred)
```

Open `http://localhost:3000`. After editing files, **Ctrl+Shift+R** (hard reload) is sufficient — no build step.

---

## Architecture

Zero-dependency vanilla JS SPA using native ES modules (`type="module"`). Fabric.js loaded from CDN for the canvas layout designer. No framework, no bundler, no package.json.

### Entry Points
| File | Role |
|------|------|
| `index.html` | All CSS in one `<style>` block; loads `src/app.js` |
| `src/app.js` | Bootstrap, navigation, render dispatch |

### Navigation Model
View state: `{ page, gardenId? }`

Pages:
- `gardens` — garden list (default)
- `layout` — Fabric.js layout designer for a garden
- `season` — plant/cost/note tracking for a garden season (stub)
- `history` — year-over-year history (stub)
- `costs` — other costs tracking (stub)
- `notes` — notes and weather events (stub)
- `calendar` — planting calendar (stub)

### State Layer (`src/state.js`)
Central pub/sub store. Components never write to localStorage directly.
Key exports:
```js
initState(data)
subscribe(fn) / notify()
getGardens() / getGarden(id)
addGarden(garden) / updateGarden(id, patch) / deleteGarden(id)
updateGardenLayout(id, layout)
```

### Persistence
- Server JSON file at `data/gardens.json` via `/api/data` GET/POST
- Every mutation auto-saves via `saveData()` async POST

### Fabric.js Canvas Conventions
- Beds are `fabric.Rect` or `fabric.Ellipse` objects with custom props: `bedId`, `bedName`, `bedType`, `bedFill`
- Floating labels (`fabric.Text`) follow shapes — tracked in a `Map`, not serialized
- Grid lines marked with `isGrid: true` — filtered out on save
- Save format: `{ canvasJson, beds: [{ id, name, type, fill }] }`
- Custom props serialized via `canvas.toJSON(['bedId','bedName','bedType','bedFill','isGrid'])`

### Avoiding the Re-render/Focus Destruction Bug
When a control triggers a re-render, never wipe its own container.
Build the control once, re-render only a results/output div below it.

---

## CSS Conventions

All styles in `index.html`'s `<style>` block. Key namespaces:
- `.garden-*` — garden list and card styles
- `.layout-*` — layout designer
- `.season-*` — season view
- `.sidebar-*` — sidebar navigation

---

## Data Model

### Garden
```js
{
  id: string,
  name: string,
  description: string,
  createdAt: ISO string,
  layout: {
    canvasJson: object,       // Fabric.js canvas.toJSON() — shapes only
    beds: [{ id, name, type, fill }]
  }
}
```

### Season (future)
```js
{
  year: number,
  beds: [{
    bedId: string,
    plants: [{ id, name, variety, method, datePlanted, cost, notes }],
    costs:  [{ id, date, category, amount, note }],
    notes:  [{ id, date, type, text }],
  }]
}
```
