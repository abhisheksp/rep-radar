# Rep Radar — CLAUDE.md

Static web app: upload workout CSV exports → interactive lift progression charts with rep-max normalization.

## Stack
- **Vite + React** (no backend, everything client-side)
- **Papaparse** — CSV parsing
- **Recharts** — charts (ComposedChart with Line + Area)
- **Vercel** — deploy target (static)
- Mobile-first; primary users on iOS Safari

## Project Structure

```
src/
  adapters/
    index.js          ← ADAPTERS registry + getAdapter(id) helper
    sugarwod.js       ← SugarWod adapter (meta + parse)
  components/
    UploadScreen.jsx  ← source dropdown + drag-and-drop CSV upload
    Dashboard.jsx     ← Rep Radar visualization (accepts LiftEntry[] as prop)
  utils/
    epley.js          ← estimateNRM() and estimate1RM()
  App.jsx             ← upload screen → dashboard state machine
index.html            ← PWA meta tags + Google Fonts
```

## Adapter Contract

Every adapter file must export:

```js
export const meta = {
  id: string,                    // unique, e.g. "sugarwod"
  name: string,                  // display name, e.g. "SugarWod"
  description: string,           // one-line description
  exportInstructions: string[],  // ordered steps shown to user
};

export function parse(csvString: string): LiftEntry[]
```

Register new adapters in `src/adapters/index.js` — just import and add to the `ADAPTERS` array.

## Canonical LiftEntry Format

```js
{
  date: "MM/DD/YYYY",       // string
  lift: "Deadlift",          // barbell_lift column (normalized lift name)
  title: "Deadlift 5x3",    // original workout title from CSV
  reps: 3,                   // rep count for the heaviest/best set
  maxLoad: 155,              // heaviest load in lbs (best_result_raw)
  setLoads: [155, 155, 155], // per-set loads from set_details
  notes: "...",              // user notes from CSV
  isPR: true,                // pr column === "PR"
}
```

## SugarWod Adapter Rules (`src/adapters/sugarwod.js`)

CSV columns: `date, title, description, best_result_raw, best_result_display, score_type, barbell_lift, set_details, notes, rx_or_scaled, pr`

1. Skip rows where `title === "Class Times"`
2. Only process rows where `barbell_lift` is non-empty AND `score_type === "Load"`
3. `lift` = `barbell_lift` column
4. `maxLoad` = `best_result_raw` (float)
5. `setLoads` = parse `set_details` JSON; CSV uses `""` to escape inner quotes → replace `""` → `"` before JSON.parse; extract `load` from each object
6. **Rep extraction** (priority order):
   - NxM in title (e.g. "Deadlift 5x3" → 3)
   - Pyramid sequence in title (e.g. "Snatch 5-3-2-2-3-3-5") → find maxLoad position in setDetails → sequence[position]; if all loads equal, take min of sequence
   - "heavy single" in title/description → 1
   - "heavy N rep" in title/description → N
   - "#N: M reps" pattern in description → M at maxLoad's set position
   - NxM in description
   - Pyramid sequence in description
   - Fallback: 1
7. `isPR` = `pr` column === "PR"

## Dashboard (`src/components/Dashboard.jsx`)

**Props:** `entries: LiftEntry[]`, `onReset: () => void`

- Internally calls `processEntries(entries)` to build `liftMap`, `liftRepOptions`, `liftNames`
- Lift display priority: Deadlift, Bench Press, Back Squat, Push Press, Shoulder Press, then rest alphabetically
- Same-day same-lift entries are consolidated — best estimated value plotted; all entries shown in tooltip
- RM buttons normalize chart to any target rep count via Epley formula
- Filled dot = actual RM at that rep count; hollow + slash = extrapolated via Epley; ★ = PR

## Epley Formula (`src/utils/epley.js`)

```js
estimateNRM(weight, actualReps, targetReps)
  // estimates load for targetReps given weight × actualReps
  // est1RM = weight × (1 + actualReps/30)
  // estNRM = est1RM / (1 + targetReps/30)

estimate1RM(weight, reps)  // shorthand for estimateNRM(weight, reps, 1)
```

## Adding a New Adapter

1. Create `src/adapters/<source>.js` exporting `meta` and `parse()`
2. Import and add to `ADAPTERS` array in `src/adapters/index.js`
3. The source automatically appears in the UploadScreen dropdown

## Development

```bash
npm run dev     # local dev server
npm run build   # production build → dist/
npm run preview # preview prod build
```

Deploy `dist/` to Vercel as a static site.
