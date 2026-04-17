# Build a Chrome Extension: AI Hub New Tab

  ## What to Build
  A Chrome extension (Manifest V3) that replaces the browser's New Tab page with a clean, dark-themed dashboard showing the latest AI news, AI YouTube videos, trending AI discussions from Hacker News, and recent AI research
   papers from ArXiv. All data comes from free RSS feeds and public APIs — no API keys needed.
                                                                                                                                                                                                                                 ## Layout Design
                                                                                                                                                                                                                               
  The new tab page should look like a modern dashboard with this layout:

  ┌──────────────────────────────────────────────────────────┐
  │  AI Hub                                    🔄 Refresh    │
  │  Greeting: "Good morning, Himanshu" (based on time)      │
  │  Date: Thursday, April 17, 2026                          │
  ├──────────────┬──────────────┬──────────────┬─────────────┤
  │  AI News     │  AI Videos   │  Hacker News │  ArXiv      │
  │  (column 1)  │  (column 2)  │  (column 3)  │  (column 4) │
  │              │              │              │             │
  │  card        │  card        │  card        │  card       │
  │  card        │  card        │  card        │  card       │
  │  card        │  card        │  card        │  card       │
  │  card        │  card        │  card        │  card       │
  │  card        │  card        │  card        │  card       │
  │  ...         │  ...         │  ...         │  ...        │
  └──────────────┴──────────────┴──────────────┴─────────────┘

  - 4 columns on desktop, 2 columns on tablet, 1 column on mobile (use CSS grid with responsive breakpoints)
  - Each column is independently scrollable if content overflows
  - Max 10-15 items per column

  ## Data Sources (ALL FREE, NO API KEYS)

  ### Column 1: AI News (RSS Feeds)
  Fetch and merge RSS feeds from these sources:
  https://techcrunch.com/category/artificial-intelligence/feed/
  https://www.theverge.com/rss/ai-artificial-intelligence/index.xml
  https://feeds.arstechnica.com/arstechnica/technology-lab
  https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml

  - Use a CORS proxy to fetch RSS since Chrome extensions can't directly fetch cross-origin RSS
  - **CORS solution**: Use the extension's background service worker with `host_permissions` to fetch directly — no proxy needed
  - Parse XML using `DOMParser`
  - Extract: title, link, source name, published date, thumbnail (if available in `<media:content>` or `<enclosure>`)
  - Sort all items by date (newest first)
  - Show max 15 items

  ### Column 2: AI YouTube Videos (RSS Feeds)
  Fetch YouTube RSS feeds (no API key needed):
  https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg  (Two Minute Papers)
  https://www.youtube.com/feeds/videos.xml?channel_id=UCWN3xxRkmTPphYit_FN5e4A  (Fireship)
  https://www.youtube.com/feeds/videos.xml?channel_id=UCZHmQk67mSJgfCCTn7xBfew  (Matt Wolfe)
  https://www.youtube.com/feeds/videos.xml?channel_id=UCr8O8l5cCX85Oem1d18EezQ  (3Blue1Brown)
  https://www.youtube.com/feeds/videos.xml?channel_id=UCddiUEpeqJcYeBxX1IVBKvQ  (The AI Epiphany)
  https://www.youtube.com/feeds/videos.xml?channel_id=UCNJ1Ymd5yFuUPtn21xtR6Q  (NetworkChuck)

  - Parse Atom XML feed
  - Extract: title, link, channel name, published date, thumbnail (construct from video ID: `https://i.ytimg.com/vi/VIDEO_ID/mqdefault.jpg`)
  - Sort by date, show max 10 items
  - Each card should show thumbnail image, video title, channel name, and how long ago it was published

  ### Column 3: Hacker News AI Discussions
  Fetch from Algolia's free HN API:
  https://hn.algolia.com/api/v1/search?query=AI+OR+LLM+OR+GPT+OR+Claude+OR+machine+learning&tags=story&hitsPerPage=15

  - Returns JSON directly — no XML parsing needed
  - Extract: title, url (or HN discussion url), author, points, num_comments, created_at
  - Sort by points (most popular first)
  - Each card shows: title, points, comment count, author, time ago

  ### Column 4: ArXiv AI Papers
  Fetch from ArXiv API:
  https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=15

  - Returns Atom XML
  - Extract: title, authors (first 2 + "et al"), abstract (truncate to 150 chars), link, published date
  - Each card shows: title, authors, short abstract preview, date
  - Click to open the paper on ArXiv

  ## Card Design

  ### News Card
  ┌─────────────────────────┐
  │ [Thumbnail if available]│
  │ Article Title Here      │
  │ TechCrunch · 2h ago     │
  └─────────────────────────┘

  ### YouTube Card
  ┌─────────────────────────┐
  │ [Video Thumbnail]       │
  │ Video Title Here        │
  │ Two Minute Papers · 5h  │
  └─────────────────────────┘

  ### Hacker News Card
  ┌─────────────────────────┐
  │ Discussion Title Here   │
  │ ▲ 234 · 45 comments    │
  │ by username · 3h ago    │
  └─────────────────────────┘

  ### ArXiv Card
  ┌─────────────────────────┐
  │ Paper Title Here        │
  │ Author1, Author2 et al  │
  │ First 150 chars of...   │
  │ April 16, 2026          │
  └─────────────────────────┘

  ## File Structure
  ai-hub-newtab/
  ├── manifest.json
  ├── newtab.html          # The new tab page
  ├── newtab.css           # All styling
  ├── newtab.js            # Main logic: fetch data, render cards, handle refresh
  ├── background.js        # Service worker: fetches RSS/API data (bypasses CORS)
  ├── icons/
  │   ├── icon16.png       # Simple AI-themed icon (brain or circuit pattern)
  │   ├── icon48.png
  │   └── icon128.png
  └── README.md            # Project description, features, install instructions, demo video link

  ## manifest.json
  ```json
  {
    "manifest_version": 3,
    "name": "AI Hub - New Tab",
    "version": "1.0",
    "description": "Replace your new tab with a live AI news, videos, papers, and discussions dashboard",
    "permissions": ["storage"],
    "host_permissions": [
      "https://techcrunch.com/*",
      "https://www.theverge.com/*",
      "https://feeds.arstechnica.com/*",
      "https://news.mit.edu/*",
      "https://www.youtube.com/*",
      "https://hn.algolia.com/*",
      "https://export.arxiv.org/*",
      "https://i.ytimg.com/*"
    ],
    "chrome_url_overrides": {
      "newtab": "newtab.html"
    },
    "background": {
      "service_worker": "background.js"
    },
    "icons": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  }

  Architecture

  background.js (Service Worker)

  - Listens for messages from newtab.js
  - Handles all fetch requests (RSS feeds, APIs) since the service worker has host_permissions and bypasses CORS
  - Message format: {action: "fetchFeed", url: "..."} → returns parsed data
  - Caches responses in chrome.storage.local with a timestamp
  - Cache TTL: 15 minutes — if cached data is fresh, return it instead of re-fetching
  - This prevents hitting rate limits and makes new tabs open instantly

  newtab.js

  1. On page load:
    - Show greeting based on time of day (Good morning/afternoon/evening) and current date
    - Show loading skeleton placeholders in each column
    - Send fetch requests to background.js for all 4 data sources in parallel
    - As each source responds, render that column's cards (don't wait for all)
  2. "Refresh" button: clears cache, re-fetches all sources
  3. Time ago function: convert ISO dates to "2h ago", "1 day ago", etc.
  4. All links open in the same tab (not new tab, since this IS the new tab)
  5. Error handling: if a source fails, show "Could not load [source name]. Click to retry." in that column

  newtab.css

  - Dark theme background: #0f0f1a or similar very dark blue-black
  - Card background: #1a1a2e with subtle border or shadow
  - Card hover: slight lift effect (translateY -2px) with brighter border
  - Text colors: #e0e0e0 for titles, #888 for metadata
  - Column headers: bold, with a subtle colored accent per column (blue for news, red for YouTube, orange for HN, green for ArXiv)
  - Thumbnails: rounded corners, 16:9 aspect ratio maintained
  - Smooth fade-in animation when cards load (opacity 0 → 1)
  - Scrollbar: thin, styled to match dark theme (use ::-webkit-scrollbar)
  - Google Fonts: import "Inter" for clean modern typography
  - Loading skeletons: animated pulse effect with grey placeholder blocks

  Responsive Design

  - Desktop (>1200px): 4 columns
  - Tablet (768-1200px): 2 columns, 2 rows
  - Mobile (<768px): 1 column, stacked vertically
  - Use CSS Grid: grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))

  Edge Cases

  - If all feeds fail (no internet): show a clean "You're offline. Showing cached data." message and load from cache
  - If cache is empty AND offline: show "No data available. Connect to the internet and refresh."
  - RSS feeds sometimes have HTML entities in titles (&amp; etc.) — decode them properly
  - Some RSS items may not have thumbnails — show cards without image gracefully
  - ArXiv titles sometimes have LaTeX — strip or ignore LaTeX formatting
  - YouTube feed may have non-AI videos from general channels — that's fine, the channels are curated
  - Handle missing fields gracefully — if any field is null/undefined, skip it rather than showing "undefined"

  Do NOT

  - Do not use any JavaScript frameworks (React, Vue, etc.) — vanilla JS only
  - Do not use any external JS libraries
  - Do not require any API keys
  - Do not make fetches from newtab.js directly — all network requests go through background.js
  - Do not use Manifest V2 APIs
  - Do not add settings/preferences UI — keep it simple for v1
  - Do not add a search bar or bookmarks — this is purely an AI dashboard
  - Google Fonts (Inter) is the ONLY external resource allowed (loaded via CSS @import)

  After Building

  - Load as unpacked extension in Chrome
  - Open a new tab — should show the AI Hub dashboard
  - Verify all 4 columns load with real data
  - Verify clicking a card opens the link
  - Verify refresh button works
  - Verify it works after closing and reopening Chrome (cache)
  - Verify responsive layout on different window sizes
  - Test with internet disconnected (should show cached or error state)