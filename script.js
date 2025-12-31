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

    const previewIconHtml = iconType === 'image'
        ? `<img src="${iconSrc}" alt="${item.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'">`
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
            <!-- 预览弹层 -->
            <div class="card-preview">
                <div class="preview-iframe">
                    <img src="https://image.thum.io/get/width/1200/crop/800/${item.url}"
                         alt="${item.name} 预览"
                         loading="lazy"
                         onload="this.parentElement.classList.add('loaded')"
                         onerror="this.parentElement.classList.add('error')">
                    <div class="preview-loading">
                        <div class="spinner"></div>
                        <span>加载预览...</span>
                    </div>
                    <div class="preview-error">
                        <div class="error-icon">🖼️</div>
                        <span>预览加载失败</span>
                        <a href="${item.url}" target="_blank" class="preview-btn">访问网站</a>
                    </div>
                </div>
                <div class="preview-info">
                    <div class="preview-title">${item.name}</div>
                    <div class="preview-url">${item.url}</div>
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
    } catch (e) {}
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

        // 鼠标悬浮时调整预览窗口位置
        card.addEventListener('mouseenter', () => {
            adjustPreviewPosition(card);
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

// ===== 调整预览窗口位置（边界检测）=====
function adjustPreviewPosition(card) {
    const preview = card.querySelector('.card-preview');
    if (!preview) return;

    const cardRect = card.getBoundingClientRect();
    const previewWidth = 700;
    const previewHeight = 460; // 预览窗口高度 + info 高度
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 20;

    // 重置所有位置类
    preview.classList.remove('show-below', 'align-left', 'align-right');

    // 检测垂直方向
    const spaceAbove = cardRect.top;
    const spaceBelow = viewportHeight - cardRect.bottom;

    if (spaceAbove < previewHeight + padding && spaceBelow > spaceAbove) {
        // 上方空间不足，下方更宽裕，向下显示
        preview.classList.add('show-below');
    }

    // 检测水平方向
    const cardCenterX = cardRect.left + cardRect.width / 2;
    const spaceLeft = cardCenterX;
    const spaceRight = viewportWidth - cardCenterX;

    if (spaceLeft < previewWidth / 2 + padding) {
        // 左侧空间不足，左对齐
        preview.classList.add('align-left');
    } else if (spaceRight < previewWidth / 2 + padding) {
        // 右侧空间不足，右对齐
        preview.classList.add('align-right');
    }
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

// ===== 空投动画 =====
let isAirdropping = false;

function triggerAirdrop(categoryName) {
    console.log('触发空投动画:', categoryName);
    if (isAirdropping) {
        console.log('空投正在进行中');
        return;
    }
    isAirdropping = true;

    // 获取分类数据
    const category = collectionsData.collections.find(c => c.category === categoryName);
    console.log('找到分类:', category);
    if (!category || category.items.length === 0) {
        isAirdropping = false;
        renderCollections();
        return;
    }

    const container = document.getElementById('airdropContainer');
    container.innerHTML = '';

    // 清空现有卡片
    elements.collectionsGrid.innerHTML = '';

    // 记录飞机开始时间
    const planeStartTime = Date.now();
    window.airdropStartTime = planeStartTime;

    // 创建飞机
    const airplane = createAirplane();
    container.appendChild(airplane);

    // 计算箱子投放位置和时间
    const items = category.items;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // 每个箱子的投放时机（在飞机飞行到不同位置时投放）
    items.forEach((item, index) => {
        setTimeout(() => {
            dropAirdropBox(item, screenWidth, screenHeight, container);
        }, 500 + index * 500); // 每0.5秒投放一个
    });

    // 动画结束后恢复状态
    setTimeout(() => {
        container.innerHTML = '';
        isAirdropping = false;
    }, 6000);
}

function createAirplane() {
    const plane = document.createElement('div');
    plane.className = 'airplane';
    plane.innerHTML = `
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- 飞机机身 -->
            <ellipse cx="50" cy="55" rx="35" ry="8" fill="#E8E8E8"/>
            <!-- 飞机头部 -->
            <path d="M15 55 Q5 55 5 50 Q5 45 15 50" fill="#E8E8E8"/>
            <!-- 机翼 -->
            <path d="M40 55 L35 75 L65 75 L60 55" fill="#C0C0C0"/>
            <path d="M40 55 L38 85 L62 85 L60 55" fill="#A0A0A0"/>
            <!-- 尾翼 -->
            <path d="M75 55 L70 35 L85 35 L80 55" fill="#C0C0C0"/>
            <!-- 尾部垂直翼 -->
            <path d="M82 55 L78 75 L88 70 L85 55" fill="#A0A0A0"/>
            <!-- 窗户 -->
            <circle cx="25" cy="53" r="2" fill="#4A90D9"/>
            <circle cx="32" cy="53" r="2" fill="#4A90D9"/>
            <circle cx="39" cy="53" r="2" fill="#4A90D9"/>
            <!-- 螺旋桨 -->
            <ellipse cx="8" cy="55" rx="3" ry="8" fill="#666" opacity="0.6">
                <animateTransform attributeName="transform" type="rotate" from="0 8 55" to="360 8 55" dur="0.1s" repeatCount="indefinite"/>
            </ellipse>
        </svg>
    `;

    // 添加尾迹效果
    let contrailInterval = setInterval(() => {
        const rect = plane.getBoundingClientRect();
        if (rect.left > window.innerWidth) {
            clearInterval(contrailInterval);
            return;
        }
        createContrail(rect.left, rect.top + 40);
    }, 100);

    return plane;
}

function createContrail(x, y) {
    const container = document.getElementById('airdropContainer');
    const contrail = document.createElement('div');
    contrail.className = 'contrail';
    contrail.style.left = x + 'px';
    contrail.style.top = y + 'px';
    container.appendChild(contrail);

    setTimeout(() => contrail.remove(), 2000);
}

function dropAirdropBox(item, screenWidth, screenHeight, container) {
    // 飞机参数
    const planeFlightTime = 5000; // 飞机飞行总时间 5秒
    const planeStartTime = window.airdropStartTime || Date.now();

    // 飞机速度 (像素/毫秒)
    const planeSpeed = (screenWidth + 200) / planeFlightTime;

    // 箱子落地位置（随机但合理）
    const padding = 80;
    const targetLeft = padding + Math.random() * (screenWidth - padding * 2);
    const targetTop = 150 + Math.random() * (screenHeight * 0.5);

    // 创建箱子
    const box = document.createElement('div');
    box.className = 'airdrop-box';
    box.style.opacity = '0';

    // 获取图标：如果 icon 存在则使用，否则从 URL 提取域名使用 Google Favicon
    let iconHtml;
    if (item.icon && item.icon.trim() !== '') {
        // 有 icon 字段，直接使用
        if (item.icon.startsWith('http')) {
            iconHtml = `<img src="${item.icon}" style="width:28px;height:28px;">`;
        } else {
            iconHtml = item.icon;
        }
    } else {
        // 没有 icon，从 URL 提取域名使用 Google Favicon
        const domain = new URL(item.url).hostname;
        iconHtml = `<img src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" style="width:28px;height:28px;">`;
    }

    box.innerHTML = `
        <div class="parachute-lines"></div>
        <div class="parachute"></div>
        ${iconHtml}
    `;

    container.appendChild(box);

    // 立即从飞机当前位置投放
    requestAnimationFrame(() => {
        // 获取飞机当前位置
        const planeEl = document.querySelector('.airplane');
        if (!planeEl) return;

        const planeRect = planeEl.getBoundingClientRect();
        const startX = planeRect.left + planeRect.width / 2 - 30; // 箱子中心
        const startY = planeRect.top + 30;

        // 初始位置（在飞机下方）
        box.style.left = startX + 'px';
        box.style.top = startY + 'px';
        box.style.opacity = '1';

        // 水平速度（继承飞机速度的 50%，模拟空气阻力）
        const horizontalSpeed = planeSpeed * 0.5;

        // 旋转
        let rotation = 0;
        const rotationSpeed = 1.5 + Math.random() * 1.5;

        // 动画循环
        const animateStart = Date.now();
        const fallDuration = 2000 + Math.random() * 500; // 随机下落时间 2-2.5秒

        function animate() {
            const now = Date.now();
            const elapsed = now - animateStart;

            if (elapsed >= fallDuration) {
                // 落地
                box.style.left = targetLeft + 'px';
                box.style.top = targetTop + 'px';
                box.style.transform = `rotate(${rotation}deg)`;
                box.classList.add('dropping');

                // 落地效果
                setTimeout(() => {
                    createLandingEffect(targetLeft + 30, targetTop + 60, container);
                    box.classList.add('landed');

                    setTimeout(() => {
                        boxToCard(box, item, targetLeft, targetTop);
                    }, 600);
                }, 100);

                return;
            }

            // 计算当前时间点的物理位置
            const progress = elapsed / fallDuration;

            // 水平位置：匀速（惯性）
            const currentX = startX + horizontalSpeed * elapsed;

            // 垂直位置：加速下落（重力）- 抛物线
            // 使用 easing 模拟重力加速
            const gravityProgress = progress * progress; // 二次函数模拟重力
            const fallDistance = targetTop - startY;
            const currentY = startY + fallDistance * gravityProgress;

            // 旋转
            rotation += rotationSpeed;

            // 更新位置
            box.style.left = currentX + 'px';
            box.style.top = currentY + 'px';
            box.style.transform = `rotate(${rotation}deg)`;

            requestAnimationFrame(animate);
        }

        animate();
    });
}

// 创建落地效果
function createLandingEffect(x, y, container) {
    // 光晕
    const glow = document.createElement('div');
    glow.className = 'landing-glow';
    glow.style.left = (x - 50) + 'px';
    glow.style.top = (y - 15) + 'px';
    container.appendChild(glow);
    setTimeout(() => glow.remove(), 1000);

    // 烟雾
    for (let i = 0; i < 6; i++) {
        setTimeout(() => {
            const smoke = document.createElement('div');
            smoke.className = 'smoke';
            smoke.style.left = (x - 20 + Math.random() * 40) + 'px';
            smoke.style.top = (y - 10 + Math.random() * 20) + 'px';
            container.appendChild(smoke);
            setTimeout(() => smoke.remove(), 1500);
        }, i * 80);
    }
}

function boxToCard(box, item, left, top) {
    // 获取网格容器位置
    const gridRect = elements.collectionsGrid.getBoundingClientRect();

    // 创建完整卡片
    const card = document.createElement('div');
    card.className = 'collection-card glass glass-shine';
    card.style.position = 'absolute';
    card.style.left = left + 'px';
    card.style.top = top + 'px';
    card.style.width = '280px';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.5)';

    // 填充卡片内容
    const delay = 0;

    // 图标逻辑：如果 icon 存在则使用，否则自动获取 favicon
    let iconSrc = '🔖'; // 默认图标
    let iconType = 'emoji';

    if (item.icon && item.icon.trim() !== '') {
        iconSrc = item.icon;
        if (iconSrc.startsWith('http')) {
            iconType = 'image';
        } else {
            iconType = 'emoji';
        }
    } else {
        // icon 不存在时，使用 Google Favicon 服务
        const domain = new URL(item.url).hostname;
        iconSrc = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        iconType = 'image';
    }

    const cardIconHtml = iconType === 'image'
        ? `<img src="${iconSrc}" alt="${item.name}" class="card-icon-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"><span class="card-icon-fallback" style="display:none">${getFallbackEmoji(item.url)}</span>`
        : iconSrc;

    const previewIconHtml = iconType === 'image'
        ? `<img src="${iconSrc}" alt="${item.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>'">`
        : iconSrc;

    card.innerHTML = `
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
        <div class="card-preview">
            <div class="preview-iframe">
                <img src="https://image.thum.io/get/width/1200/crop/800/${item.url}"
                     alt="${item.name} 预览"
                     loading="lazy"
                     onload="this.parentElement.classList.add('loaded')"
                     onerror="this.parentElement.classList.add('error')">
                <div class="preview-loading">
                    <div class="spinner"></div>
                    <span>加载预览...</span>
                </div>
                <div class="preview-error">
                    <div class="error-icon">🖼️</div>
                    <span>预览加载失败</span>
                    <a href="${item.url}" target="_blank" class="preview-btn">访问网站</a>
                </div>
            </div>
            <div class="preview-info">
                <div class="preview-title">${item.name}</div>
                <div class="preview-url">${item.url}</div>
            </div>
        </div>
    `;

    // 移除箱子，添加卡片
    box.remove();
    document.getElementById('airdropContainer').appendChild(card);

    // 卡片飞入网格
    requestAnimationFrame(() => {
        card.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';

        // 计算网格中的目标位置
        setTimeout(() => {
            // 将卡片移入正常网格
            moveToGrid(card, item);
        }, 300);
    });
}

function moveToGrid(card, item) {
    // 创建临时占位卡片在网格中
    const tempCard = document.createElement('div');
    tempCard.className = 'collection-card glass glass-shine';
    tempCard.innerHTML = card.innerHTML;
    tempCard.style.visibility = 'hidden';

    elements.collectionsGrid.appendChild(tempCard);
    const targetRect = tempCard.getBoundingClientRect();

    // 移动到目标位置
    card.style.left = targetRect.left + 'px';
    card.style.top = targetRect.top + 'px';

    setTimeout(() => {
        // 替换为真正的卡片
        tempCard.remove();
        card.style.position = '';
        card.style.left = '';
        card.style.top = '';
        card.style.width = '';
        card.style.visibility = '';
        elements.collectionsGrid.appendChild(card);

        // 绑定事件
        bindCardEvents();
    }, 600);
}

// ===== 启动应用 =====
document.addEventListener('DOMContentLoaded', init);
