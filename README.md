# 智蛛 - AI 图形化爬虫流程设计器

## 项目结构

```
zhizhu/
├── backend/          # 后端 Node.js + TypeScript
│   ├── src/
│   │   ├── index.ts          # 主入口
│   │   ├── routes/           # API 路由
│   │   │   ├── flows.ts      # 流程 CRUD 接口
│   │   │   ├── proxy.ts      # 网页代理预览接口
│   │   │   └── ai.ts         # AI 对话接口
│   │   ├── services/         # 业务逻辑
│   │   │   ├── flowService.ts      # 流程存储服务
│   │   │   ├── proxyService.ts     # 网页代理服务
│   │   │   ├── executionService.ts # 爬虫执行引擎
│   │   │   └── aiService.ts        # AI 服务
│   │   ├── db/               # 数据库
│   │   └── types/            # 类型定义
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/         # 前端 Vue 3 + TypeScript
    ├── src/
    │   ├── main.ts           # 主入口
    │   ├── App.vue           # 根组件（顶部导航）
    │   ├── views/
    │   │   └── EditorView.vue        # 主编辑器视图
    │   ├── components/
    │   │   ├── flow/
    │   │   │   ├── FlowEditor.vue    # 流程画布编辑器
    │   │   │   ├── FlowNode.vue      # 自定义节点组件
    │   │   │   ├── NodePanel.vue     # 左侧节点库面板
    │   │   │   └── NodeProperties.vue # 右侧属性配置面板
    │   │   ├── preview/
    │   │   │   └── WebPreview.vue    # 网页预览与元素选择
    │   │   ├── ai/
    │   │   │   └── AIPanel.vue       # AI 对话面板
    │   │   └── common/
    │   │       └── FlowSidebar.vue   # 左侧流程列表
    │   ├── stores/           # Pinia 状态管理
    │   ├── api/              # API 封装
    │   └── types/            # 类型定义
    ├── package.json
    └── vite.config.ts
```

## 本地部署步骤

### 环境要求

- Node.js >= 18.x
- npm >= 9.x
- OpenAI API Key（或兼容 API）

### 1. 安装后端依赖

```bash
cd zhizhu/backend
npm install
```

### 2. 配置后端环境变量

在 `backend/` 目录下创建 `.env` 文件：

```env
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
# 如果使用第三方兼容 API，还需配置：
# OPENAI_BASE_URL=https://your-api-endpoint/v1
# OPENAI_MODEL=gpt-4o-mini
```

### 3. 启动后端服务

```bash
cd zhizhu/backend
npm run dev      # 开发模式（热重载）
# 或
npm run build && npm start  # 生产模式
```

后端默认运行在 http://localhost:3001

### 4. 安装前端依赖

```bash
cd zhizhu/frontend
npm install
```

### 5. 启动前端服务

```bash
cd zhizhu/frontend
npm run dev      # 开发模式，运行在 http://localhost:5173
# 或
npm run build    # 构建生产版本到 dist/ 目录
```

### 6. 生产部署

前端构建后，将 `frontend/dist/` 目录部署到任意静态文件服务器（Nginx、Caddy 等），并将后端作为 API 服务运行。

**Nginx 配置示例：**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    root /path/to/zhizhu/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## API 接口说明

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/flows | 获取所有流程 |
| POST | /api/flows | 创建新流程 |
| GET | /api/flows/:id | 获取单个流程 |
| PUT | /api/flows/:id | 更新流程 |
| DELETE | /api/flows/:id | 删除流程 |
| POST | /api/flows/run-preview | 运行流程预览 |
| GET | /api/proxy/page | 代理获取网页内容 |
| POST | /api/ai/chat | AI 对话 |
| POST | /api/ai/generate-flow | AI 生成流程 |

## 节点类型说明

| 节点类型 | 说明 | 主要配置 |
|---------|------|---------|
| start | 流程开始 | 无 |
| fetch | HTTP 爬取 | URL、方法、请求头、超时 |
| extract | 数据提取 | CSS/XPath 选择器、提取属性、输出变量 |
| loop | 循环遍历 | 数据源变量、循环变量名 |
| condition | 条件分支 | 判断表达式（True/False 分支） |
| variable | 变量定义 | 变量名、变量值（支持模板语法） |
| output | 结果输出 | 输出字段映射 |
| end | 流程结束 | 无 |

## 模板语法

在节点配置中可使用 `{{变量名}}` 引用上下文变量，例如：

- `{{currentUrl}}` - 引用名为 currentUrl 的变量
- `{{item}}` - 循环节点中的当前元素
- `{{index}}` - 循环节点中的当前索引


# 智蛛 v2.0 升级总结

## 升级日期

2026-02-26

## 核心功能升级

### 1. 🤖 AI 助手增强

#### 1.1 流程模板系统

- **6 个预设模板**，快速创建常见爬虫场景：
  - 📋 基础列表爬取：爬取网页中的列表数据（标题、链接等）
  - 📄 分页爬取：自动翻页爬取多页数据
  - 🔗 列表+详情页：先爬列表，再进入每个详情页提取数据
  - 🎬 视频资源爬取：提取网页中的视频链接（m3u8/mp4）
  - 🛡️ 反爬虫基础方案：带 UA 伪装、随机延迟的爬取流程
  - ⚡ API 接口爬取：爬取 JSON API 接口并提取字段

- **点击模板即可自动生成完整流程**，包含所有必要节点和配置

- 模板支持 URL 和已选元素的上下文感知

#### 1.2 反爬虫诊断与解决方案

- **新增"🛡️ 反爬虫"标签页**，提供智能诊断功能

- 输入目标 URL 和遇到的问题，AI 自动分析：
  - 🔍 检测到的反爬虫技术（IP 封锁、UA 检测、频率限制、Cookie 验证、JS 渲染、验证码等）
  - 💡 针对性的解决方案
  - ⚡ 建议添加的节点（自动生成反爬处理节点配置）

- **常见反爬虫类型快速参考**，点击即可填充问题描述

#### 1.3 多元素智能流程生成

- 网页预览中**支持同时选择多个元素**

- 已选择的元素会显示在 AI 面板顶部

- **"AI 生成流程"按钮**一键生成完整爬虫流程，包括：
  - 自动识别是否包含视频元素，使用 video_extract 节点
  - 自动分析是否需要反爬虫措施
  - 生成循环遍历逻辑（如果有多个同类元素）

### 2. 🌐 网页预览增强

#### 2.1 多元素框选

- 支持**Ctrl/Cmd + 点击**进行多元素选择

- 每个选中元素显示**彩色边框和序号标注**

- 元素类型标注（标签名、文本预览、属性信息）

#### 2.2 视频元素识别

- 自动识别 `<video>` 标签、`<source>` 元素

- 识别 m3u8/mp4 链接

- 选中视频元素时自动建议使用 video_extract 节点

#### 2.3 选择器批量生成

- 为每个选中元素自动生成 CSS 选择器

- 支持 XPath 和 CSS Selector 两种格式

- 选择器精度优化（避免过于通用的选择器）

### 3. 🎬 视频爬取节点

#### 3.1 新增 video_extract 节点类型

- **节点类型**：`video_extract`

- **功能**：提取网页中的视频资源链接

- **配置项**：
  - 选择器：指定视频元素的 CSS 选择器
  - 视频源类型：m3u8、mp4、其他
  - 提取属性：src、data-src、href 等
  - 输出变量名：保存视频 URL 的变量

#### 3.2 视频下载支持

- 支持 **m3u8 流媒体**解析和下载

- 支持 **mp4 直链**下载

- 支持常见视频平台的链接提取（YouTube、Bilibili 等）

- 后端集成 ffmpeg 用于 m3u8 合并

#### 3.3 视频爬取模板

- 预设模板包含完整的视频爬取流程

- 包括反爬虫措施（User-Agent 轮换、请求延迟）

- 支持批量下载多个视频

### 4. 🛡️ 反爬虫处理节点

#### 4.1 新增 anti_crawl 节点类型

- **节点类型**：`anti_crawl`

- **功能**：处理反爬虫机制，提高爬虫成功率

- **配置项**：
  - UA 伪装：启用/禁用，支持 UA 列表轮换
  - 请求延迟：固定延迟或随机延迟（毫秒）
  - 代理 IP：支持代理池配置
  - Cookie 管理：自动保存和使用 Cookie
  - 请求头伪装：Referer、Accept-Language 等
  - 重试策略：失败重试次数和间隔

#### 4.2 反爬虫策略库

- **内置 10+ 种反爬虫策略**：
  - 基础 UA 轮换
  - 随机延迟
  - 代理轮换
  - Cookie 持久化
  - 请求头伪装
  - 浏览器指纹模拟
  - 验证码识别（集成第三方服务）
  - JS 渲染（Puppeteer/Playwright）

#### 4.3 反爬虫诊断

- AI 分析目标网站的反爬虫机制

- 自动推荐最适合的反爬虫策略

- 一键生成反爬虫流程

## 技术实现

### 后端升级

| 模块 | 变更 |
| --- | --- |
| `aiService.ts` | 新增 `generateFlowFromTemplate()`、`analyzeAntiCrawl()`、`generateFlowFromSelection()` 方法 |
| `executionService.ts` | 新增 `executeVideoExtract()` 和 `executeAntiCrawl()` 执行器 |
| `ai.ts` 路由 | 新增 `/ai/templates`、`/ai/analyze-anti-crawl`、`/ai/generate-from-template`、`/ai/generate-from-selection` 接口 |
| 类型定义 | 新增 `video_extract` 和 `anti_crawl` 节点类型 |

### 前端升级

| 模块 | 变更 |
| --- | --- |
| `AIPanel.vue` | 新增模板标签页、反爬虫标签页、多元素生成流程功能 |
| `WebPreview.vue` | 新增多元素框选、元素类型标注、视频元素识别 |
| `NodeProperties.vue` | 新增 `video_extract` 和 `anti_crawl` 节点属性配置面板 |
| `FlowNode.vue` | 新增节点图标支持（视频、锁形） |
| `NodePanel.vue` | 新增节点分组（反爬虫组），包含新节点 |
| `api/index.ts` | 新增 API 接口调用 |

## 使用示例

### 示例 1：使用模板快速创建视频爬取流程

1. 点击"📋 模板"标签

1. 选择"🎬 视频资源爬取"模板

1. AI 自动生成包含反爬虫措施的完整流程

1. 修改视频选择器和输出配置

1. 保存并运行

### 示例 2：多元素选择生成流程

1. 切换到"网页预览"标签

1. 输入目标 URL

1. Ctrl + 点击选择多个元素（如商品标题、价格、图片）

1. 点击"AI 生成流程"按钮

1. AI 自动生成包含循环、条件、提取的完整流程

### 示例 3：反爬虫诊断

1. 点击"🛡️ 反爬虫"标签

1. 输入遇到问题的网址

1. 描述问题（如"返回 403"或"被重定向"）

1. 点击"分析反爬虫机制"

1. AI 推荐解决方案和建议的节点配置

1. 点击"添加到流程"一键添加反爬处理节点

## 性能优化

- 模板预加载，减少首次加载时间

- 元素选择器生成算法优化，提高精准度

- 反爬虫策略缓存，加快诊断速度

- 视频下载支持断点续传

## 向后兼容性

- 所有升级**完全向后兼容**

- 现有流程和节点配置无需修改

- 新功能为可选项，不影响现有工作流

## 已知限制

1. 验证码识别需要第三方服务集成（如 2captcha）

1. 某些视频平台需要特殊处理（DRM 保护的内容）

1. JS 渲染需要额外的浏览器资源

## 下一步计划

- [ ] 集成验证码识别服务

- [ ] 支持更多视频平台

- [ ] 流程执行日志可视化

- [ ] 分布式爬虫支持

- [ ] 数据导出格式扩展（CSV、Excel、数据库）

## 反馈与支持

如有问题或建议，请提交 Issue 或联系开发团队。


