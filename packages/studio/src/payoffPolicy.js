// Payoff Studio model policy: the single place that decides which models a
// Payoff project may use, and for what.
//
//   blocked  removed from the app entirely
//   final    cleared for client deliverables (terms reviewed, see `basis`)
//   previz   usable for previz, storyboards and internal tests only; its
//            commercial terms have not been reviewed yet
//
// Rules run top to bottom; the first match wins. Every generated asset records
// the rule that applied (see the provenance record in electron/lib/payoffProjects.js),
// so the day a model's terms change we can still prove what applied when it was made.
//
// Reviewed 21 Oct 2026. Sources are listed on the Notion page
// PAYOFF → Payoff Studio (Open Generative AI). Reset POLICY_VERSION on every change.

export const POLICY_VERSION = '2026-10-21';

const MUAPI_ROUTE = 'Cloud route via MuAPI: MuAPI terms (2 Jul 2025, s.6) leave Inputs and Outputs with us; the model maker\'s own terms also apply (s.7). MuAPI has no confidentiality clause, so never send unreleased products or confidential files.';

export const POLICY_RULES = Object.freeze([
    // ── Blocked ──────────────────────────────────────────────────────────
    {
        tier: 'blocked',
        match: /spicy|nsfw|uncensor/i,
        reason: 'Unrestricted content route. Not allowed anywhere in Payoff Studio.',
    },
    {
        tier: 'blocked',
        match: /midjourney|niji/i,
        reason: 'Midjourney has no official API and its terms prohibit automated access, so reseller routes cannot carry a rights chain.',
    },
    {
        tier: 'blocked',
        match: /^wan2gp:flux-dev$/i,
        reason: 'FLUX.1 [dev] weights are licensed for non-commercial use only (licence s.2(b)); running them for paid work breaks the licence.',
    },

    // ── Cleared for client finals: cloud ─────────────────────────────────
    {
        tier: 'final',
        match: /^(gpt|openai)/i,
        maker: 'OpenAI',
        license: 'OpenAI Terms of Use',
        basis: `OpenAI assigns all its rights in Output to the user. ${MUAPI_ROUTE}`,
        dataLeavesDevice: true,
    },
    {
        tier: 'final',
        match: /^(veo|gemini|google|nano-banana|imagen|lyria)/i,
        maker: 'Google',
        license: 'Gemini API Additional Terms (paid services)',
        basis: `Google claims no ownership of generated content and does not use paid-service prompts or responses to improve its products. ${MUAPI_ROUTE}`,
        dataLeavesDevice: true,
    },

    // ── Cleared for client finals: local, on this PC ──────────────────────
    {
        tier: 'final',
        match: /^(wan2gp:)?z-image/i,
        maker: 'Tongyi-MAI',
        license: 'Apache-2.0',
        basis: 'Open weights under Apache-2.0; runs on this PC, nothing leaves the device.',
        dataLeavesDevice: false,
    },
    {
        tier: 'final',
        match: /^wan2gp:(wan21|wan22)/i,
        maker: 'Wan-AI (Alibaba)',
        license: 'Apache-2.0',
        basis: 'Wan 2.1 / 2.2 open weights under Apache-2.0; runs on this PC, nothing leaves the device.',
        dataLeavesDevice: false,
    },
    {
        tier: 'final',
        match: /^wan2gp:qwen-image/i,
        maker: 'Qwen (Alibaba)',
        license: 'Apache-2.0',
        basis: 'Qwen-Image open weights under Apache-2.0; runs on this PC, nothing leaves the device.',
        dataLeavesDevice: false,
    },
    {
        tier: 'final',
        match: /^wan2gp:(ltx2|ltx-video)/i,
        maker: 'Lightricks',
        license: 'LTX-2.x Community License',
        basis: 'Free for entities under USD 10M annual revenue (s.2.1); Lightricks claims no rights in Output (s.5). Re-check if Payoff crosses the threshold. Runs on this PC.',
        dataLeavesDevice: false,
    },
    {
        tier: 'final',
        match: /^stable-diffusion-xl-base$/i,
        maker: 'Stability AI',
        license: 'CreativeML Open RAIL++-M',
        basis: 'SDXL base weights permit commercial use under Open RAIL++-M; runs on this PC.',
        dataLeavesDevice: false,
    },
]);

const DEFAULT_PREVIZ = Object.freeze({
    tier: 'previz',
    reason: 'Commercial terms not reviewed yet. Use for previz, storyboards and internal tests only.',
});

function isLocalId(id) {
    return /^(wan2gp:|z-image|stable-diffusion|dreamshaper|realistic-vision|anything-v)/i.test(id || '');
}

/** Classify one model. Accepts a model object or a bare id. */
export function classifyModel(modelOrId) {
    const id = typeof modelOrId === 'string' ? modelOrId : (modelOrId?.id || '');
    const name = typeof modelOrId === 'string' ? '' : (modelOrId?.name || '');
    const endpoint = typeof modelOrId === 'string' ? '' : (modelOrId?.endpoint || '');
    const haystackId = id.replace(/^local:/i, '');

    for (const rule of POLICY_RULES) {
        const hit = rule.match.test(haystackId)
            || (rule.tier === 'blocked' && (rule.match.test(name) || rule.match.test(endpoint)));
        if (hit) {
            return {
                tier: rule.tier,
                reason: rule.reason || null,
                maker: rule.maker || null,
                license: rule.license || null,
                basis: rule.basis || null,
                dataLeavesDevice: rule.dataLeavesDevice ?? !isLocalId(haystackId),
                policyVersion: POLICY_VERSION,
            };
        }
    }
    return {
        ...DEFAULT_PREVIZ,
        maker: null,
        license: null,
        basis: null,
        dataLeavesDevice: !isLocalId(haystackId),
        policyVersion: POLICY_VERSION,
    };
}

export const isBlocked = (modelOrId) => classifyModel(modelOrId).tier === 'blocked';

export const PREVIZ_SUFFIX = ' · previz only';

/**
 * Apply the policy to a model list in place: blocked models are removed, and
 * every remaining model is tagged with `payoffTier`. Previz models get a
 * visible suffix on their name so every picker shows the tier without UI changes.
 * In place, because other modules hold references to these exported arrays.
 */
export function applyPolicyInPlace(list) {
    if (!Array.isArray(list)) return list;
    for (let i = list.length - 1; i >= 0; i--) {
        const model = list[i];
        const c = classifyModel(model);
        if (c.tier === 'blocked') {
            list.splice(i, 1);
            continue;
        }
        if (Object.isFrozen(model)) continue;
        model.payoffTier = c.tier;
        if (c.tier === 'previz' && typeof model.name === 'string' && !model.name.endsWith(PREVIZ_SUFFIX)) {
            model.payoffOriginalName = model.name;
            model.name = `${model.name}${PREVIZ_SUFFIX}`;
        }
    }
    return list;
}
