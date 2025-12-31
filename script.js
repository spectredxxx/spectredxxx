// ===== 全局状态 =====
let collectionsData = null;
let currentCategory = null;
let searchQuery = '';

// ===== DOM 元素 =====
const elements = {
    collectionsGrid: document.getElementById('collectionsGrid'),
    categoryTags: document.getElementById('categoryTags'),
    searchInput: document.getElementById('searchInput'),
    totalCount: document.getElementById('totalCount'),
    categoryCount: document.getElementById('categoryCount')
};

// ===== 初始化 =====
async function init() {
    // 加载数据
    await loadData();

    // 添加 grouped 类到主容器
    elements.collectionsGrid.classList.add('grouped');

    // 渲染界面
    renderCategoryTags();
    renderCollections();

    // 更新统计
    updateStats();

    // 绑定事件
    bindEvents();

    // 添加玻璃效果类
    document.querySelectorAll('.main-content, .collection-card').forEach(el => {
        el.classList.add('glass');
    });
}

// ===== 加载数据 =====
async function loadData() {
    // 从 data.json 加载数据
    try {
        const response = await fetch('data.json?t=' + Date.now());
        if (response.ok) {
            collectionsData = await response.json();
            console.log('已加载 data.json，分类数:', collectionsData.collections.length);
            collectionsData.collections.forEach(c => {
                console.log('  -', c.category, ':', c.items.length, '个');
            });
        } else {
            throw new Error('HTTP ' + response.status);
        }
    } catch (error) {
        console.error('加载 data.json 失败:', error.message);
        console.error('请确保通过 HTTP 服务器访问，而不是 file:// 协议');
        console.error('运行: python3 -m http.server 8000');
        alert('无法加载数据文件，请确保通过 HTTP 服务器访问页面');
        return;
    }

    // 从 localStorage 加载访问记录
}

// ===== 渲染分类标签 =====
function renderCategoryTags() {
    const categories = collectionsData.collections.map(c => ({
        name: c.category,
        icon: c.icon,
        count: c.items.length
    }));

    elements.categoryTags.innerHTML = `
        <button class="category-tag active" data-category="all">
            全部
        </button>
        ${categories.map(cat => `
            <button class="category-tag" data-category="${cat.name}">
                ${cat.icon} ${cat.name} <span style="opacity: 0.6">${cat.count}</span>
            </button>
        `).join('')}
    `;
}

// ===== 渲染项目卡片 =====
function renderCollections() {
    let filteredData = [...collectionsData.collections];

    // 分类过滤
    if (currentCategory) {
        filteredData = filteredData.filter(c => c.category === currentCategory);
    }

    // 搜索过滤
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

    // 空状态
    if (filteredData.length === 0 || filteredData.every(c => c.items.length === 0)) {
        elements.collectionsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-text">没有找到匹配的项目</div>
            </div>
        `;
        return;
    }

    // 渲染卡片
    elements.collectionsGrid.innerHTML = filteredData.map(category => `
        <div class="category-section">
            <div class="category-header">
                <h2 class="category-title">
                    <span class="category-icon">${category.icon}</span>
                    ${category.category}
                    <span class="category-count">${category.items.length}</span>
                </h2>
            </div>
            <div class="category-grid">
                ${category.items.map((item, index) => renderCard(item, index)).join('')}
            </div>
        </div>
    `).join('');

    // 添加卡片事件
    bindCardEvents();
}

// ===== 渲染单个卡片 =====
function renderCard(item, index) {
    const delay = index * 0.05;

    // 获取图标：如果 icon 存在则使用，否则从 URL 提取域名使用 Google Favicon
    let iconSrc;
    let iconType = 'image';

    if (item.icon && item.icon.trim() !== '') {
        // 有 icon 字段，使用它
        iconSrc = item.icon;
        if (!iconSrc.startsWith('http')) {
            iconType = 'emoji';
        }
    } else {
        // 没有 icon，从 URL 提取域名使用 Google Favicon
        try {
            const domain = new URL(item.url).hostname;
            iconSrc = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch (e) {
            iconSrc = '🔖';
            iconType = 'emoji';
        }
    }

    // 图标 HTML
    const cardIconHtml = iconType === 'image'
        ? `<img src="${iconSrc}" alt="${item.name}" class="card-icon-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><span class="card-icon-fallback" style="display:none">${getFallbackEmoji(item.url)}</span>`
        : iconSrc;

    return `
        <div class="collection-card glass glass-shine"
             data-url="${item.url}"
             data-name="${item.name}"
             style="animation-delay: ${delay}s">
            <div class="card-header">
                <div class="card-icon">${cardIconHtml}</div>
                <div class="card-info">
                    <div class="card-title">${item.name}</div>
                    <div class="card-url">${formatUrl(item.url)}</div>
                </div>
            </div>
            <div class="card-desc">${item.desc}</div>
            <div class="card-footer">
                <div class="card-tags">
                    ${(item.tags || []).map(tag => `<span class="card-tag">#${tag}</span>`).join('')}
                </div>
                <div class="card-actions">
                    <button class="card-action-btn"
                            data-action="copy"
                            data-url="${item.url}"
                            title="复制链接">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// ===== 根据域名获取备用 emoji =====
function getFallbackEmoji(url) {
    try {
        const domain = new URL(url).hostname;
        const emojiMap = {
            'github.com': '🐙',
            'claude.ai': '🧠',
            'chat.openai.com': '💬',
            'dribbble.com': '🏀',
            'behance.net': '🅱️',
            'figma.com': '🎨',
            'notion.so': '📝',
            'stackoverflow.com': '📚'
        };
        for (const [key, emoji] of Object.entries(emojiMap)) {
            if (domain.includes(key.replace('www.', ''))) {
                return emoji;
            }
        }
    } catch (e) { }
    return '🔖';
}

// ===== 格式化 URL =====
function formatUrl(url) {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

// ===== 绑定卡片事件 =====
function bindCardEvents() {
    // 卡片点击跳转
    document.querySelectorAll('.collection-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-action-btn')) return;

            const url = card.dataset.url;
            window.open(url, '_blank');
        });
    });

    // 操作按钮
    document.querySelectorAll('.card-action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const url = btn.dataset.url;

            if (action === 'copy') {
                copyToClipboard(url, btn);
            }
        });
    });
}



async function copyToClipboard(text, btn) {
    try {
        await navigator.clipboard.writeText(text);

        // 显示复制成功提示
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="#34c759" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
        btn.style.color = '#34c759';

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.color = '';
        }, 1500);
    } catch (err) {
        console.error('复制失败:', err);
    }
}

// ===== 更新统计 =====
function updateStats() {
    let totalItems = 0;
    collectionsData.collections.forEach(cat => {
        totalItems += cat.items.length;
    });

    elements.totalCount.textContent = totalItems;
    elements.categoryCount.textContent = collectionsData.collections.length;
}

// ===== 绑定事件 =====
function bindEvents() {
    // 搜索
    elements.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderCollections();
    });

    // 分类标签
    elements.categoryTags.addEventListener('click', (e) => {
        const tag = e.target.closest('.category-tag');
        if (!tag) return;

        document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
        tag.classList.add('active');

        const categoryName = tag.dataset.category === 'all' ? null : tag.dataset.category;
        currentCategory = categoryName;
        renderCollections();
    });

    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
        // '/' 聚焦搜索
        if (e.key === '/' && document.activeElement !== elements.searchInput) {
            e.preventDefault();
            elements.searchInput.focus();
        }
        // ESC 清空搜索
        if (e.key === 'Escape') {
            elements.searchInput.value = '';
            elements.searchInput.blur();
            searchQuery = '';
            renderCollections();
        }
    });
}

// ===== 启动应用 =====
document.addEventListener('DOMContentLoaded', init);
