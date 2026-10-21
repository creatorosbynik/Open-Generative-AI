import { SettingsModal } from './SettingsModal.js';
import { ProjectPicker } from './ProjectPicker.js';
import { t, getLang, setLang } from '../lib/i18n.js';
import { getMode, setMode, canSwitchMode, LOCAL_PAGES } from '../lib/appMode.js';

export function Header(navigate) {
    const header = document.createElement('header');
    header.className = 'w-full flex flex-col z-50 sticky top-0';
    const mode = getMode();
    const isLocal = mode === 'local';

    // Payoff: a coloured strip so it's always obvious which world you're in.
    const modeStrip = document.createElement('div');
    modeStrip.className = isLocal
        ? 'w-full py-1 text-center text-[11px] font-black tracking-widest bg-emerald-500 text-black'
        : 'w-full py-1 text-center text-[11px] font-black tracking-widest bg-sky-500 text-black';
    modeStrip.textContent = isLocal
        ? 'LOCAL MODE · OFFLINE · ON-DEVICE MODELS ONLY · NOTHING LEAVES THIS PC'
        : 'CLOUD MODE · MUAPI MODELS · USES CREDITS';
    if (canSwitchMode()) header.appendChild(modeStrip);


    // 2. Main Navigation Bar
    const navBar = document.createElement('div');
    navBar.className = 'w-full h-16 bg-black flex items-center justify-between px-4 md:px-6 border-b border-white/5 backdrop-blur-md bg-opacity-95';

    const leftPart = document.createElement('div');
    leftPart.className = 'flex items-center gap-8';

    // Logo
    const logoContainer = document.createElement('div');
    logoContainer.className = 'cursor-pointer hover:scale-110 transition-transform';
    logoContainer.title = 'Payoff Studio';
    logoContainer.innerHTML = `
        <div class="flex items-center gap-2">
            <img src="./payoff-logo-white.png" alt="Payoff" class="h-5 w-auto select-none" draggable="false" />
            <span class="text-[10px] font-black tracking-[0.25em] text-primary/80 uppercase">Studio</span>
        </div>
    `;

    const menu = document.createElement('nav');
    menu.className = 'hidden lg:flex items-center gap-6 text-[13px] font-bold text-secondary';
    const items = [
        { label: t('nav.image'),   page: 'image' },
        { label: t('nav.video'),   page: 'video' },
        { label: t('nav.lipsync'), page: 'lipsync' },
        { label: t('nav.cinema'),  page: 'cinema' },
        { label: t('nav.workflows'), page: 'workflows' },
        { label: t('nav.agents'),  page: 'agents' },
        { label: t('nav.mcpcli'),  page: 'mcp-cli' },
    ];

    const visibleItems = isLocal ? items.filter(i => LOCAL_PAGES.includes(i.page)) : items;
    visibleItems.forEach(({ label, page }, idx) => {
        const link = document.createElement('a');
        link.textContent = label;
        link.className = `hover:text-white transition-all cursor-pointer relative group ${idx === 0 ? 'text-white' : ''}`;

        if (idx === 0) {
            const dot = document.createElement('div');
            dot.className = 'absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full';
            link.appendChild(dot);
        }

        link.onclick = () => {
            Array.from(menu.children).forEach(child => child.classList.remove('text-white'));
            link.classList.add('text-white');
            navigate(page);
        };

        menu.appendChild(link);
    });

    leftPart.appendChild(logoContainer);
    leftPart.appendChild(menu);

    const rightPart = document.createElement('div');
    rightPart.className = 'flex items-center gap-4';

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-[13px] font-bold text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors';
    settingsBtn.title = t('web.settingsTitle');
    settingsBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span>${t('nav.settings')}</span>
    `;
    settingsBtn.onclick = () => {
        document.body.appendChild(SettingsModal());
    };

    // Language toggle button
    const langBtn = document.createElement('button');
    const currentLang = getLang();
    langBtn.className = 'flex items-center px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-[13px] font-bold text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-colors';
    langBtn.title = currentLang === 'zh-CN' ? t('web.switchToEn') : t('web.switchToZh');
    langBtn.textContent = currentLang === 'zh-CN' ? 'EN' : '中文';
    langBtn.onclick = () => setLang(currentLang === 'zh-CN' ? 'en' : 'zh-CN');

    // Payoff: active client project (desktop app only). Outputs are filed there.
    const projectPill = ProjectPicker();
    if (projectPill) rightPart.appendChild(projectPill);

    // Payoff: Cloud / Local switch (desktop app only). Switching reloads the app
    // so the two model worlds never mix.
    if (canSwitchMode()) {
        const switchWrap = document.createElement('div');
        switchWrap.className = 'flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-[12px] font-black';
        const makeOpt = (value, label, activeCls) => {
            const b = document.createElement('button');
            b.textContent = label;
            b.title = value === 'local' ? 'On-device models only. Works offline.' : 'MuAPI cloud models. Needs your API key.';
            b.className = mode === value
                ? `px-3 py-1 rounded-md ${activeCls} text-black`
                : 'px-3 py-1 rounded-md text-white/50 hover:text-white';
            b.onclick = () => { if (mode !== value) setMode(value); };
            return b;
        };
        switchWrap.appendChild(makeOpt('cloud', '☁ Cloud', 'bg-sky-500'));
        switchWrap.appendChild(makeOpt('local', '⚡ Local', 'bg-emerald-500'));
        rightPart.appendChild(switchWrap);
    }

    rightPart.appendChild(langBtn);
    rightPart.appendChild(settingsBtn);

    navBar.appendChild(leftPart);
    navBar.appendChild(rightPart);

    header.appendChild(navBar);

    return header;
}
