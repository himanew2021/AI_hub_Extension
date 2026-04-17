const CACHE_TTL_MS = 15 * 60 * 1000;

const NEWS_FEEDS = [
  { url: 'https://techcrunch.com/category/artificial-intelligence/feed/', name: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', name: 'The Verge' },
  { url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', name: 'Ars Technica' },
  { url: 'https://news.mit.edu/topic/mitartificial-intelligence2-rss.xml', name: 'MIT News' }
];

const YOUTUBE_FEEDS = [
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg', name: 'Two Minute Papers' },
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCZHmQk67mSJgfCCTn7xBfew', name: 'Yannic Kilcher' },
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCNJ1Ymd5yFuUPtn21xtRbbw', name: 'AI Explained' },
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCMLtBahI5DMrt0NPvDSoIRQ', name: 'Machine Learning Street Talk' },
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCSHZKyawb77ixDdsGog4iWA', name: 'Lex Fridman' },
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCXl4i9dYBrFOabk0xGmbkRA', name: 'Dwarkesh Patel' },
  { url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCgfe2ooZD3VJPB6aJAnuQng', name: 'bycloud' }
];

const ARXIV_URL = 'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=15';

function buildHnUrl() {
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
  const params = new URLSearchParams({
    query: 'AI',
    tags: 'story',
    hitsPerPage: '200',
    numericFilters: `created_at_i>${sevenDaysAgo}`
  });
  return `https://hn.algolia.com/api/v1/search_by_date?${params.toString()}`;
}

async function fetchText(url) {
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return await resp.text();
}

async function fetchJson(url) {
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return await resp.json();
}

async function fetchMultiXml(feeds) {
  const results = await Promise.allSettled(
    feeds.map(async f => ({ source: f.name, text: await fetchText(f.url) }))
  );
  const ok = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') ok.push(r.value);
    else errors.push({ source: feeds[i].name, error: String(r.reason && r.reason.message || r.reason) });
  });
  if (ok.length === 0) {
    const detail = errors.map(e => `${e.source}: ${e.error}`).join('; ');
    throw new Error(`All feeds failed. ${detail}`);
  }
  return { feeds: ok, errors };
}

const FETCHERS = {
  news:    async () => ({ kind: 'multi-xml', payload: await fetchMultiXml(NEWS_FEEDS) }),
  youtube: async () => ({ kind: 'multi-xml', payload: await fetchMultiXml(YOUTUBE_FEEDS) }),
  hn:      async () => ({ kind: 'json',      payload: await fetchJson(buildHnUrl()) }),
  arxiv:   async () => ({ kind: 'xml',       payload: await fetchText(ARXIV_URL) })
};

function cacheKey(source) { return `cache:${source}`; }

function readCache(key) {
  return new Promise(resolve => {
    chrome.storage.local.get([key], result => resolve(result[key] || null));
  });
}

function writeCache(key, data) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [key]: { data, timestamp: Date.now() } }, resolve);
  });
}

function clearAllCache() {
  const keys = Object.keys(FETCHERS).map(cacheKey);
  return new Promise(resolve => chrome.storage.local.remove(keys, resolve));
}

async function getSource(source, forceRefresh) {
  const fetcher = FETCHERS[source];
  if (!fetcher) throw new Error(`Unknown source: ${source}`);
  const key = cacheKey(source);

  if (!forceRefresh) {
    const cached = await readCache(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { ok: true, data: cached.data, cached: true, stale: false };
    }
  }

  try {
    const data = await fetcher();
    await writeCache(key, data);
    return { ok: true, data, cached: false, stale: false };
  } catch (err) {
    const cached = await readCache(key);
    const message = String(err && err.message || err);
    if (cached) {
      return { ok: true, data: cached.data, cached: true, stale: true, error: message };
    }
    return { ok: false, error: message };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg.action !== 'string') {
    sendResponse({ ok: false, error: 'Invalid message' });
    return false;
  }

  if (msg.action === 'fetchFeed') {
    getSource(msg.source, !!msg.forceRefresh)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ ok: false, error: String(err && err.message || err) }));
    return true;
  }

  if (msg.action === 'clearCache') {
    clearAllCache().then(() => sendResponse({ ok: true }));
    return true;
  }

  sendResponse({ ok: false, error: 'Unknown action' });
  return false;
});
