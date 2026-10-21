// Payoff "Looks": one-click style references for the prompt.
// Picking a look appends a short, tested style description to your prompt when you
// generate. Your text stays untouched in the box, so you can switch looks freely.

export const PAYOFF_LOOKS = [
    { id: 'none', label: 'No look', hint: 'Use your prompt exactly as written.', suffix: '' },
    { id: 'cinematic', label: 'Cinematic', hint: 'Film still: anamorphic lens, motivated light, shallow depth, fine grain.',
      suffix: 'cinematic film still, anamorphic lens, motivated practical lighting, shallow depth of field, subtle film grain, rich contrast' },
    { id: 'editorial', label: 'Editorial', hint: 'Magazine campaign: clean composition, controlled light, refined grade.',
      suffix: 'editorial magazine campaign photograph, clean intentional composition, controlled studio light, refined colour grade, crisp detail' },
    { id: 'product', label: 'Product hero', hint: 'Packshot: seamless backdrop, soft key + rim light, crisp reflections.',
      suffix: 'premium product hero shot, seamless backdrop, soft key light with clean rim light, crisp controlled reflections, commercial packshot, accurate label and colours' },
    { id: 'food', label: 'Food commercial', hint: 'Appetite appeal: texture, steam, warm directional light, macro detail.',
      suffix: 'premium food commercial photography, appetizing texture, gentle steam and gloss, warm directional light, macro detail, shallow depth of field' },
    { id: 'documentary', label: 'Documentary', hint: 'Real moment: available light, candid framing, authentic texture.',
      suffix: 'documentary photograph, natural available light, candid unposed moment, authentic textures, 35mm lens, honest colour' },
    { id: 'ugc', label: 'UGC phone', hint: 'Native social: handheld phone, casual framing, natural indoor light.',
      suffix: 'shot on a smartphone, casual handheld framing, natural indoor light, authentic UGC creator look, vertical social video feel' },
    { id: 'luxury', label: 'Luxury', hint: 'Quiet luxury: deep shadows, rich highlights, minimal composition.',
      suffix: 'luxury campaign aesthetic, deep velvety shadows, rich specular highlights, elegant minimal composition, premium materials' },
    { id: 'desi', label: 'Desi warmth', hint: 'Indian everyday warmth: golden light, real homes and streets, natural skin.',
      suffix: 'warm Indian everyday setting, golden hour light, real lived-in spaces, natural skin texture, vibrant but true-to-life colour' },
];

export function applyLook(prompt, lookId) {
    const look = PAYOFF_LOOKS.find(l => l.id === lookId);
    if (!prompt || !look || !look.suffix) return prompt;
    return `${prompt.replace(/[.\s]+$/, '')}. ${look.suffix}.`;
}

// A row of look chips. Returns { el, get }.
export function createLookRow({ storageKey = 'payoff_look' } = {}) {
    let current = 'none';
    try { current = localStorage.getItem(storageKey) || 'none'; } catch (_) { /* optional */ }

    const el = document.createElement('div');
    el.className = 'flex items-center gap-2 px-2 pt-3 overflow-x-auto no-scrollbar';
    const label = document.createElement('span');
    label.className = 'text-[11px] font-semibold text-white/40 shrink-0 mr-1';
    label.textContent = 'Look';
    el.appendChild(label);

    const chips = PAYOFF_LOOKS.map((look) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pf-chip shrink-0';
        b.textContent = look.label;
        b.title = look.hint;
        b.dataset.look = look.id;
        b.onclick = (e) => {
            e.stopPropagation();
            current = look.id;
            try { localStorage.setItem(storageKey, current); } catch (_) { /* optional */ }
            paint();
        };
        el.appendChild(b);
        return b;
    });
    const paint = () => chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.look === current)));
    paint();

    return { el, get: () => current };
}
