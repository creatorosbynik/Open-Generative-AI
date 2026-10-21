// Payoff: MuAPI price lookup for the Online mode cost chip.
// Runs in the main process (no CORS, no API key needed: MuAPI's pricing endpoints are public).
//   GET  https://api.muapi.ai/api/v1/models                      → { models: [{ cost, dynamic_pricing, endpoint, estimate_endpoint, … }] }
//   POST https://api.muapi.ai/api/v1/models/{model}/estimate-cost → { cost, currency, … }  (same body as the generation call)
const { ipcMain, app } = require('electron');
const fs = require('fs');
const path = require('path');

const BASE = 'https://api.muapi.ai';
const LIST_TTL_MS = 60 * 60 * 1000;
const EST_TTL_MS = 10 * 60 * 1000;

let list = null;       // { at, index: Map<key, entry>, currency }
let listPromise = null;
const estimates = new Map(); // key → { at, value }

function cacheFile() {
    return path.join(app.getPath('userData'), 'muapi-prices.json');
}

// "flux-dev-image", "/api/v1/flux-dev-image", "https://api.muapi.ai/api/v1/flux-dev-image" → "flux-dev-image"
function normKey(v) {
    if (!v || typeof v !== 'string') return null;
    let s = v.trim();
    try { if (/^https?:/i.test(s)) s = new URL(s).pathname; } catch (_) { /* keep */ }
    s = s.replace(/^\/+/, '').replace(/^api\/v1\//, '').replace(/\/+$/, '');
    return s.toLowerCase() || null;
}

function toNumber(v) {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return Number.isFinite(n) ? n : null;
}

function buildIndex(payload) {
    const models = Array.isArray(payload?.models) ? payload.models : Array.isArray(payload) ? payload : [];
    const index = new Map();
    for (const m of models) {
        const entry = {
            name: m.name,
            cost: toNumber(m.cost),
            currency: m.cost_currency || payload?.currency || 'USD',
            dynamic: !!m.dynamic_pricing,
            strategy: m.cost_strategy || null,
            estimate: m.estimate_endpoint || null,
        };
        for (const k of [m.endpoint_url, m.endpoint, m.name, m.id]) {
            const key = normKey(k);
            if (key && !index.has(key)) index.set(key, entry);
        }
    }
    return { at: Date.now(), index, currency: payload?.currency || 'USD', count: models.length };
}

async function loadList() {
    if (list && Date.now() - list.at < LIST_TTL_MS) return list;
    if (listPromise) return listPromise;
    listPromise = (async () => {
        try {
            const res = await fetch(`${BASE}/api/v1/models`, { signal: AbortSignal.timeout(15000) });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const payload = await res.json();
            list = buildIndex(payload);
            try { fs.writeFileSync(cacheFile(), JSON.stringify(payload)); } catch (_) { /* cache is optional */ }
        } catch (err) {
            console.warn('[pricing] live price list unavailable:', err.message);
            if (!list) {
                try { list = buildIndex(JSON.parse(fs.readFileSync(cacheFile(), 'utf8'))); list.stale = true; }
                catch (_) { list = { at: 0, index: new Map(), currency: 'USD', count: 0 }; }
            }
        } finally {
            listPromise = null;
        }
        return list;
    })();
    return listPromise;
}

function estimateUrl(entry, key) {
    const e = entry?.estimate;
    if (e) return /^https?:/i.test(e) ? e : `${BASE}/${e.replace(/^\/+/, '')}`;
    return `${BASE}/api/v1/models/${encodeURIComponent(entry?.name || key)}/estimate-cost`;
}

// → { usd: number|null, currency, exact: boolean, source: 'fixed'|'estimate'|'unknown' }
async function priceFor(endpoint, body = {}) {
    const key = normKey(endpoint);
    const { index } = await loadList();
    const entry = key ? index.get(key) : null;
    if (!entry) return { usd: null, currency: 'USD', exact: false, source: 'unknown' };
    if (!entry.dynamic && entry.cost !== null) {
        return { usd: entry.cost, currency: entry.currency, exact: true, source: 'fixed' };
    }
    const cacheKey = `${key}|${JSON.stringify(body)}`;
    const hit = estimates.get(cacheKey);
    if (hit && Date.now() - hit.at < EST_TTL_MS) return hit.value;
    try {
        const res = await fetch(estimateUrl(entry, key), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body || {}),
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const usd = toNumber(data.cost ?? data.estimated_cost ?? data.amount_usd);
        const value = { usd, currency: data.currency || entry.currency, exact: false, source: 'estimate' };
        estimates.set(cacheKey, { at: Date.now(), value });
        return value;
    } catch (err) {
        // Fall back to the list's base price, flagged as approximate.
        return { usd: entry.cost, currency: entry.currency, exact: false, source: entry.cost !== null ? 'base' : 'unknown' };
    }
}

async function peekAll() {
    const { index } = await loadList();
    const out = {};
    for (const [k, v] of index) out[k] = { usd: v.cost, dynamic: v.dynamic };
    return out;
}

function register() {
    ipcMain.handle('pricing:price', (_, endpoint, body) => priceFor(endpoint, body));
    ipcMain.handle('pricing:all', () => peekAll());
}

module.exports = { register, priceFor, normKey, buildIndex };
