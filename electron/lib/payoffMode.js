// Payoff Studio: one app, two strictly separate modes.
//   cloud — MuAPI models only (needs an API key, uses the internet)
//   local — on-device models only (sd.cpp + Wan2GP); the app window is cut
//           off from the internet so nothing (prompts, uploads, outputs) leaves this PC.
// Switching is instant (no window reload).
// Model downloads and the local engines run in the main process / child
// processes, so they are not affected by the renderer block.
const { app, ipcMain, session } = require('electron');
const fs = require('fs');
const path = require('path');

const MODES = ['cloud', 'local'];
let mode = 'cloud';

function modeFile() {
    return path.join(app.getPath('userData'), 'payoff-mode.json');
}

function load() {
    try {
        const saved = JSON.parse(fs.readFileSync(modeFile(), 'utf8')).mode;
        if (MODES.includes(saved)) mode = saved;
    } catch (_) { /* first run: cloud */ }
    return mode;
}

function save(next) {
    mode = next;
    try {
        fs.mkdirSync(path.dirname(modeFile()), { recursive: true });
        fs.writeFileSync(modeFile(), JSON.stringify({ mode }));
    } catch (err) {
        console.error('[payoff-mode] could not save mode:', err);
    }
}

function isLoopback(url) {
    try {
        const { hostname } = new URL(url);
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
    } catch (_) {
        return false;
    }
}

function installNetworkGuard() {
    const filter = { urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] };
    session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
        if (mode === 'local' && !isLoopback(details.url)) {
            console.log(`[payoff-mode] offline: blocked ${details.url}`);
            callback({ cancel: true });
            return;
        }
        callback({});
    });
}

function register() {
    load();
    installNetworkGuard();
    ipcMain.on('payoff-mode:get', (event) => { event.returnValue = mode; });
    ipcMain.handle('payoff-mode:set', (event, next) => {
        if (!MODES.includes(next)) throw new Error(`Unknown mode: ${next}`);
        save(next);
        // Payoff: no reload. The renderer swaps the studios in place; the network
        // guard reads `mode` on every request, so it takes effect immediately.
        return mode;
    });
}

module.exports = { register, getMode: () => mode };
