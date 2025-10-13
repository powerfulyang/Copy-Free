# Copy Free

Copy Free 是一款基于 WXT 与 Vue 3 构建的浏览器扩展，用来解除网页的文本选择、复制、右键菜单等限制。项目同时支持 Chrome、Firefox 等现代浏览器，并且提供多语言界面、丰富的解锁策略与可视化状态反馈，帮助用户无障碍访问平台内容。

## 功能特性

- **自动解锁**：实时移除 `user-select: none`、禁用复制/右键的事件监听器，并在 DOM 变更时持续监控。
- **外链直达**：在 CSDN、知乎、简书、Google 等站点跳过中转页，直接访问目标链接。
- **状态展示**：在页面右下角展示解锁状态提示，几秒后自动收起为徽标，点击可再次展开。
- **白名单管理**：通过设置页面管理白名单，仅在特定网站启用解锁功能，或设置为全局生效。包含默认白名单（CSDN、知乎、简书等常见网站），支持导入/导出配置。
- **多语言支持**：随浏览器语言自动切换中英文，通过 `@wxt-dev/i18n` 管理文案，开发时拥有类型提示。
- **可视化控制**：弹出面板内可一键启用/停用扩展、查看当前站点状态、刷新页面等。
- **拓展能力**：利用 WXT 的文件式 entrypoints、模块系统及自动导入功能，方便新增脚本、UI 或集成其他模块（如 UnoCSS、Auto Icons、Analytics）。

## 技术栈亮点

Copy Free 在实现过程中大量使用了 WXT 的进阶特性与官方模块，让扩展开发体验接近现代前端框架。

### 1. Entrypoint System

扩展核心逻辑位于 `entrypoints/` 目录：

- `background.ts` 通过 `defineBackground` 注册后台脚本，负责持久化状态与跨上下文通信。
- `ui.content` 内容脚本使用 `defineContentScript`、`ContentScriptContext`、`createShadowRootUi` 等能力，在网页环境注入 UI、监听 DOM 变化并动态注入 CSS（`cssInjectionMode: 'ui'`）。
- `popup/` 弹出面板作为 HTML entrypoint，通过 Vue 组件提供交互界面。
- `options/` 设置页面提供完整的白名单管理功能，包括添加/删除域名、导入/导出配置、恢复默认白名单等。

### 2. 自动导入与类型系统

WXT 提供的 auto-imports 让我们可以直接使用下列 API，无需手动引入：

- `defineContentScript`、`storage`、`injectScript`、`createShadowRootUi` 等工具函数；
- `Browser` 命名空间类型，替代 `webextension-polyfill`，确保 MV3 API 的类型准确；
- `#imports` 虚拟模块统一导出所有可自动导入的函数，提升代码可维护性。

同时，运行 `pnpm wxt prepare` 会在 `.wxt/` 目录生成 `wxt.d.ts`、`imports-module.d.ts` 等类型文件，包含浏览器路径补全、i18n 消息键提示等增强体验。

### 3. WXT 模块生态

项目使用官方模块并可继续拓展：

- `@wxt-dev/module-vue`：集成 Vue + Vite，提供热更新与类型检查；
- `@wxt-dev/i18n`：扫描 `locales/` 下的语言包生成类型安全的 `browser.i18n` 封装；
- `@wxt-dev/auto-icons` 与 `@wxt-dev/unocss` 可按需加入，实现图标自动生成与原子化 CSS；
- 通过自定义模块（`modules/` 目录）还能注册生命周期钩子，动态生成脚本、修改 manifest 或注入构建资源。

## 开发指南

### 环境要求

- Node.js ≥ 18
- pnpm（推荐）

### 安装依赖

```bash
pnpm install
```

### 常用命令

```bash
# 启动开发模式（默认 Chrome）
pnpm dev

# Firefox 开发模式
pnpm dev:firefox

# 构建生产版本
pnpm build
pnpm build:firefox

# 打包生成 zip（用于商店发布）
pnpm zip
pnpm zip:firefox

# 类型检查
pnpm compile
```

### 调试与热更新

- WXT Dev Server 会自动打开浏览器并注入扩展，支持内容脚本热重载与 popup HMR。
- 开发时新增 entrypoint 文件，WXT 会自动重新扫描并在 manifest 中注册。
- `.output/{browser}-mv{version}` 目录区分不同浏览器与 manifest 版本，避免开发产物覆盖线上包。

## 发布流程

```bash
pnpm build
pnpm zip
```

Chrome Web Store 可直接上传 `zip` 包；Firefox 需使用 `zip:firefox` 产物。发布前可利用 WXT 的 `zip` 钩子注入额外资源或过滤文件。

## 参与贡献

欢迎通过 Issue 或 Pull Request 反馈问题、提交功能。若要深入了解 WXT 的更多能力（模块系统、Manifest 钩子、自动导入、测试体系等），可参考官方文档：

- Entrypoint System
- Manifest Generation
- Module System
- Auto-imports
- Testing Extensions

Copy Free 也欢迎分享使用体验与改进建议，期待你的参与！
