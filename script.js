// ===== 全局状态 =====
let collectionsData = null;
let currentCategory = null;
let searchQuery = '';

const elements = {
    collectionsGrid: document.getElementById('collectionsGrid'),
    categoryTags: document.getElementById('categoryTags'),
    searchInput: document.getElementById('searchInput'),
    totalCount: document.getElementById('totalCount'),
    categoryCount: document.getElementById('categoryCount')
};

// ===== 初始化 =====
async function init() {
    await loadData();
    renderCategoryTags();
    renderCollections();
    updateStats();
    bindEvents();
}

async function loadData() {
    try {
        const response = await fetch('data.json?t=' + Date.now());
        if (response.ok) {
            collectionsData = await response.json();
        }
    } catch (e) { console.error(e); }
}

// ===== 渲染分类标签 (Neo-Modern Sidebar) =====
function renderCategoryTags() {
    if (!collectionsData) return;
    const categories = collectionsData.collections.map(c => ({
        name: c.category,
        icon: c.icon
    }));

    elements.categoryTags.innerHTML = `
        <button class="category-tag active" data-category="all">
            <span class="tag-icon">⚡️</span>
            <span class="tag-name">全部探索</span>
        </button>
        ${categories.map(cat => `
            <button class="category-tag" data-category="${cat.name}">
                <span class="tag-icon">${cat.icon}</span>
                <span class="tag-name">${cat.name}</span>
            </button>
        `).join('')}
    `;
}

// ===== 渲染项目卡片 =====
function renderCollections() {
    if (!collectionsData) return;
    let filteredData = [...collectionsData.collections];

    if (currentCategory) {
        filteredData = filteredData.filter(c => c.category === currentCategory);
    }

    if (searchQuery) {
        filteredData = filteredData.map(cat => ({
            ...cat,
            items: cat.items.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            )
        })).filter(cat => cat.items.length > 0);
    }

    if (filteredData.length === 0) {
        elements.collectionsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🫧</div>
                <div class="empty-state-text">未触及的领域...换个词试试？</div>
            </div>
        `;
        return;
    }

    elements.collectionsGrid.innerHTML = filteredData.map(category => `
        <div class="category-section">
            <div class="category-header">
                <h2 class="category-title">
                    ${category.category}
                    <span class="category-count">${category.items.length}</span>
                </h2>
            </div>
            <div class="category-grid">
                ${category.items.map((item, index) => renderCard(item, index)).join('')}
            </div>
        </div>
    `).join('');

    bindCardEvents();
}

// ===== 渲染单张卡片 (Tactile Design) =====
function renderCard(item, index) {
    const delay = index * 0.02;
    let iconSrc = item.icon || '';
    let isEmoji = !iconSrc.startsWith('http') && iconSrc !== '';

    if (iconSrc === '') {
        try {
            const domain = new URL(item.url).hostname;
            iconSrc = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
            isEmoji = false;
        } catch (e) {
            iconSrc = '🔖';
            isEmoji = true;
        }
    }

    const iconHtml = isEmoji
        ? `<span class="card-icon-fallback">${iconSrc}</span>`
        : `<img src="${iconSrc}" class="card-icon-img" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${item.name}'">`;

    return `
        <div class="collection-card" 
             data-url="${item.url}" 
             style="animation: cardReveal 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) ${delay}s backwards">
            <div class="card-header">
                <div class="card-icon">${iconHtml}</div>
                <div class="card-info">
                    <div class="card-title">${item.name}</div>
                    <div class="card-url">${formatUrl(item.url)}</div>
                </div>
            </div>
            <div class="card-desc">${item.desc}</div>
            <div class="card-footer">
                <div class="card-tag">${(item.tags && item.tags[0]) || 'TOOL'}</div>
                <div class="card-actions">
                    <button class="card-action-btn" data-action="copy" data-url="${item.url}" title="复制">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    </button>
                    <button class="card-action-btn" data-action="visit" title="跳转">
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function formatUrl(url) {
    return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
}

function bindCardEvents() {
    document.querySelectorAll('.collection-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-action-btn')) return;
            window.open(card.dataset.url, '_blank');
        });
    });

    document.querySelectorAll('.card-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const url = btn.dataset.url || btn.closest('.collection-card').dataset.url;
            if (action === 'copy') {
                copy(url, btn);
            } else {
                window.open(url, '_blank');
            }
        });
    });
}

function copy(text, btn) {
    navigator.clipboard.writeText(text);
    const original = btn.innerHTML;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    setTimeout(() => btn.innerHTML = original, 2000);
}

function updateStats() {
    if (!collectionsData) return;
    let total = 0;
    collectionsData.collections.forEach(c => total += c.items.length);
    elements.totalCount.textContent = total;
    elements.categoryCount.textContent = collectionsData.collections.length;
}

function bindEvents() {
    elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderCollections();
    });

    elements.categoryTags.addEventListener('click', (e) => {
        const tag = e.target.closest('.category-tag');
        if (!tag) return;
        document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
        currentCategory = tag.dataset.category === 'all' ? null : tag.dataset.category;
        renderCollections();
    });

    document.addEventListener('keydown', (e) => {
        if ((e.key === '/' || (e.metaKey && e.key === 'k')) && document.activeElement !== elements.searchInput) {
            e.preventDefault();
            elements.searchInput.focus();
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
