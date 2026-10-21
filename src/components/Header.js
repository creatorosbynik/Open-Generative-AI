import { SettingsModal } from './SettingsModal.js';
import { t, getLang, setLang } from '../lib/i18n.js';
import { getMode, setMode, canSwitchMode, LOCAL_PAGES, MODE_COPY } from '../lib/appMode.js';

// Payoff Studio header: wordmark, studio tabs, Online / Offline switch.
export function Header(navigate, getCurrentPage = () => 'image') {
    const header = document.createElement('header');
    header.className = 'w-full flex flex-col z-50 sticky top-0';
    const mode = getMode();
    const isLocal = mode === 'local';

    // Slim mode strip: always tells you which world you are in.
    if (canSwitchMode()) {
        const strip = document.createElement('div');
        strip.className = 'w-full h-7 flex items-center justify-center gap-2 text-[11px] font-semibold tracking-wide';
        strip.style.cssText = 'background: linear-gradient(90deg, rgb(var(--accent) / 0.0), rgb(var(--accent) / 0.22), rgb(var(--accent) / 0.0)); color: rgb(var(--accent)); border-bottom: 1px solid rgb(var(--accent) / 0.25);';
        strip.innerHTML = `<span class="pf-mode-dot"></span><span>${isLocal
            ? 'OFFLINE · On-device models · Free · Nothing leaves this PC'
            : 'ONLINE · MuAPI cloud models · Uses credits'}</span>`;
        header.appendChild(strip);
    }

    const navBar = document.createElement('div');
    navBar.className = 'w-full h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/[0.06]';
    navBar.style.cssText = 'background: rgb(6 6 8 / 0.92); backdrop-filter: blur(16px);';

    const leftPart = document.createElement('div');
    leftPart.className = 'flex items-center gap-6';

    // Wordmark
    const logo = document.createElement('div');
    logo.className = 'flex items-center gap-2.5 select-none';
    logo.innerHTML = `
        <div class="w-8 h-8 rounded-[10px] flex items-center justify-center" style="background: rgb(var(--accent)); box-shadow: 0 0 18px rgb(var(--accent) / 0.35);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 4h8.5a5.5 5.5 0 0 1 0 11H9v5H5V4Z" fill="#05080a"/><circle cx="13.5" cy="9.5" r="2" fill="rgb(var(--accent))"/></svg>
        </div>
        <div class="leading-none">
            <div class="text-[14px] font-extrabold tracking-tight text-white">Payoff Studio</div>
            <div class="text-[10px] font-semibold mt-0.5" style="color: rgb(var(--accent));">${MODE_COPY[mode].label}</div>
        </div>`;

    const menu = document.createElement('nav');
    menu.className = 'hidden lg:flex items-center gap-1 text-[13px] font-semibold';
    const items = [
        { label: t('nav.image'),     page: 'image' },
        { label: t('nav.video'),     page: 'video' },
        { label: t('nav.lipsync'),   page: 'lipsync' },
        { label: t('nav.cinema'),    page: 'cinema' },
        { label: t('nav.workflows'), page: 'workflows' },
        { label: t('nav.agents'),    page: 'agents' },
        { label: t('nav.mcpcli'),    page: 'mcp-cli' },
    ];
    const visibleItems = isLocal ? items.filter(i => LOCAL_PAGES.includes(i.page)) : items;
    const current = getCurrentPage();

    const paint = (activePage) => {
        Array.from(menu.children).forEach(link => {
            const active = link.dataset.page === activePage;
            link.className = active
                ? 'px-3 h-9 inline-flex items-center rounded-lg text-white bg-white/[0.07] cursor-pointer'
                : 'px-3 h-9 inline-flex items-center rounded-lg text-white/55 hover:text-white hover:bg-white/[0.04] cursor-pointer';
            link.style.boxShadow = active ? 'inset 0 -2px 0 rgb(var(--accent))' : '';
        });
    };

    visibleItems.forEach(({ label, page }) => {
        const link = document.createElement('a');
        link.textContent = label;
        link.dataset.page = page;
        link.onclick = () => { paint(page); navigate(page); };
        menu.appendChild(link);
    });
    paint(visibleItems.some(i => i.page === current) ? current : visibleItems[0]?.page);

    leftPart.appendChild(logo);
    leftPart.appendChild(menu);

    const rightPart = document.createElement('div');
    rightPart.className = 'flex items-center gap-3';

    // Online / Offline switch (desktop app only). Instant: no reload.
    if (canSwitchMode()) {
        const wrap = document.createElement('div');
        wrap.className = 'flex items-center gap-2';
        const sw = document.createElement('div');
        sw.className = 'pf-mode-switch';
        sw.setAttribute('role', 'group');
        sw.setAttribute('aria-label', 'Generation mode');
        const opt = (value, label, title) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.title = `${title} (Ctrl+Shift+M to toggle)`;
            b.setAttribute('aria-pressed', String(mode === value));
            b.innerHTML = `<span class="pf-mode-dot"></span>${label}`;
            b.onclick = () => setMode(value);
            return b;
        };
        sw.appendChild(opt('cloud', 'Online', MODE_COPY.cloud.long));
        sw.appendChild(opt('local', 'Offline', MODE_COPY.local.long));
        wrap.appendChild(sw);
        const hint = document.createElement('span');
        hint.className = 'hidden xl:inline text-[11px] text-white/35 font-medium';
        hint.textContent = 'Ctrl+Shift+M';
        wrap.appendChild(hint);
        rightPart.appendChild(wrap);
    }

    const iconBtn = 'h-9 px-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] text-[12.5px] font-semibold text-white/75 hover:text-white hover:bg-white/[0.08]';

    const langBtn = document.createElement('button');
    const currentLang = getLang();
    langBtn.className = iconBtn;
    langBtn.title = currentLang === 'zh-CN' ? t('web.switchToEn') : t('web.switchToZh');
    langBtn.textContent = currentLang === 'zh-CN' ? 'EN' : '中文';
    langBtn.onclick = () => setLang(currentLang === 'zh-CN' ? 'en' : 'zh-CN');

    const settingsBtn = document.createElement('button');
    settingsBtn.className = iconBtn;
    settingsBtn.title = t('web.settingsTitle');
    settingsBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        <span>${t('nav.settings')}</span>`;
    settingsBtn.onclick = () => document.body.appendChild(SettingsModal());

    rightPart.appendChild(langBtn);
    rightPart.appendChild(settingsBtn);

    navBar.appendChild(leftPart);
    navBar.appendChild(rightPart);
    header.appendChild(navBar);
    return header;
}
