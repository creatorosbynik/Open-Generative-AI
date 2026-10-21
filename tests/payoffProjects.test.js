const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const { recordAsset, cleanName, projectDir } = require('../electron/lib/payoffProjects');

const PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function tmpRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'payoff-projects-'));
}

test('cleanName keeps folder names safe', () => {
    assert.equal(cleanName('  Chicco / Bravo: Film?  '), 'Chicco Bravo Film');
    assert.equal(cleanName('..'), '');
    assert.equal(cleanName('../../etc'), 'etc');
    assert.equal(cleanName('CON'), 'CON_');
    assert.equal(projectDir({ root: '/r', client: 'A', project: '' }), null);
});

test('recordAsset skips when no project is set', async () => {
    const res = await recordAsset({ cfg: { root: tmpRoot(), client: '', project: '' }, mode: 'cloud', info: { url: 'data:image/png;base64,' + PNG_1PX } });
    assert.deepEqual(res, { skipped: 'no-project' });
});

test('recordAsset files a local image with a provenance sidecar and log line', async () => {
    const root = tmpRoot();
    const now = new Date(2026, 9, 21, 18, 5, 9);
    const res = await recordAsset({
        cfg: { root, client: 'Payoff', project: 'Monsooner spec' },
        mode: 'local',
        now,
        info: {
            studio: 'image',
            url: 'data:image/png;base64,' + PNG_1PX,
            modelId: 'wan2gp:z-image-turbo',
            modelName: 'Z-Image Turbo (Wan2GP)',
            clearance: { tier: 'final', maker: 'Tongyi-MAI', license: 'Apache-2.0', basis: 'Apache-2.0', dataLeavesDevice: false, policyVersion: '2026-10-21' },
            prompt: 'monsoon-aged coffee beans, low key',
            seed: 42,
            aspectRatio: '4:5',
        },
    });
    assert.ok(res.path.endsWith('20261021-180509_image_wan2gp-z-image-turbo_final.png'));
    assert.ok(fs.existsSync(res.path));
    const rec = JSON.parse(fs.readFileSync(res.sidecar, 'utf8'));
    assert.equal(rec.schema, 'payoff.provenance/1');
    assert.equal(rec.client, 'Payoff');
    assert.equal(rec.clearance.clientDeliverable, true);
    assert.equal(rec.model.license, 'Apache-2.0');
    assert.equal(rec.dataLeftDevice, false);
    assert.equal(rec.generation.seed, 42);
    assert.equal(rec.generation.sourceUrl, null, 'data URLs are not stored as a source');
    assert.equal(rec.disclosure.required, true);
    assert.match(rec.sha256, /^[0-9a-f]{64}$/);
    const log = fs.readFileSync(path.join(root, 'Payoff', 'Monsooner spec', 'ai-assets', '_provenance.jsonl'), 'utf8').trim().split('\n');
    assert.equal(log.length, 1);
});

test('recordAsset copies a Wan2GP output file and marks previz', async () => {
    const root = tmpRoot();
    const src = path.join(root, 'clip.mp4');
    fs.writeFileSync(src, Buffer.from('fake mp4'));
    const res = await recordAsset({
        cfg: { root, client: 'Client', project: 'Film' },
        mode: 'local',
        info: { studio: 'video', url: pathToFileURL(src).href, modelId: 'wan2gp:hunyuan-video', clearance: { tier: 'previz' } },
    });
    assert.ok(res.path.endsWith('_previz.mp4'));
    assert.equal(res.record.clearance.clientDeliverable, false);
});

test('recordAsset refuses to copy non-media files', async () => {
    const root = tmpRoot();
    const src = path.join(root, 'secrets.txt');
    fs.writeFileSync(src, 'x');
    await assert.rejects(recordAsset({ cfg: { root, client: 'C', project: 'P' }, mode: 'local', info: { url: pathToFileURL(src).href } }), /Not a media file/);
});
