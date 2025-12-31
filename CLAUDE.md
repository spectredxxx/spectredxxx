# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个纯静态网页项目，用于展示 AI 工具和开发资源的导航页面。项目采用深色玻璃态（Glassmorphism）设计风格，支持分类筛选、搜索和卡片悬浮预览功能。

## 项目结构

```
.
├── index.html      # 主 HTML 文件
├── style.css       # 完整样式（含动画、响应式、玻璃效果）
├── script.js       # 核心逻辑（数据加载、渲染、事件、空投动画）
└── data.json       # 项目数据源（collections 结构）
```

## 开发命令

### 启动本地服务器
```bash
# Python 3
python3 -m http.server 8000

# 或使用 Python 2
python -m SimpleHTTPServer 8000

# 或使用 Node.js
npx serve .
```

访问 `http://localhost:8000`

**注意**：由于使用了 `fetch()` 加载 `data.json`，不能直接用 `file://` 协议打开 HTML 文件，必须通过 HTTP 服务器访问。

### 缓存清除
修改 CSS 或 JS 后，HTML 中使用了版本参数（`?v=10`、`?v=16`）来避免缓存。修改静态资源时需同步更新这些版本号。

## 核心架构

### 数据结构 (`data.json`)
```json
{
  "collections": [
    {
      "category": "分类名称",
      "icon": "emoji图标",
      "items": [
        {
          "name": "项目名称",
          "url": "https://example.com",
          "desc": "描述文本",
          "icon": "可选图标URL或emoji（留空则自动获取favicon）",
          "tags": ["标签1", "标签2"],
          "favorite": true/false
        }
      ]
    }
  ]
}
```

### JS 核心模块 (`script.js`)

| 模块 | 职责 |
|------|------|
| `loadData()` | 从 `data.json` 加载数据，带缓存破坏参数 |
| `renderCategoryTags()` | 渲染分类筛选标签 |
| `renderCollections()` | 渲染项目卡片，支持分类过滤和搜索 |
| `renderCard()` | 单个卡片 HTML 生成，自动处理 favicon |
| `bindCardEvents()` | 绑定卡片点击、预览位置调整 |
| `adjustPreviewPosition()` | 边界检测，智能调整预览弹窗位置 |
| `triggerAirdrop()` | 空投动画入口（飞机投送箱子效果） |
| `copyToClipboard()` | 复制链接到剪贴板 |

### CSS 架构 (`style.css`)

- **CSS 变量**：定义在 `:root` 中，包含深色主题配色、渐变、圆角、阴影、过渡
- **玻璃效果**：`.glass` 类使用 `backdrop-filter: blur(20px)` 实现
- **动画**：
  - `@keyframes float` / `orbFloat`：背景光球浮动
  - `@keyframes cardEnter`：卡片入场
  - `@keyframes planeFly` / `parachuteSway` / `boxBounce`：空投动画序列
  - `@keyframes spin`：加载旋转

### 关键特性

1. **Favicon 自动获取**：当 `item.icon` 为空时，从 URL 提取域名，使用 Google Favicon 服务
2. **预览边界检测**：`adjustPreviewPosition()` 根据视口空间智能调整预览弹窗位置
3. **空投动画**：完整的物理模拟（重力加速度、水平惯性、旋转）
4. **搜索功能**：支持项目名称、描述、标签的模糊搜索
