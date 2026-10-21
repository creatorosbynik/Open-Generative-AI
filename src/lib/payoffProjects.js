// Payoff Studio: file every finished generation into the active client project
// with a provenance record (desktop app only; the web build has no disk access).
import { classifyModel } from 'studio/src/payoffPolicy.js';
import { t2iModels, i2iModels, t2vModels, i2vModels, v2vModels, lipsyncModels, audioModels } from './models.js';
import { getLocalModelById } from './localModels.js';

export const hasProjects = () => typeof window !== 'undefined' && !!window.payoffProjects;

const CLOUD_LISTS = [t2iModels, i2iModels, t2vModels, i2vModels, v2vModels, lipsyncModels, audioModels];

function findModel(id) {
    if (!id) return null;
    const localId = String(id).replace(/^local:/, '');
    const local = getLocalModelById(localId);
    if (local) return local;
    for (const list of CLOUD_LISTS) {
        const m = list.find((x) => x.id === id);
        if (m) return m;
    }
    return null;
}

const listeners = new Set();
/** Called with { ok, result | error } after every record attempt. */
export function onRecorded(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

/**
 * Record one finished generation. Never throws: filing must not break generation.
 * @param {string} studio  'image' | 'video' | 'cinema' | 'lipsync'
 * @param {object} entry   the studio's history entry ({ id, url, prompt, model, ... })
 * @param {object} extra   optional { references, negativePrompt }
 */
export async function recordAsset(studio, entry, extra = {}) {
    if (!hasProjects() || !entry?.url) return null;
    const model = findModel(entry.model);
    const modelId = String(entry.model || '').replace(/^local:/, '');
    const clearance = classifyModel(model || modelId);
    const info = {
        studio,
        url: entry.url,
        modelId,
        modelName: model?.payoffOriginalName || model?.name || modelId,
        clearance,
        prompt: entry.prompt ?? null,
        negativePrompt: extra.negativePrompt ?? entry.negative_prompt ?? null,
        seed: entry.seed ?? null,
        aspectRatio: entry.aspect_ratio ?? null,
        duration: entry.duration ?? null,
        references: extra.references ?? entry.references ?? [],
        requestId: entry.id ?? null,
    };
    try {
        const result = await window.payoffProjects.record(info);
        listeners.forEach((fn) => fn({ ok: true, result }));
        return result;
    } catch (error) {
        console.warn('[payoff-projects] could not file asset:', error);
        listeners.forEach((fn) => fn({ ok: false, error }));
        return null;
    }
}
