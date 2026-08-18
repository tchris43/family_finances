# Family Budget (budget_app)

Simple household budget spreadsheet — client-side only. Add categories, track planned vs actual spending, and see what's left over.

**Live data stays in your browser.** This repo is just the app code. Nothing you type into the budget is committed to GitHub.

## What it does

- Add/remove budget rows (category, planned, actual)
- Auto-calculates totals and leftover
- Saves to `localStorage` in the browser (persists between visits on the same device)

## Privacy

- **No backend, no database, no accounts**
- Budget numbers exist only in the user's browser `localStorage`
- Making this repo public does **not** expose anyone's personal finances

Before publishing, still worth a quick check: no `.env` files, no exported CSVs, no sample data with real numbers in the repo.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8080
```

Then visit `http://localhost:8080`.

## Stack

- HTML / CSS / JavaScript
- `localStorage` for persistence
- PWA scaffolding (`manifest.json`, `service-worker.js`) — work in progress

## Author

Taylor Christensen — side project / household tool. Not related to Summit (summitproficiency.com).

---

*Copy this file to `README.md` in [tchris43/budget_app](https://github.com/tchris43/budget_app).*
