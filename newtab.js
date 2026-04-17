const SOURCES = ['news', 'youtube', 'hn', 'arxiv'];
const SOURCE_LABELS = {
  news: 'AI News',
  youtube: 'AI Videos',
  hn: 'Hacker News',
  arxiv: 'ArXiv'
};

const YT_NS = 'http://www.youtube.com/xml/schemas/2015';
const MEDIA_NS = 'http://search.yahoo.com/mrss/';

function $(id) { return document.getElementById(id); }

function setGreeting() {
  const now = new Date();
  const hour = now.getHours();
  let greet;
  if (hour < 12) greet = 'Good morning';
  else if (hour < 18) greet = 'Good afternoon';
  else greet = 'Good evening';
  $('greeting').textContent = `${greet}, Himanshu`;

  $('date').textContent = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function timeAgo(iso) {
  if (!iso) return '';
  const d = Date.parse(iso);
  if (isNaN(d)) return '';
  const diff = Math.max(0, Date.now() - d);
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day} day${day === 1 ? '' : 's'} ago`;
  const w = Math.floor(day / 7);
  if (w < 5) return `${w} week${w === 1 ? '' : 's'} ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? '' : 's'} ago`;
  const y = Math.floor(day / 365);
  return `${y} year${y === 1 ? '' : 's'} ago`;
}

function formatDateLong(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function decodeEntities(str) {
  if (!str) return '';
  const ta = document.createElement('textarea');
  ta.innerHTML = str;
  return ta.value;
}

function stripHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function stripLatex(str) {
  if (!str) return '';
  return str
    .replace(/\$[^$]*\$/g, '')
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getChildText(parent, tagName) {
  if (!parent) return '';
  const children = parent.children;
  for (let i = 0; i < children.length; i++) {
    const c = children[i];
    if (c.tagName === tagName || c.localName === tagName || c.nodeName === tagName) {
      return (c.textContent || '').trim();
    }
  }
  const el = parent.getElementsByTagName(tagName)[0];
  return el ? (el.textContent || '').trim() : '';
}

function parseXml(text) {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('XML parse error');
  }
  return doc;
}

function parseNewsFeed(xmlText, sourceName) {
  const doc = parseXml(xmlText);
  const items = [];
  const rssItems = doc.getElementsByTagName('item');
  if (rssItems.length > 0) {
    for (let i = 0; i < rssItems.length; i++) {
      const item = rssItems[i];
      const title = decodeEntities(stripHtml(getChildText(item, 'title')));
      const link = getChildText(item, 'link');
      const pubDateStr = getChildText(item, 'pubDate') || getChildText(item, 'dc:date') || getChildText(item, 'published') || getChildText(item, 'updated');
      const date = pubDateStr ? new Date(pubDateStr).toISOString() : null;

      let thumbnail = null;
      const mediaContent = item.getElementsByTagNameNS(MEDIA_NS, 'content')[0] || item.getElementsByTagNameNS(MEDIA_NS, 'thumbnail')[0];
      if (mediaContent) thumbnail = mediaContent.getAttribute('url');
      if (!thumbnail) {
        const enclosure = item.getElementsByTagName('enclosure')[0];
        if (enclosure && (enclosure.getAttribute('type') || '').startsWith('image')) {
          thumbnail = enclosure.getAttribute('url');
        }
      }
      if (!thumbnail) {
        const desc = getChildText(item, 'description') || getChildText(item, 'content:encoded');
        const m = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (m) thumbnail = m[1];
      }

      if (title && link) {
        items.push({ title, link, source: sourceName, date, thumbnail });
      }
    }
  } else {
    const entries = doc.getElementsByTagName('entry');
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const title = decodeEntities(stripHtml(getChildText(entry, 'title')));
      const linkEls = entry.getElementsByTagName('link');
      let link = '';
      for (let l = 0; l < linkEls.length; l++) {
        const rel = linkEls[l].getAttribute('rel');
        if (!rel || rel === 'alternate') {
          link = linkEls[l].getAttribute('href') || '';
          break;
        }
      }
      const pubDateStr = getChildText(entry, 'published') || getChildText(entry, 'updated');
      const date = pubDateStr ? new Date(pubDateStr).toISOString() : null;

      let thumbnail = null;
      const mediaContent = entry.getElementsByTagNameNS(MEDIA_NS, 'content')[0] || entry.getElementsByTagNameNS(MEDIA_NS, 'thumbnail')[0];
      if (mediaContent) thumbnail = mediaContent.getAttribute('url');

      if (title && link) {
        items.push({ title, link, source: sourceName, date, thumbnail });
      }
    }
  }
  return items;
}

function parseYoutubeFeed(xmlText, fallbackName) {
  const doc = parseXml(xmlText);
  const feedEl = doc.getElementsByTagName('feed')[0];
  let channelTitle = fallbackName;
  if (feedEl) {
    const feedChildren = feedEl.children;
    for (let i = 0; i < feedChildren.length; i++) {
      const c = feedChildren[i];
      if ((c.localName || c.tagName) === 'title') {
        channelTitle = (c.textContent || '').trim() || fallbackName;
        break;
      }
    }
  }
  const entries = doc.getElementsByTagName('entry');
  const items = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const title = decodeEntities(stripHtml(getChildText(entry, 'title')));
    const linkEl = entry.getElementsByTagName('link')[0];
    const link = linkEl ? (linkEl.getAttribute('href') || '') : '';
    const pubDateStr = getChildText(entry, 'published') || getChildText(entry, 'updated');
    const date = pubDateStr ? new Date(pubDateStr).toISOString() : null;

    let videoId = '';
    const videoIdEl = entry.getElementsByTagNameNS(YT_NS, 'videoId')[0];
    if (videoIdEl) videoId = (videoIdEl.textContent || '').trim();
    if (!videoId) {
      const idText = getChildText(entry, 'id');
      const m = idText.match(/^yt:video:(.+)$/);
      if (m) videoId = m[1];
    }
    if (!videoId && link) {
      const m = link.match(/[?&]v=([A-Za-z0-9_-]+)/);
      if (m) videoId = m[1];
    }

    const thumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : null;

    if (title && link) {
      items.push({ title, link, channel: channelTitle, date, thumbnail, videoId });
    }
  }
  return items;
}

function parseArxivFeed(xmlText) {
  const doc = parseXml(xmlText);
  const entries = doc.getElementsByTagName('entry');
  const items = [];
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const rawTitle = getChildText(entry, 'title');
    const title = decodeEntities(stripLatex(stripHtml(rawTitle)));

    const authorEls = entry.getElementsByTagName('author');
    const names = [];
    for (let a = 0; a < authorEls.length; a++) {
      const n = getChildText(authorEls[a], 'name');
      if (n) names.push(n);
    }
    let authors = '';
    if (names.length === 1) authors = names[0];
    else if (names.length === 2) authors = `${names[0]}, ${names[1]}`;
    else if (names.length > 2) authors = `${names[0]}, ${names[1]} et al`;

    const summary = decodeEntities(stripLatex(stripHtml(getChildText(entry, 'summary'))));
    const abstract = summary.length > 150 ? summary.slice(0, 150).trimEnd() + '…' : summary;

    let link = '';
    const linkEls = entry.getElementsByTagName('link');
    for (let l = 0; l < linkEls.length; l++) {
      const rel = linkEls[l].getAttribute('rel');
      if (!rel || rel === 'alternate') {
        link = linkEls[l].getAttribute('href') || '';
        break;
      }
    }

    const pubDateStr = getChildText(entry, 'published') || getChildText(entry, 'updated');
    const date = pubDateStr ? new Date(pubDateStr).toISOString() : null;

    if (title && link) {
      items.push({ title, authors, abstract, link, date });
    }
  }
  return items.slice(0, 15);
}

function parseHnJson(json) {
  const hits = json && Array.isArray(json.hits) ? json.hits : [];
  const items = hits
    .map(h => {
      const title = decodeEntities(stripHtml(h.title || ''));
      if (!title) return null;
      return {
        title,
        url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        hnUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
        author: h.author || 'unknown',
        points: typeof h.points === 'number' ? h.points : 0,
        comments: typeof h.num_comments === 'number' ? h.num_comments : 0,
        date: h.created_at || null
      };
    })
    .filter(Boolean);
  const withSignal = items.filter(i => i.points >= 3 || i.comments >= 3);
  const pool = withSignal.length >= 10 ? withSignal : items;
  pool.sort((a, b) => (b.points || 0) - (a.points || 0));
  return pool.slice(0, 15);
}

function parsePayload(source, payload) {
  if (!payload) throw new Error('Empty payload');
  const kind = payload.kind;

  if (source === 'news' && kind === 'multi-xml') {
    const all = [];
    for (const f of payload.payload.feeds) {
      try {
        all.push(...parseNewsFeed(f.text, f.source));
      } catch (err) {
        console.warn(`News parse failed (${f.source}):`, err);
      }
    }
    all.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
    return all.slice(0, 15);
  }

  if (source === 'youtube' && kind === 'multi-xml') {
    const all = [];
    for (const f of payload.payload.feeds) {
      try {
        all.push(...parseYoutubeFeed(f.text, f.source));
      } catch (err) {
        console.warn(`YouTube parse failed (${f.source}):`, err);
      }
    }
    all.sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
    return all.slice(0, 10);
  }

  if (source === 'hn' && kind === 'json') {
    return parseHnJson(payload.payload);
  }

  if (source === 'arxiv' && kind === 'xml') {
    return parseArxivFeed(payload.payload);
  }

  throw new Error(`Unhandled payload kind "${kind}" for source "${source}"`);
}

function createEl(tag, options) {
  const el = document.createElement(tag);
  if (!options) return el;
  if (options.className) el.className = options.className;
  if (options.text != null) el.textContent = options.text;
  if (options.href) el.href = options.href;
  if (options.src) el.src = options.src;
  if (options.alt != null) el.alt = options.alt;
  return el;
}

function safeImg(src, alt) {
  const wrap = createEl('div', { className: 'card-thumb-wrap' });
  const img = createEl('img', { className: 'card-thumb', src, alt: alt || '' });
  img.loading = 'lazy';
  img.referrerPolicy = 'no-referrer';
  img.addEventListener('error', () => wrap.remove());
  wrap.appendChild(img);
  return wrap;
}

function renderNewsCard(item, index) {
  const card = createEl('a', { className: 'card', href: item.link });
  card.style.animationDelay = `${index * 30}ms`;
  if (item.thumbnail) card.appendChild(safeImg(item.thumbnail, item.title));
  card.appendChild(createEl('div', { className: 'card-title', text: item.title }));
  const meta = createEl('div', { className: 'card-meta' });
  if (item.source) meta.appendChild(createEl('span', { text: item.source }));
  const ago = timeAgo(item.date);
  if (item.source && ago) meta.appendChild(createEl('span', { className: 'sep', text: '·' }));
  if (ago) meta.appendChild(createEl('span', { text: ago }));
  card.appendChild(meta);
  return card;
}

function renderYoutubeCard(item, index) {
  const card = createEl('a', { className: 'card', href: item.link });
  card.style.animationDelay = `${index * 30}ms`;
  if (item.thumbnail) card.appendChild(safeImg(item.thumbnail, item.title));
  card.appendChild(createEl('div', { className: 'card-title', text: item.title }));
  const meta = createEl('div', { className: 'card-meta' });
  if (item.channel) meta.appendChild(createEl('span', { text: item.channel }));
  const ago = timeAgo(item.date);
  if (item.channel && ago) meta.appendChild(createEl('span', { className: 'sep', text: '·' }));
  if (ago) meta.appendChild(createEl('span', { text: ago }));
  card.appendChild(meta);
  return card;
}

function renderHnCard(item, index) {
  const card = createEl('a', { className: 'card', href: item.url });
  card.style.animationDelay = `${index * 30}ms`;
  card.appendChild(createEl('div', { className: 'card-title', text: item.title }));
  const stats = createEl('div', { className: 'card-hn-stats' });
  stats.textContent = `▲ ${item.points} · ${item.comments} comment${item.comments === 1 ? '' : 's'}`;
  card.appendChild(stats);
  const meta = createEl('div', { className: 'card-meta' });
  if (item.author) meta.appendChild(createEl('span', { text: `by ${item.author}` }));
  const ago = timeAgo(item.date);
  if (item.author && ago) meta.appendChild(createEl('span', { className: 'sep', text: '·' }));
  if (ago) meta.appendChild(createEl('span', { text: ago }));
  card.appendChild(meta);
  return card;
}

function renderArxivCard(item, index) {
  const card = createEl('a', { className: 'card', href: item.link });
  card.style.animationDelay = `${index * 30}ms`;
  card.appendChild(createEl('div', { className: 'card-title', text: item.title }));
  if (item.authors) {
    card.appendChild(createEl('div', { className: 'card-meta', text: item.authors }));
  }
  if (item.abstract) {
    card.appendChild(createEl('div', { className: 'card-abstract', text: item.abstract }));
  }
  const dateLong = formatDateLong(item.date);
  if (dateLong) {
    const meta = createEl('div', { className: 'card-meta' });
    meta.appendChild(createEl('span', { text: dateLong }));
    card.appendChild(meta);
  }
  return card;
}

const RENDERERS = {
  news: renderNewsCard,
  youtube: renderYoutubeCard,
  hn: renderHnCard,
  arxiv: renderArxivCard
};

function setCount(source, n) {
  const el = $(`count-${source}`);
  if (el) el.textContent = n > 0 ? String(n) : '';
}

function renderColumn(source, data) {
  const container = $(`col-${source}`);
  if (!container) return;
  container.innerHTML = '';
  if (!Array.isArray(data) || data.length === 0) {
    setCount(source, 0);
    container.appendChild(createEl('div', { className: 'empty-state', text: `No items for ${SOURCE_LABELS[source]}.` }));
    return;
  }
  setCount(source, data.length);
  const frag = document.createDocumentFragment();
  const render = RENDERERS[source];
  data.forEach((item, i) => {
    try {
      const node = render(item, i);
      if (node) frag.appendChild(node);
    } catch (err) {
      console.error(`Render error for ${source}:`, err);
    }
  });
  container.appendChild(frag);
}

function renderError(source, detail) {
  const container = $(`col-${source}`);
  if (!container) return;
  container.innerHTML = '';
  setCount(source, 0);
  const btn = createEl('div', {
    className: 'error-state',
    text: `Could not load ${SOURCE_LABELS[source]}. Click to retry.`
  });
  if (detail) btn.title = detail;
  btn.addEventListener('click', () => loadSource(source, true));
  container.appendChild(btn);
}

function sendMessage(msg) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(msg, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    } catch (err) {
      reject(err);
    }
  });
}

let offlineShown = false;
function showOfflineBanner(text) {
  const banner = $('offlineBanner');
  if (!banner) return;
  banner.textContent = text;
  banner.classList.remove('hidden');
  offlineShown = true;
}
function hideOfflineBanner() {
  const banner = $('offlineBanner');
  if (!banner) return;
  banner.classList.add('hidden');
  banner.textContent = '';
  offlineShown = false;
}

async function loadSource(source, forceRefresh) {
  const container = $(`col-${source}`);
  if (container && forceRefresh) {
    container.innerHTML = '<div class="skeleton-group">' +
      '<div class="skeleton-card"></div>'.repeat(4) + '</div>';
  }
  try {
    const resp = await sendMessage({ action: 'fetchFeed', source, forceRefresh: !!forceRefresh });
    if (!resp || !resp.ok) {
      renderError(source, resp && resp.error);
      return { ok: false };
    }
    let items;
    try {
      items = parsePayload(source, resp.data);
    } catch (err) {
      console.error(`Parse error for ${source}:`, err);
      renderError(source, err.message);
      return { ok: false };
    }
    renderColumn(source, items);
    return { ok: true, stale: !!resp.stale };
  } catch (err) {
    console.error(`Failed to load ${source}:`, err);
    renderError(source, err.message);
    return { ok: false };
  }
}

async function loadAll(forceRefresh) {
  hideOfflineBanner();
  const results = await Promise.all(SOURCES.map(s => loadSource(s, forceRefresh)));
  const allFailed = results.every(r => !r.ok);
  const anyStale = results.some(r => r.ok && r.stale);
  if (allFailed) {
    showOfflineBanner('No data available. Connect to the internet and refresh.');
  } else if (anyStale || !navigator.onLine) {
    showOfflineBanner("You're offline. Showing cached data.");
  }
}

async function handleRefresh() {
  const btn = $('refreshBtn');
  if (!btn) return;
  btn.classList.add('spinning');
  btn.disabled = true;
  try {
    await sendMessage({ action: 'clearCache' });
    await loadAll(true);
  } finally {
    btn.classList.remove('spinning');
    btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setGreeting();
  $('refreshBtn').addEventListener('click', handleRefresh);
  loadAll(false);
});

window.addEventListener('online', () => {
  if (offlineShown) loadAll(true);
});
