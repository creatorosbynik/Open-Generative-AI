const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../packages/studio/src/payoffPolicy.js');
const loadModels = () => import('../packages/studio/src/models.js');

test('Payoff policy: unrestricted and Midjourney routes are blocked', async () => {
    const { classifyModel } = await load();
    assert.equal(classifyModel({ id: 'seedance-2.5-spicy-text-to-video', name: 'Seedance 2.5 Spicy' }).tier, 'blocked');
    assert.equal(classifyModel({ id: 'midjourney-v7', name: 'Midjourney v7' }).tier, 'blocked');
    assert.equal(classifyModel('wan2gp:flux-dev').tier, 'blocked');
});

test('Payoff policy: reviewed models are cleared for finals, the rest are previz', async () => {
    const { classifyModel } = await load();
    const veo = classifyModel('veo3.1-text-to-video');
    assert.equal(veo.tier, 'final');
    assert.equal(veo.maker, 'Google');
    assert.equal(veo.dataLeavesDevice, true);
    assert.equal(classifyModel('gpt-image-2').tier, 'final');
    const wan = classifyModel('local:wan2gp:wan21-t2v-14b');
    assert.equal(wan.tier, 'final');
    assert.equal(wan.license, 'Apache-2.0');
    assert.equal(wan.dataLeavesDevice, false);
    assert.equal(classifyModel('wan2gp:ltx25-distilled-nvfp4').tier, 'final');
    assert.equal(classifyModel('kling-v3-text-to-video').tier, 'previz');
    assert.equal(classifyModel('wan2.7-text-to-video').tier, 'previz', 'cloud Wan is not the Apache-2.0 open weights');
    assert.equal(classifyModel('dreamshaper-8').tier, 'previz');
});

test('Payoff policy: the shipped model lists hold no blocked route and every model is tagged', async () => {
    const m = await loadModels();
    const lists = ['t2iModels', 'i2iModels', 't2vModels', 'i2vModels', 'v2vModels', 'lipsyncModels', 'audioModels', 'recastModels', 'motionControlModels'];
    for (const name of lists) {
        for (const model of m[name]) {
            assert.doesNotMatch(`${model.id} ${model.name}`, /spicy|midjourney|niji|nsfw/i, `${name}: ${model.id}`);
            if (!Object.isFrozen(model)) assert.ok(['final', 'previz'].includes(model.payoffTier), `${name}: ${model.id} untagged`);
        }
    }
    const grok = m.t2vModels.find((x) => x.inputs && JSON.stringify(x.inputs).includes('"normal","fun"'));
    if (grok) assert.doesNotMatch(JSON.stringify(grok.inputs), /spicy/);
});
