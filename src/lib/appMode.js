// Payoff Studio: Online (cloud) / Offline (local) mode, owned by the Electron main process.
// The browser (web) build has no local engines, so it is always 'cloud'.
// Switching is instant: no reload. Listeners get a `payoff-mode-changed` event.

export const MODE_COPY = {
    cloud: { label: 'Online', long: 'Online · Cloud models (uses credits)', toast: 'Online mode · MuAPI cloud models' },
    local: { label: 'Offline', long: 'Offline · On-device models (free, private)', toast: 'Offline mode · on-device models, nothing leaves this PC' },
};

let cached = null;

export function getMode() {
    if (cached) return cached;
    try {
        const m = typeof window !== 'undefined' && window.payoffMode?.get();
        cached = m === 'local' ? 'local' : 'cloud';
    } catch (_) {
        cached = 'cloud';
    }
    return cached;
}

export const isLocalMode = () => getMode() === 'local';
export const canSwitchMode = () => typeof window !== 'undefined' && !!window.payoffMode;

export function applyModeTheme(mode = getMode()) {
    if (typeof document !== 'undefined') document.documentElement.dataset.mode = mode;
}

export function showToast(text) {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.pf-toast').forEach(n => n.remove());
    const el = document.createElement('div');
    el.className = 'pf-toast';
    el.innerHTML = `<span class="pf-mode-dot" style="color:rgb(var(--accent))"></span><span></span>`;
    el.lastChild.textContent = text;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
}

export async function setMode(mode) {
    if (!canSwitchMode() || mode === getMode()) return getMode();
    const busy = [...document.querySelectorAll('#content-area button[disabled] .animate-spin')].some(el => el.offsetParent !== null);
    if (busy && !window.confirm('A generation is still running. Switch anyway? Its result will not be shown here.')) {
        return getMode();
    }
    await window.payoffMode.set(mode);
    cached = mode;
    applyModeTheme(mode);
    window.dispatchEvent(new CustomEvent('payoff-mode-changed', { detail: { mode } }));
    showToast(MODE_COPY[mode].toast);
    // Offline: start the warm engine in the background so the first generation is quick.
    if (mode === 'local') window.localAI?.wan2gp?.warm?.().catch(() => {});
    return mode;
}

export const toggleMode = () => setMode(getMode() === 'local' ? 'cloud' : 'local');

// Studios that work without the internet. Everything else is cloud-only.
export const LOCAL_PAGES = ['image', 'video'];
