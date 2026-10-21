// Payoff: cost chip for Online (MuAPI) generations.
// Prices come from MuAPI's public pricing endpoints via the Electron main process.
// Fixed-price models show the exact per-call price; dynamic ones are estimated
// from the current settings (duration, resolution…).

let allPrices = null;
let allPromise = null;

export const pricingAvailable = () => typeof window !== 'undefined' && !!window.payoffPricing;

export function formatUsd(n) {
    if (n === null || n === undefined || !Number.isFinite(n)) return null;
    if (n === 0) return '$0';
    if (n < 0.01) return `$${n.toFixed(4).replace(/0+$/, '')}`;
    if (n < 1) return `$${n.toFixed(3).replace(/0$/, '')}`;
    return `$${n.toFixed(2)}`;
}

const norm = (v) => (v || '').toString().trim().replace(/^\/+/, '').replace(/^api\/v1\//, '').toLowerCase();

// Load the whole price list once (for hints in model dropdowns).
export function loadAllPrices() {
    if (!pricingAvailable()) return Promise.resolve({});
    if (allPrices) return Promise.resolve(allPrices);
    if (!allPromise) {
        allPromise = window.payoffPricing.all()
            .then((p) => { allPrices = p || {}; return allPrices; })
            .catch(() => { allPrices = {}; return allPrices; })
            .finally(() => { allPromise = null; });
    }
    return allPromise;
}

// Synchronous hint for a dropdown row, e.g. "$0.03" or "from $0.40". '' when unknown.
export function priceHint(endpoint) {
    const p = allPrices?.[norm(endpoint)];
    if (!p || p.usd === null || p.usd === undefined) return '';
    const f = formatUsd(p.usd);
    return p.dynamic ? `from ${f}` : f;
}

// Creates the chip element shown next to Generate.
export function createCostChip() {
    const chip = document.createElement('span');
    chip.className = 'pf-cost';
    chip.dataset.state = 'unknown';
    chip.textContent = '…';
    return chip;
}

export function setChipFree(chip, text = 'Free · runs on your GPU') {
    chip.dataset.state = 'free';
    chip.textContent = text;
    chip.title = 'Offline models run on this PC. No credits are used.';
}

// Keeps `chip` in sync with the current model + settings.
// getState() → { local: boolean, endpoint: string, body: object, count?: number }
export function bindCostChip(chip, getState) {
    let lastSig = '';
    let seq = 0;

    const refresh = async () => {
        if (!chip.isConnected) return;
        const state = getState();
        if (state.local) {
            if (lastSig !== 'local') { lastSig = 'local'; setChipFree(chip); }
            return;
        }
        const sig = JSON.stringify([state.endpoint, state.body, state.count || 1]);
        if (sig === lastSig) return;
        lastSig = sig;
        if (!pricingAvailable()) { chip.style.display = 'none'; return; }
        const mine = ++seq;
        chip.dataset.state = 'unknown';
        chip.textContent = 'Checking price…';
        try {
            const p = await window.payoffPricing.price(state.endpoint, state.body);
            if (mine !== seq) return;
            const each = p?.usd;
            const label = formatUsd(each !== null && each !== undefined ? each * (state.count || 1) : null);
            if (!label) {
                chip.dataset.state = 'unknown';
                chip.textContent = 'Price n/a';
                chip.title = 'MuAPI did not return a price for this model. Check muapi.ai before running.';
                return;
            }
            chip.dataset.state = 'paid';
            chip.textContent = `${p.exact ? '' : '≈ '}${label}${(state.count || 1) > 1 ? ` · ${state.count}×` : ''}`;
            chip.title = p.exact
                ? 'MuAPI price per generation for this model.'
                : 'MuAPI estimate for these settings. The final charge appears in your MuAPI dashboard.';
        } catch (_) {
            if (mine !== seq) return;
            chip.dataset.state = 'unknown';
            chip.textContent = 'Price n/a';
        }
    };

    refresh();
    const timer = setInterval(() => {
        if (!chip.isConnected) { clearInterval(timer); return; }
        refresh();
    }, 800);
    return refresh;
}
