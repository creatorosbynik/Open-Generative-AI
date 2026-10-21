// Payoff Studio: client projects on disk + a provenance record for every asset.
//
// Every generation is filed as
//   <root>/<Client>/<Project>/ai-assets/<timestamp>_<studio>_<model>_<tier>.<ext>
// next to a sidecar <file>.provenance.json, and one line is appended to
//   <root>/<Client>/<Project>/ai-assets/_provenance.jsonl
// so a project's full rights trail can be handed over with the delivery.
//
// The pure helpers (no electron import) are exported for node:test.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { fileURLToPath } = require('url');

const SCHEMA = 'payoff.provenance/1';
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB per asset
const MEDIA_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm', 'mov', 'mp3', 'wav', 'm4a', 'ogg', 'flac']);
const MIME_EXT = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
    'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/flac': 'flac',
};

// India's 2026 synthetic-content rules and ASCI guidance expect AI content to be
// labelled; the Payoff Visual Bible's legal chapter sets the wording we use.
const DISCLOSURE_LABEL = 'Made with AI';

/** A client or project name that is safe as one folder name. */
function cleanName(name) {
    const s = String(name ?? '')
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/(^|\s)\.\.(?=\s|$)/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[.\s]+/, '')
        .replace(/[.\s]+$/, '')
        .slice(0, 60);
    if (!s || s === '.' || s === '..') return '';
    if (/^(con|prn|aux|nul|com\d|lpt\d)$/i.test(s)) return `${s}_`;
    return s;
}

function slug(s, max = 40) {
    return String(s ?? '').toLowerCase().replace(/^local:/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max) || 'model';
}

function stamp(date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

function extFromUrl(url) {
    try {
        const m = /\.([a-z0-9]{2,5})$/i.exec(new URL(url).pathname);
        const e = m ? m[1].toLowerCase() : '';
        return MEDIA_EXT.has(e) ? (e === 'jpeg' ? 'jpg' : e) : '';
    } catch (_) {
        return '';
    }
}

function projectDir(cfg) {
    const client = cleanName(cfg?.client);
    const project = cleanName(cfg?.project);
    if (!cfg?.root || !client || !project) return null;
    return path.join(cfg.root, client, project);
}

/** Build the provenance record. `info` comes from the renderer; mode from the main process. */
function buildRecord({ fileName, sha256, bytes, cfg, mode, info, now }) {
    const c = info?.clearance || {};
    const tier = c.tier || 'previz';
    return {
        schema: SCHEMA,
        asset: fileName,
        sha256,
        bytes,
        createdAt: (now || new Date()).toISOString(),
        client: cleanName(cfg.client),
        project: cleanName(cfg.project),
        studio: info?.studio || 'unknown',
        mode,
        model: {
            id: info?.modelId || null,
            name: info?.modelName || null,
            maker: c.maker || null,
            license: c.license || null,
        },
        clearance: {
            tier,
            clientDeliverable: tier === 'final',
            basis: c.basis || c.reason || null,
            policyVersion: c.policyVersion || null,
        },
        dataLeftDevice: typeof c.dataLeavesDevice === 'boolean' ? c.dataLeavesDevice : mode !== 'local',
        generation: {
            prompt: info?.prompt ?? null,
            negativePrompt: info?.negativePrompt ?? null,
            seed: info?.seed ?? null,
            aspectRatio: info?.aspectRatio ?? null,
            duration: info?.duration ?? null,
            references: Array.isArray(info?.references) ? info.references.slice(0, 20) : [],
            sourceUrl: typeof info?.url === 'string' && !info.url.startsWith('data:') ? info.url : null,
            requestId: info?.requestId ?? null,
        },
        disclosure: { required: true, label: DISCLOSURE_LABEL },
        app: { name: 'Payoff Studio', version: info?.appVersion || null },
    };
}

function sha256File(file) {
    return new Promise((resolve, reject) => {
        const h = crypto.createHash('sha256');
        fs.createReadStream(file).on('data', (d) => h.update(d)).on('error', reject).on('end', () => resolve(h.digest('hex')));
    });
}

function download(url, dest, redirects = 0) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return reject(new Error(`Unsupported URL scheme: ${u.protocol}`));
        const mod = u.protocol === 'https:' ? https : http;
        const req = mod.get(u, { headers: { 'User-Agent': 'payoff-studio' } }, (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                res.resume();
                if (redirects >= 5) return reject(new Error('Too many redirects'));
                return resolve(download(new URL(res.headers.location, u).href, dest, redirects + 1));
            }
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
            }
            const type = String(res.headers['content-type'] || '').split(';')[0].trim();
            let seen = 0;
            const out = fs.createWriteStream(dest);
            res.on('data', (chunk) => {
                seen += chunk.length;
                if (seen > MAX_BYTES) {
                    req.destroy(new Error('Asset is larger than 2 GB'));
                }
            });
            res.pipe(out);
            out.on('finish', () => resolve({ contentType: type }));
            out.on('error', reject);
            res.on('error', reject);
        });
        req.on('error', (err) => {
            fs.rm(dest, { force: true }, () => reject(err));
        });
        req.setTimeout(120000, () => req.destroy(new Error('Download timed out')));
    });
}

/**
 * Copy or download one generated asset into the active project and write its
 * provenance record. Returns { skipped } when no project is set.
 */
async function recordAsset({ cfg, mode, info, now = new Date() }) {
    const dir = projectDir(cfg);
    if (!dir) return { skipped: 'no-project' };
    const url = String(info?.url || '');
    if (!url) throw new Error('No asset URL to record');

    const assetsDir = path.join(dir, 'ai-assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    const tier = info?.clearance?.tier === 'final' ? 'final' : 'previz';
    const base = `${stamp(now)}_${slug(info?.studio, 12)}_${slug(info?.modelId)}_${tier}`;
    const tmp = path.join(assetsDir, `.${base}.part`);

    let ext = '';
    try {
        if (url.startsWith('data:')) {
            const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url);
            if (!m) throw new Error('Malformed data URL');
            ext = MIME_EXT[m[1]] || 'png';
            const buf = m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]));
            if (buf.length > MAX_BYTES) throw new Error('Asset is larger than 2 GB');
            fs.writeFileSync(tmp, buf);
        } else if (url.startsWith('file:')) {
            const src = fileURLToPath(url);
            ext = path.extname(src).slice(1).toLowerCase();
            if (!MEDIA_EXT.has(ext)) throw new Error(`Not a media file: ${path.basename(src)}`);
            if (fs.statSync(src).size > MAX_BYTES) throw new Error('Asset is larger than 2 GB');
            fs.copyFileSync(src, tmp);
            if (ext === 'jpeg') ext = 'jpg';
        } else {
            const { contentType } = await download(url, tmp);
            ext = extFromUrl(url) || MIME_EXT[contentType] || 'bin';
        }

        let fileName = `${base}.${ext}`;
        for (let n = 2; fs.existsSync(path.join(assetsDir, fileName)); n++) fileName = `${base}-${n}.${ext}`;
        const file = path.join(assetsDir, fileName);
        fs.renameSync(tmp, file);

        const bytes = fs.statSync(file).size;
        const sha256 = await sha256File(file);
        const record = buildRecord({ fileName, sha256, bytes, cfg, mode, info, now });
        const sidecar = `${file}.provenance.json`;
        fs.writeFileSync(sidecar, JSON.stringify(record, null, 2));
        fs.appendFileSync(path.join(assetsDir, '_provenance.jsonl'), `${JSON.stringify(record)}\n`);
        return { path: file, sidecar, record };
    } catch (err) {
        fs.rmSync(tmp, { force: true });
        throw err;
    }
}

function listDirs(dir) {
    try {
        return fs.readdirSync(dir, { withFileTypes: true })
            .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('_'))
            .map((d) => d.name)
            .sort((a, b) => a.localeCompare(b));
    } catch (_) {
        return [];
    }
}

// ── Electron wiring ─────────────────────────────────────────────────────────

function register({ getMode }) {
    const { app, ipcMain, dialog, shell, BrowserWindow } = require('electron');
    const configFile = () => path.join(app.getPath('userData'), 'payoff-projects.json');

    const defaultRoot = () => {
        // H:\Payoff is the Payoff hub on Nikunj's PC; fall back to Documents elsewhere.
        if (process.platform === 'win32' && fs.existsSync('H:\\Payoff')) return 'H:\\Payoff\\Clients';
        return path.join(app.getPath('documents'), 'Payoff Studio', 'Clients');
    };

    const read = () => {
        let cfg = {};
        try { cfg = JSON.parse(fs.readFileSync(configFile(), 'utf8')); } catch (_) { /* first run */ }
        return { root: cfg.root || defaultRoot(), client: cleanName(cfg.client), project: cleanName(cfg.project) };
    };

    const write = (cfg) => {
        fs.mkdirSync(path.dirname(configFile()), { recursive: true });
        fs.writeFileSync(configFile(), JSON.stringify(cfg, null, 2));
    };

    const state = () => {
        const cfg = read();
        return {
            ...cfg,
            dir: projectDir(cfg),
            clients: listDirs(cfg.root),
            projects: cfg.client ? listDirs(path.join(cfg.root, cfg.client)) : [],
        };
    };

    ipcMain.handle('payoff-projects:get', () => state());

    ipcMain.handle('payoff-projects:list-projects', (_, client) => {
        const name = cleanName(client);
        return name ? listDirs(path.join(read().root, name)) : [];
    });

    ipcMain.handle('payoff-projects:set', (_, next) => {
        const cur = read();
        const cfg = {
            root: typeof next?.root === 'string' && path.isAbsolute(next.root) ? next.root : cur.root,
            client: cleanName(next?.client),
            project: cleanName(next?.project),
        };
        const dir = projectDir(cfg);
        if (dir) fs.mkdirSync(path.join(dir, 'ai-assets'), { recursive: true });
        write(cfg);
        return state();
    });

    ipcMain.handle('payoff-projects:pick-root', async (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        const res = await dialog.showOpenDialog(win, {
            title: 'Where should Payoff Studio file client work?',
            properties: ['openDirectory', 'createDirectory'],
            defaultPath: read().root,
        });
        if (res.canceled || !res.filePaths[0]) return null;
        return res.filePaths[0];
    });

    ipcMain.handle('payoff-projects:open', () => {
        const s = state();
        const target = s.dir ? path.join(s.dir, 'ai-assets') : s.root;
        fs.mkdirSync(target, { recursive: true });
        return shell.openPath(target);
    });

    ipcMain.handle('payoff-projects:record', (_, info) => recordAsset({
        cfg: read(),
        mode: getMode(),
        info: { ...info, appVersion: app.getVersion() },
    }));
}

module.exports = { register, recordAsset, buildRecord, cleanName, projectDir, SCHEMA, DISCLOSURE_LABEL };
