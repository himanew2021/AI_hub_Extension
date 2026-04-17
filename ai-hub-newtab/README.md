# AI Hub — New Tab

A Chrome extension (Manifest V3) that replaces the browser's New Tab page with a clean, dark-themed dashboard of the latest AI news, AI YouTube videos, trending Hacker News AI discussions, and recent ArXiv papers.

All data comes from free RSS feeds and public APIs — **no API keys required**.

## Features

- **4-column dashboard**: AI News, AI Videos, Hacker News, ArXiv papers
- **Live feeds**: Merged and sorted from multiple sources per column
- **Dark theme** with smooth animations and responsive layout
- **15-minute cache** in `chrome.storage.local` for instant new-tab loads
- **Offline-friendly**: falls back to cached data when network is down
- **No frameworks, no libraries, no API keys** — pure vanilla JS

## Data Sources

| Column       | Sources                                                                 |
|--------------|-------------------------------------------------------------------------|
| AI News      | TechCrunch AI, The Verge AI, Ars Technica Tech Lab, MIT News AI         |
| AI Videos    | Two Minute Papers, Fireship, Matt Wolfe, 3Blue1Brown, AI Epiphany, NetworkChuck |
| Hacker News  | Algolia HN search (AI / LLM / GPT / Claude / machine learning)          |
| ArXiv        | cs.AI, cs.LG, cs.CL categories, sorted by submission date               |

## Install (unpacked)

1. Open `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right).
3. Click **Load unpacked**.
4. Select the `ai-hub-newtab/` folder.
5. Open a new tab — the AI Hub dashboard loads.

## File Structure

```
ai-hub-newtab/
├── manifest.json     # Manifest V3 config, host permissions, new-tab override
├── newtab.html       # Dashboard shell
├── newtab.css        # Dark theme, grid layout, responsive breakpoints
├── newtab.js         # Renders cards, handles refresh, talks to service worker
├── background.js     # Fetches feeds (bypasses CORS), caches for 15 min
├── icons/            # 16/48/128 PNG icons
└── README.md
```

## Architecture

- **`background.js`** (service worker): All network fetches go here. Parses RSS/Atom/JSON, decodes HTML entities, strips LaTeX for ArXiv titles, caches results per-source with timestamps. Listens for `{action: "fetchFeed", source, forceRefresh}` and `{action: "clearCache"}` messages.
- **`newtab.js`**: Renders the page. On load, shows greeting + date, fires 4 parallel fetches to the service worker, renders each column as it responds. Refresh button clears cache and re-fetches.

## Responsive Layout

- Desktop (>1200px): 4 columns
- Tablet (768–1200px): 2×2 grid
- Mobile (<768px): single column, stacked

## Notes

- Icons: The three PNG files under `icons/` need to be present for the extension to load. Use any AI/brain-themed icon at 16×16, 48×48, and 128×128 pixels.
- The service worker uses `host_permissions` to fetch cross-origin feeds directly — no CORS proxy needed.
- Cache lives in `chrome.storage.local` (scoped per-extension, auto-cleared on uninstall).

## Troubleshooting

- **A column shows "Could not load…"**: Click the message to retry. The feed may be temporarily down or rate-limited.
- **Nothing loads at all**: Check your internet connection. If offline, cached data will be shown when available.
- **Icons missing error when loading the unpacked extension**: Drop any 16/48/128 PNGs into `icons/` with the filenames shown above.
