import './style.css';
import { Header } from './components/Header.js';
import { ImageStudio } from './components/ImageStudio.js';
import { getMode, applyModeTheme, toggleMode, canSwitchMode, LOCAL_PAGES } from './lib/appMode.js';

const app = document.querySelector('#app');
let contentArea;
let headerEl;
let currentPage = 'image';

// Keep all mounted page nodes so async generation survives tab switches
let mountedPages = {};

// Router — show/hide instead of destroy
function navigate(page) {
  if (!contentArea) return;
  if (getMode() === 'local' && !LOCAL_PAGES.includes(page)) page = 'image';
  currentPage = page;

  // Hide all existing pages
  Object.values(mountedPages).forEach(node => { node.style.display = 'none'; });

  if (mountedPages[page]) {
    // Already mounted — just show it again
    mountedPages[page].style.display = '';
  } else {
    // First visit — create a wrapper and mount the studio into it
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;';
    contentArea.appendChild(wrapper);
    mountedPages[page] = wrapper;

    if (page === 'image') {
      wrapper.appendChild(ImageStudio());
    } else if (page === 'video') {
      import('./components/VideoStudio.js').then(({ VideoStudio }) => {
        wrapper.appendChild(VideoStudio());
      });
    } else if (page === 'cinema') {
      import('./components/CinemaStudio.js').then(({ CinemaStudio }) => {
        wrapper.appendChild(CinemaStudio());
      });
    } else if (page === 'lipsync') {
      import('./components/LipSyncStudio.js').then(({ LipSyncStudio }) => {
        wrapper.appendChild(LipSyncStudio());
      });
    } else if (page === 'workflows') {
      import('./components/WorkflowStudio.js').then(({ WorkflowStudio }) => {
        wrapper.appendChild(WorkflowStudio());
      });
    } else if (page === 'agents') {
      import('./components/AgentStudio.js').then(({ AgentStudio }) => {
        wrapper.appendChild(AgentStudio());
      });
    } else if (page === 'mcp-cli') {
      import('./components/McpCliStudio.js').then(({ McpCliStudio }) => {
        wrapper.appendChild(McpCliStudio());
      });
    }
  }
}

function renderHeader() {
  const next = Header(navigate, () => currentPage);
  if (headerEl) headerEl.replaceWith(next); else app.appendChild(next);
  headerEl = next;
}

applyModeTheme();
app.innerHTML = '';
renderHeader();

contentArea = document.createElement('main');
contentArea.id = 'content-area';
contentArea.className = 'flex-1 relative w-full overflow-hidden flex flex-col bg-app-bg';
app.appendChild(contentArea);

// Initial Route
navigate('image');
if (getMode() === 'local') window.localAI?.wan2gp?.warm?.().catch(() => {});

// Payoff: Online / Offline switch without reloading the app.
// Studios read the mode when they are built, so rebuild them; keep the same page if it exists in the new mode.
window.addEventListener('payoff-mode-changed', () => {
  const page = currentPage;
  Object.values(mountedPages).forEach(node => node.remove());
  mountedPages = {};
  renderHeader();
  navigate(page);
});

// Ctrl+Shift+M toggles Online / Offline.
window.addEventListener('keydown', (e) => {
  if (canSwitchMode() && e.ctrlKey && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
    e.preventDefault();
    toggleMode();
  }
});

// Event Listener for Navigation
window.addEventListener('navigate', (e) => {
  if (e.detail.page === 'settings') {
    import('./components/SettingsModal.js').then(({ SettingsModal }) => {
      document.body.appendChild(SettingsModal());
    });
  } else {
    navigate(e.detail.page);
  }
});
