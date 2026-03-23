import { getGardens, addGarden, deleteGarden } from '../state.js';

export function renderGardensView(container, navigate) {
  container.innerHTML = '';

  const gardens = getGardens();

  // Header row
  const header = document.createElement('div');
  header.className = 'page-header';
  header.innerHTML = `
    <div>
      <h1 class="page-title">My Gardens</h1>
      <p class="page-subtitle">${gardens.length} garden${gardens.length !== 1 ? 's' : ''}</p>
    </div>
    <button class="btn btn-primary" id="btn-new-garden">+ New Garden</button>
  `;
  container.appendChild(header);

  // Create form (hidden by default)
  const formWrap = document.createElement('div');
  formWrap.className = 'create-form-wrap hidden';
  formWrap.id = 'create-form-wrap';
  formWrap.innerHTML = `
    <div class="create-form">
      <h2 class="create-form-title">Create New Garden</h2>
      <div class="form-group">
        <label class="form-label">Garden Name *</label>
        <input class="form-input" id="new-garden-name" type="text" placeholder="e.g. Backyard Veggie Garden" maxlength="60" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input class="form-input" id="new-garden-desc" type="text" placeholder="Optional notes about this garden" maxlength="120" />
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="btn-cancel-create">Cancel</button>
        <button class="btn btn-primary" id="btn-confirm-create">Create Garden</button>
      </div>
    </div>
  `;
  container.appendChild(formWrap);

  // Garden grid
  if (gardens.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-icon">🌱</div>
      <h2 class="empty-title">No gardens yet</h2>
      <p class="empty-desc">Create your first garden to start planning your beds and tracking what you grow.</p>
      <button class="btn btn-primary" id="btn-new-garden-empty">+ Create Garden</button>
    `;
    container.appendChild(empty);
  } else {
    const grid = document.createElement('div');
    grid.className = 'garden-grid';
    gardens.forEach(g => {
      const bedCount = g.layout?.beds?.length ?? 0;
      const card = document.createElement('div');
      card.className = 'garden-card';
      card.innerHTML = `
        <div class="garden-card-icon">🌿</div>
        <div class="garden-card-body">
          <h3 class="garden-card-name">${escHtml(g.name)}</h3>
          ${g.description ? `<p class="garden-card-desc">${escHtml(g.description)}</p>` : ''}
          <p class="garden-card-meta">
            ${bedCount} bed${bedCount !== 1 ? 's' : ''} &nbsp;·&nbsp;
            Created ${formatDate(g.createdAt)}
          </p>
        </div>
        <div class="garden-card-actions">
          <button class="btn btn-sm btn-primary btn-open" data-id="${g.id}">Open</button>
          <button class="btn btn-sm btn-danger btn-delete" data-id="${g.id}" title="Delete garden">✕</button>
        </div>
      `;
      grid.appendChild(card);
    });
    container.appendChild(grid);
  }

  // ── Events ──────────────────────────────────────────────────────────────────

  function showForm() {
    formWrap.classList.remove('hidden');
    document.getElementById('new-garden-name')?.focus();
  }

  document.getElementById('btn-new-garden')?.addEventListener('click', showForm);
  document.getElementById('btn-new-garden-empty')?.addEventListener('click', showForm);

  document.getElementById('btn-cancel-create')?.addEventListener('click', () => {
    formWrap.classList.add('hidden');
  });

  document.getElementById('btn-confirm-create')?.addEventListener('click', () => {
    const name = document.getElementById('new-garden-name')?.value.trim();
    if (!name) {
      document.getElementById('new-garden-name')?.focus();
      return;
    }
    const desc = document.getElementById('new-garden-desc')?.value.trim();
    const garden = addGarden(name, desc);
    navigate({ page: 'layout', gardenId: garden.id });
  });

  // Enter key in form
  formWrap.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-confirm-create')?.click();
  });

  // Open / Delete buttons
  container.addEventListener('click', e => {
    const openBtn = e.target.closest('.btn-open');
    if (openBtn) {
      navigate({ page: 'layout', gardenId: openBtn.dataset.id });
      return;
    }
    const delBtn = e.target.closest('.btn-delete');
    if (delBtn) {
      const id = delBtn.dataset.id;
      const g  = getGardens().find(g => g.id === id);
      if (g && confirm(`Delete "${g.name}"? This cannot be undone.`)) {
        deleteGarden(id);
        // re-render (navigate triggers it via subscribe in app.js)
        navigate({ page: 'gardens' });
      }
    }
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
