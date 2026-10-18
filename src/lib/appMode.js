// Payoff Studio: Cloud / Local mode, owned by the Electron main process.
// The browser (web) build has no local engines, so it is always 'cloud'.
export function getMode() {
    try {
        const m = typeof window !== 'undefined' && window.payoffMode?.get();
        return m === 'local' ? 'local' : 'cloud';
    } catch (_) {
        return 'cloud';
    }
}

export const isLocalMode = () => getMode() === 'local';
export const canSwitchMode = () => typeof window !== 'undefined' && !!window.payoffMode;

export function setMode(mode) {
    if (!canSwitchMode()) return Promise.resolve('cloud');
    return window.payoffMode.set(mode);
}

// Studios that work without the internet. Everything else is cloud-only.
export const LOCAL_PAGES = ['image', 'video'];
