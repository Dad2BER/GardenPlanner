import { initState, getGarden, subscribe } from './state.js';
import { loadData } from './services/storage.js';
import { renderGardensView } from './views/gardensView.js';
import { renderLayoutView, destroyLayoutView } from './views/layoutView.js';

// ── View state ────────────────────────────────────────────────────────────────

let _view = { page: 'gardens', gardenId: null };

export function navigate(newView) {
  // Clean up layout canvas if leaving layout page
  if (_view.page === 'layout' && newView.page !== 'layout') {
    destroyLayoutView();
  }
  _view = newView;
  render();
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

async function init() {
  const data = await loadData();
  initState(data);

  subscribe(() => {
    // Re-render on state changes (garden create/delete)
    if (_view.page !== 'layout') render();
  });

  render();
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  renderHeader();
  renderSidebar();
  renderContent();
}

function renderHeader() {
  const header = document.getElementById('app-header');
  if (!header) return;

  const garden = _view.gardenId ? getGarden(_view.gardenId) : null;

  header.innerHTML = `
    <div class="header-left">
      <button class="logo-btn" id="btn-logo">🌿 GardenPlanner</button>
      ${garden ? `
        <span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-garden">${escHtml(garden.name)}</span>
      ` : ''}
    </div>
    <nav class="header-nav">
      <button class="nav-btn ${_view.page === 'gardens' && !_view.gardenId ? 'nav-btn--active' : ''}" id="nav-gardens">
        My Gardens
      </button>
    </nav>
  `;

  document.getElementById('btn-logo')?.addEventListener('click', () => navigate({ page: 'gardens' }));
  document.getElementById('nav-gardens')?.addEventListener('click', () => navigate({ page: 'gardens' }));
}

function renderSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  if (!_view.gardenId) {
    sidebar.innerHTML = `
      <div class="sidebar-section">
        <div class="sidebar-label">Navigation</div>
        <button class="sidebar-item ${_view.page === 'gardens' ? 'sidebar-item--active' : ''}" id="sb-gardens">
          🌾 My Gardens
        </button>
      </div>
    `;
    document.getElementById('sb-gardens')?.addEventListener('click', () => navigate({ page: 'gardens' }));
    return;
  }

  // Inside a garden
  const pages = [
    { id: 'layout',   icon: '📐', label: 'Layout Designer' },
    { id: 'season',   icon: '🌱', label: 'Current Season'  },
    { id: 'history',  icon: '📅', label: 'History'          },
    { id: 'costs',    icon: '💰', label: 'Costs'            },
    { id: 'notes',    icon: '📝', label: 'Notes'            },
    { id: 'calendar', icon: '🗓', label: 'Planting Calendar'},
  ];

  sidebar.innerHTML = `
    <div class="sidebar-back">
      <button class="sidebar-back-btn" id="sb-back">‹ All Gardens</button>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-label">Garden</div>
      ${pages.map(p => `
        <button class="sidebar-item ${_view.page === p.id ? 'sidebar-item--active' : ''} ${['season','history','costs','notes','calendar'].includes(p.id) ? 'sidebar-item--soon' : ''}"
                data-page="${p.id}">
          ${p.icon} ${p.label}
          ${['season','history','costs','notes','calendar'].includes(p.id) ? '<span class="badge-soon">soon</span>' : ''}
        </button>
      `).join('')}
    </div>
  `;

  document.getElementById('sb-back')?.addEventListener('click', () => navigate({ page: 'gardens' }));

  sidebar.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (['season','history','costs','notes','calendar'].includes(page)) return; // stubs
      navigate({ page, gardenId: _view.gardenId });
    });
  });
}

function renderContent() {
  const content = document.getElementById('app-content');
  if (!content) return;

  switch (_view.page) {
    case 'gardens':
      renderGardensView(content, navigate);
      break;
    case 'layout':
      if (_view.gardenId) {
        renderLayoutView(content, _view.gardenId, navigate);
      } else {
        navigate({ page: 'gardens' });
      }
      break;
    default:
      content.innerHTML = `
        <div class="stub-page">
          <div class="stub-icon">🚧</div>
          <h2>Coming Soon</h2>
          <p>This feature is under construction.</p>
        </div>
      `;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Start ─────────────────────────────────────────────────────────────────────

init();
