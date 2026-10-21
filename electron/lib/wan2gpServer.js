// Payoff: keep Wan2GP warm.
// Running `wgp.py --process` for every generation starts Python, imports torch and
// reloads the model each time (a minute or more before the first step). Instead we
// start WanGP's own MCP server once, bound to 127.0.0.1, and send every generation to
// it. WanGP keeps one warm session, so the model stays loaded between generations.
const { createMcpClient } = require('./wan2gpMcp');
const local = require('./wan2gpLocal');

const HOST = '127.0.0.1';
const PORT = 7866;
const URL_ = `http://${HOST}:${PORT}/mcp`;
const START_TIMEOUT_MS = 6 * 60 * 1000; // first start imports torch + plugins
const POLL_MS = 1500;

let server = null; // { key, child, ready: Promise<string>, log: string[] }

function keyFor(install) {
    return `${install.dir}|${install.python}`;
}

function isAlive(s) {
    return s && s.child && s.child.exitCode === null && s.child.signalCode === null;
}

async function probeOnce() {
    try {
        await createMcpClient(URL_).probe();
        return true;
    } catch {
        return false;
    }
}

// Returns the MCP URL of a running, warm Wan2GP server for this install.
// onStatus(message) reports start-up progress to the UI.
async function ensureServer(install, onStatus = () => {}) {
    const key = keyFor(install);
    if (server && server.key === key) {
        if (server.child && isAlive(server)) return server.ready;
        if (!server.child && await probeOnce()) return URL_;
    }
    if (server) stopServer();

    // A server started by an earlier app session (or by hand) may already be listening.
    if (await probeOnce()) {
        server = { key, child: null, ready: Promise.resolve(URL_), log: [] };
        return URL_;
    }

    const child = local.spawnWgp(install, [
        '--mcp', '--mcp-api-version', '1',
        '--mcp-transport', 'streamable-http',
        '--mcp-host', HOST, '--mcp-port', String(PORT),
    ]);
    const log = [];
    const keep = (d) => { log.push(d.toString()); if (log.length > 200) log.shift(); };
    child.stdout?.on('data', keep);
    child.stderr?.on('data', keep);

    const s = { key, child, log, ready: null };
    s.ready = new Promise((resolve, reject) => {
        const started = Date.now();
        let done = false;
        child.once('exit', (code) => {
            if (server === s) server = null;
            if (!done) {
                done = true;
                reject(new Error(`Wan2GP engine stopped (exit ${code}). ${log.join('').slice(-600)}`));
            }
        });
        const tick = async () => {
            if (done) return;
            if (await probeOnce()) {
                done = true;
                resolve(URL_);
                return;
            }
            if (Date.now() - started > START_TIMEOUT_MS) {
                done = true;
                local.killTree(child);
                reject(new Error('Wan2GP engine did not start within 6 minutes.'));
                return;
            }
            onStatus('Warming up the offline engine (first run only)…');
            setTimeout(tick, POLL_MS);
        };
        setTimeout(tick, POLL_MS);
    });
    // Don't leave an unhandled rejection if nobody is awaiting.
    s.ready.catch(() => {});
    server = s;
    return s.ready;
}

function stopServer() {
    if (server?.child) local.killTree(server.child);
    server = null;
}

function serverState() {
    if (!server) return 'stopped';
    if (server.child && !isAlive(server)) return 'stopped';
    return 'running';
}

module.exports = { ensureServer, stopServer, serverState, SERVER_URL: URL_ };
