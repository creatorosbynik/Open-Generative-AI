// Payoff Studio: the "Client / Project" pill in the top bar and its dialog.
// Every generation is filed into the active project with a provenance record.
import { hasProjects, onRecorded } from '../lib/payoffProjects.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function ProjectPicker() {
    if (!hasProjects()) return null;

    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'flex items-center gap-2 rounded-lg border px-3 py-1 text-[12px] font-bold transition-colors max-w-[280px]';

    const paint = (s) => {
        const set = !!(s?.client && s?.project);
        pill.className = `flex items-center gap-2 rounded-lg border px-3 py-1 text-[12px] font-bold transition-colors max-w-[280px] ${
            set ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20' : 'border-amber-400/50 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20'}`;
        pill.innerHTML = set
            ? `<span aria-hidden="true">▣</span><span class="truncate">${esc(s.client)} / ${esc(s.project)}</span>`
            : '<span aria-hidden="true">!</span><span class="truncate">No project: outputs not filed</span>';
        pill.title = set
            ? `Filing to ${s.dir}\\ai-assets with a provenance record per asset`
            : 'Pick a client and project so every output is filed with its rights record';
    };

    const refresh = () => window.payoffProjects.get().then(paint).catch(() => paint(null));
    refresh();

    onRecorded(({ ok, result }) => {
        if (!ok || !result?.path) return;
        const old = pill.innerHTML;
        pill.innerHTML = '<span aria-hidden="true">✓</span><span class="truncate">Filed with provenance</span>';
        setTimeout(() => { pill.innerHTML = old; }, 1800);
    });

    pill.onclick = () => openDialog(refresh);
    return pill;
}

async function openDialog(onDone) {
    const state = await window.payoffProjects.get();
    let root = state.root;

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm';
    overlay.innerHTML = `
        <div class="w-[460px] max-w-[92vw] rounded-2xl border border-white/10 bg-panel-bg p-6 text-white shadow-3xl">
            <h2 class="text-lg font-black">Client project</h2>
            <p class="mt-1 text-[12px] text-secondary">Every image and video you make is saved here with a provenance record: model, licence, prompt, seed and whether it is cleared for client delivery.</p>
            <label class="mt-5 block text-[11px] font-bold uppercase tracking-widest text-secondary">Client</label>
            <input data-f="client" list="pp-clients" maxlength="60" class="mt-1 w-full rounded-lg border border-white/10 bg-card-bg px-3 py-2 text-sm outline-none focus:border-primary" placeholder="e.g. Payoff (house)" />
            <datalist id="pp-clients">${state.clients.map((c) => `<option value="${esc(c)}"></option>`).join('')}</datalist>
            <label class="mt-4 block text-[11px] font-bold uppercase tracking-widest text-secondary">Project</label>
            <input data-f="project" list="pp-projects" maxlength="60" class="mt-1 w-full rounded-lg border border-white/10 bg-card-bg px-3 py-2 text-sm outline-none focus:border-primary" placeholder="e.g. Monsooner spec film" />
            <datalist id="pp-projects"></datalist>
            <div class="mt-4 flex items-center gap-2 text-[12px]">
                <span class="text-secondary">Saved under</span>
                <span data-f="root" class="flex-1 truncate font-mono text-white/80"></span>
                <button data-a="root" type="button" class="rounded-md border border-white/10 px-2 py-1 hover:border-white/30">Change</button>
            </div>
            <div class="mt-6 flex items-center justify-between gap-2">
                <div class="flex gap-2">
                    <button data-a="open" type="button" class="rounded-lg border border-white/10 px-3 py-2 text-sm hover:border-white/30">Open folder</button>
                    <button data-a="clear" type="button" class="rounded-lg px-3 py-2 text-sm text-secondary hover:text-white">Stop filing</button>
                </div>
                <div class="flex gap-2">
                    <button data-a="cancel" type="button" class="rounded-lg px-3 py-2 text-sm text-secondary hover:text-white">Cancel</button>
                    <button data-a="save" type="button" class="rounded-lg bg-primary px-4 py-2 text-sm font-black text-black hover:bg-primary-hover">Save</button>
                </div>
            </div>
            <p data-f="err" class="mt-3 hidden text-[12px] text-red-400"></p>
        </div>`;

    const $ = (sel) => overlay.querySelector(sel);
    const client = $('[data-f="client"]');
    const project = $('[data-f="project"]');
    const rootEl = $('[data-f="root"]');
    const err = $('[data-f="err"]');
    client.value = state.client || '';
    project.value = state.project || '';
    rootEl.textContent = root;

    const fillProjects = async () => {
        const list = await window.payoffProjects.listProjects(client.value);
        $('#pp-projects').innerHTML = list.map((p) => `<option value="${esc(p)}"></option>`).join('');
    };
    client.addEventListener('change', fillProjects);
    fillProjects();

    const close = () => { overlay.remove(); onDone?.(); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    $('[data-a="cancel"]').onclick = close;
    $('[data-a="open"]').onclick = () => window.payoffProjects.open();
    $('[data-a="root"]').onclick = async () => {
        const picked = await window.payoffProjects.pickRoot();
        if (picked) { root = picked; rootEl.textContent = root; }
    };
    $('[data-a="clear"]').onclick = async () => {
        await window.payoffProjects.set({ root, client: '', project: '' });
        close();
    };
    $('[data-a="save"]').onclick = async () => {
        if (!client.value.trim() || !project.value.trim()) {
            err.textContent = 'Name both the client and the project.';
            err.classList.remove('hidden');
            return;
        }
        try {
            await window.payoffProjects.set({ root, client: client.value, project: project.value });
            close();
        } catch (e) {
            err.textContent = `Could not create the folder: ${e.message}`;
            err.classList.remove('hidden');
        }
    };

    document.body.appendChild(overlay);
    client.focus();
}
