# 知HR工具集 - UI设计规范

> **目的**：统一所有工具的视觉风格，确保用户体验一致性

---

## 1. 视觉设计系统

### 1.1 品牌色

| 用途 | 颜色值 (oklch) | Tailwind类 | 色号 |
|------|----------------|-------------|--------|
| 主色 (Primary) | `oklch(0.546 0.245 262.881)` | `primary` | #2563EB (blue-600) |
| 主色悬浮态 | `oklch(0.623 0.214 259.815)` | `primary` (dark) | #1D4ED8 (blue-700) |
| 辅助色 (Secondary) | `oklch(0.967 0.003 264.542)` | `secondary` | #F1F5F9 (slate-100) |
| 危险色 (Destructive) | `oklch(0.577 0.245 27.325)` | `destructive` | #F97316 (orange-500) |
| 成功色 | | `success` | #10B981 (emerald-500) |
| 警告色 | | `warning` | #F59E0B (amber-500) |
| 信息色 | | `info` | #3B82F6 (blue-500) |

### 1.2 主题系统

知HR工具集采用浅色/深色双主题系统，支持自动跟随系统主题。

#### 主题变量配置（Tailwind 4.x @theme）：

```css
@theme inline {
  --color-background: oklch(0.976 0.005 247.858);
  --color-foreground: oklch(0.208 0.042 265.755);
  --color-primary: oklch(0.546 0.245 262.881);
  --color-primary-foreground: oklch(0.985 0.002 247.839);
  --color-card: oklch(1 0 0);
  --color-muted: oklch(0.967 0.003 264.542);
  --color-muted-foreground: oklch(0.554 0.022 257.417);
  --color-border: oklch(0.929 0.007 264.542);
  --color-ring: oklch(0.546 0.245 262.881);
  --color-chart-1: oklch(0.546 0.245 262.881);
}

@layer base {
  .dark {
    --color-background: oklch(0.129 0.042 264.695);
    --color-foreground: oklch(0.984 0.003 247.858);
    --color-primary: oklch(0.623 0.214 259.815);
    --color-primary-foreground: oklch(0.985 0.002 247.839);
    --color-card: oklch(0.158 0.046 264.695);
    --color-muted: oklch(0.208 0.042 265.755);
    --color-muted-foreground: oklch(0.704 0.015 264.542);
    --color-border: oklch(0.208 0.042 265.755);
    --color-ring: oklch(0.623 0.214 259.815);
    --color-chart-1: oklch(0.623 0.214 259.815);
  }
}
```

### 1.3 品牌 Logo

知HR Logo SVG：

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="5" r="1" />
  <path d="m9 20 3-6 3 6" />
  <path d="m6 8 6 2 6-2" />
  <path d="M12 10v4" />
</svg>
```

Logo颜色始终使用主色：`class="text-primary"` 或 `text-blue-600"`

---

## 2. 响应式设计规范（核心）

### 2.1 设备分类

| 设备类型 | 宽度范围 | Tailwind 断点 | 典型设备 |
|----------|----------|---------------|----------|
| 手机竖屏 | < 640px | 默认（无前缀） | iPhone, Android |
| 手机横屏 / 小平板 | 640px - 767px | `sm:` | iPhone 横屏, iPad mini |
| 平板 | 768px - 1023px | `md:` | iPad, Android Tablet |
| 小桌面 | 1024px - 1279px | `lg:` | 笔记本 |
| 大桌面 | ≥ 1280px | `xl:` | 外接显示器 |

### 2.2 移动优先原则

**所有样式默认为移动端，通过 `sm:` / `md:` / `lg:` 逐步增强。**

```
移动端（默认） → sm: → md: → lg: → xl:
    ↑ 写在这里的样式是所有设备的基础
```

**示例**：
```tsx
// ✅ 正确：移动优先
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

// ❌ 错误：桌面优先
<div className="grid grid-cols-2 max-md:grid-cols-1 gap-4">
```

### 2.3 布局适配规则

#### 页面主容器

| 设备 | 类名 | 效果 |
|------|------|------|
| 手机 | `px-4 py-5` | 16px 左右内边距 |
| 平板 | `md:px-6` | 24px 左右内边距 |
| 桌面 | `lg:px-8` | 32px 左右内边距 |
| 最大宽度 | `max-w-4xl mx-auto` | 内容区 896px 居中 |

```tsx
<main className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-5">
```

#### 网格布局

| 组件 | 手机 | 平板 (md:) | 桌面 (lg:) |
|------|------|-----------|-----------|
| 维度卡片 | 1列 | 2列 | 2列 |
| 历史记录 | 1列 | 1列 | 1列 |
| 拼图网格 | minmax(120px) | minmax(180px) | minmax(180px) |
| 搜索+筛选 | 垂直堆叠 | 水平排列 | 水平排列 |

```tsx
// 维度卡片网格
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">

// 搜索+筛选
<div className="flex flex-col sm:flex-row gap-3">
```

### 2.4 导航栏适配

| 元素 | 手机 | PC |
|------|------|-----|
| 副标题 | `hidden sm:block` | 显示 |
| 登录按钮文字 | `hidden sm:inline` | 显示 |
| 同步时间 | `hidden sm:block` | 显示 |
| Logo | 40×40 | 40×40 |
| 内边距 | `px-4` | `md:px-6 lg:px-8` |

```tsx
<nav className="h-16 bg-card border-b border-border px-4 md:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm">
  <div className="flex items-center gap-3 cursor-pointer">
    <svg className="text-primary" />
    <div>
      <h1 className="text-lg font-semibold text-foreground">知HR-{工具名称}</h1>
      <p className="text-xs text-muted-foreground hidden sm:block">Vibe Coding，为HR制作效率工具</p>
    </div>
  </div>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm">
      <LogIn className="h-4 w-4" />
      <span className="hidden sm:inline">登录</span>
    </Button>
  </div>
</nav>
```

### 2.5 模态框适配

| 元素 | 手机 | PC |
|------|------|-----|
| 宽度 | `w-full` | `sm:max-w-md` |
| 外边距 | `mx-4` | `mx-auto` |
| 圆角 | `rounded-lg` | `rounded-lg` |
| 内边距 | `p-4 sm:p-6` | `p-6` |

```tsx
<DialogContent className="sm:max-w-md">
  {/* 移动端全宽，PC端最大 448px */}
</DialogContent>
```

### 2.6 卡片适配

| 元素 | 手机 | PC |
|------|------|-----|
| 内边距 | `p-4 sm:p-6` | `p-6` |
| 标题 | `text-base sm:text-lg` | `text-lg` |
| 间距 | `gap-3 sm:gap-4` | `gap-4` |

### 2.7 表单适配

| 元素 | 手机 | PC |
|------|------|-----|
| 输入框高度 | `h-10` | `h-10`（统一） |
| 按钮宽度 | `w-full` | `w-auto` |
| 表单布局 | 垂直堆叠 | `sm:flex-row` 水平排列 |
| 日期选择器 | 全宽 | 固定宽度 |

```tsx
// 搜索+筛选：移动端垂直，PC水平
<div className="flex flex-col sm:flex-row gap-3">
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input className="pl-10" />
  </div>
  <DateFilter />
</div>
```

### 2.8 触控适配

| 元素 | 最小触控区域 | 类名 |
|------|-------------|------|
| 按钮 | 44×44px | `h-9 min-w-[44px]` |
| 图标按钮 | 44×44px | `h-9 w-9` |
| 列表项 | 48px 高 | `py-3` |
| 链接 | 44px 高 | `py-2` |

### 2.9 安全区域

移动端底部安全区域（iPhone 刘海屏等）：

```css
body {
  padding-bottom: env(safe-area-inset-bottom, 20px);
}
```

### 2.10 文字截断

移动端长文本处理：

```tsx
// 单行截断
<span className="block truncate">{text}</span>

// 多行截断（2行）
<p className="line-clamp-2">{text}</p>
```

---

## 3. 布局与容器

### 3.1 标准布局结构

```
┌─────────────────────────────────────────────────────────┐
│  导航栏 (Navbar) - h-16, sticky, z-50                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  主容器 (Main Content) - max-w-4xl, mx-auto             │
│  padding: px-4 md:px-6 lg:px-8, py-5                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 卡片容器

```tsx
<div className="bg-card border border-border rounded-lg shadow-sm p-4 sm:p-6">
</div>
```

特点：
- 背景色：`bg-card`
- 边框色：`border-border`
- 圆角：`rounded-lg`
- 阴影：`shadow-sm`
- 内边距：`p-4 sm:p-6`（移动端 16px，PC端 24px）

---

## 4. 导航栏组件（Navbar）

### 4.1 标准导航栏

所有工具必须包含统一的导航栏。

#### 导航栏特点：

| 属性 | 类名 | 说明 |
|------|------|------|
| 高度 | `h-16` | 固定高度64px |
| 定位 | `sticky top-0` | 顶部固定 |
| 背景 | `bg-card` | 使用卡片背景色 |
| 边框 | `border-b border-border` | 底部边框 |
| 阴影 | `shadow-sm` | 柔和阴影 |
| 层级 | `z-50` | 高z-index |
| 内边距 | `px-4 md:px-6 lg:px-8` | 响应式内边距 |

---

## 5. 按钮组件

### 5.1 按钮变体

| 变体 | 用途 | 类名 |
|------|------|------|
| 主按钮 (Primary) | 主要操作 | `bg-primary text-primary-foreground hover:bg-primary/90` |
| 次要按钮 (Secondary) | 次要操作 | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| 轮廓按钮 (Outline) | 边界操作 | `border border-input hover:bg-accent hover:text-accent-foreground` |
| 幽灵按钮 (Ghost) | 次级操作 | `hover:bg-accent hover:text-accent-foreground` |
| 危险按钮 (Destructive) | 删除/危险操作 | `bg-destructive text-destructive-foreground hover:bg-destructive/90` |

### 5.2 按钮尺寸

| 尺寸 | 类名 | 说明 |
|------|------|------|
| 默认 | `px-4 py-2 h-9` | 标准尺寸 |
| 小 | `px-2.5 py-1.5 h-8` | 小尺寸 |
| 大 | `px-6 py-3 h-11` | 大尺寸 |
| 图标按钮 | `h-9 w-9` | 仅图标按钮 |

### 5.3 按钮响应式

```tsx
// 带文字的按钮：移动端只显示图标，PC端显示图标+文字
<Button variant="outline" size="sm" className="gap-1.5">
  <LogIn className="h-4 w-4" />
  <span className="hidden sm:inline">登录</span>
</Button>

// 移动端全宽按钮，PC端自适应宽度
<Button className="w-full sm:w-auto">保存</Button>
```

---

## 6. 图标系统

### 6.1 图标库

统一使用 **Lucide React** 图标库。

```bash
pnpm install lucide-react
```

### 6.2 图标尺寸

| 尺寸 | 类名 | 适用场景 |
|------|------|----------|
| 小 | `h-4 w-4` | 小按钮、标签 |
| 默认 | `h-5 w-5` | 标准按钮、菜单 |
| 大 | `h-6 w-6` | 导航栏、大卡片 |

### 6.3 常用图标

| 用途 | 图标名称 |
|------|----------|
| 太阳 (深色模式) | `Sun` |
| 月亮 (浅色模式) | `Moon` |
| 登录 | `LogIn` |
| 退出登录 | `LogOut` |
| 用户 | `User` |
| 同步 | `RefreshCw` |
| 保存 | `Save` |
| 删除 | `Trash2` |
| 关闭 | `X` |
| 首页 | `Home` |

---

## 7. 表单组件

### 7.1 输入框 (Input)

```tsx
<input
  type="text"
  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  placeholder="请输入..."
/>
```

### 7.2 文本域 (Textarea)

```tsx
<textarea
  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
  placeholder="请输入..."
/>
```

---

## 8. 模态框 (Dialog)

### 8.1 标准模态框结构

```tsx
<Dialog>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>标题</DialogTitle>
    </DialogHeader>
    {/* 内容 */}
  </DialogContent>
</Dialog>
```

移动端全宽，PC端最大 448px。

### 8.2 登录弹窗规范

登录弹窗是所有工具共用的认证组件，必须保持视觉一致性。

#### 8.2.1 弹窗结构

```html
<div class="modal-overlay" id="zhihr-auth-modal">
  <div class="modal">
    <!-- 头部 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <svg className="text-primary" /> <!-- Logo -->
        <h2 class="text-xl font-semibold text-foreground">登录</h2>
      </div>
      <button onclick="AuthModal.close()" class="p-1 text-muted-foreground hover:text-foreground transition-colors">
        <X className="h-5 w-5" />
      </button>
    </div>
    
    <!-- 表单内容 -->
    <div class="space-y-4">
      <!-- 账号输入框 -->
      <div>
        <label class="block text-sm font-medium text-muted-foreground mb-1.5">账号</label>
        <input type="text" placeholder="输入账号" class="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all" />
      </div>
      
      <!-- 密码输入框 -->
      <div>
        <label class="block text-sm font-medium text-muted-foreground mb-1.5">密码</label>
        <input type="password" placeholder="输入密码" class="w-full px-4 py-3 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all" />
      </div>
      
      <!-- 验证码 -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 px-3 py-2 bg-muted rounded-md">
          <span class="text-sm font-medium text-foreground">3 + 10 = ?</span>
          <button type="button" onclick="refreshCaptcha()" class="p-1 text-muted-foreground hover:text-primary transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <input type="number" placeholder="答案" class="w-20 px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent" />
      </div>
      
      <!-- 错误提示 -->
      <div id="login-error" class="text-sm text-destructive hidden"></div>
      
      <!-- 登录按钮 -->
      <button class="w-full px-4 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all">
        登录
      </button>
      
      <!-- 注册链接 -->
      <p class="text-center text-sm text-muted-foreground">
        没有账号？<a href="#" onclick="AuthModal.open('register');return false;" class="text-primary hover:underline font-medium">注册新账号</a>
      </p>
    </div>
  </div>
</div>
```

#### 8.2.2 弹窗样式规范

| 元素 | 类名 | 说明 |
|------|------|------|
| 遮罩层 | `modal-overlay` | 全屏半透明背景，固定定位 |
| 弹窗容器 | `modal` | 白色背景卡片，居中显示 |
| 移动端宽度 | `w-full` | 移动端全屏 |
| PC端宽度 | `sm:max-w-md` | PC端最大 448px |
| 圆角 | `rounded-xl` | 12px 圆角 |
| 内边距 | `p-6` | 24px 内边距 |
| 阴影 | `shadow-lg` | 中等阴影 |

#### 8.2.3 遮罩层 CSS

```css
.modal-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.modal-overlay.active {
  display: flex;
}

.modal {
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 448px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}
```

#### 8.2.4 表单字段规范

| 字段类型 | 样式要求 |
|----------|----------|
| 标签 | `text-sm font-medium text-muted-foreground mb-1.5` |
| 输入框 | `h-10 px-4 rounded-xl border border-input bg-background` |
| 按钮 | `h-10 w-full bg-primary hover:bg-primary/90 rounded-xl font-semibold` |
| 验证码容器 | `flex items-center gap-3` |

#### 8.2.5 注册表单结构

注册表单与登录表单结构一致，包含以下额外字段：

```html
<div id="register-form" class="space-y-4">
  <div>
    <label class="block text-sm font-medium text-muted-foreground mb-1.5">账号</label>
    <input type="text" placeholder="设置账号（至少3位）" minlength="3" />
  </div>
  <div>
    <label class="block text-sm font-medium text-muted-foreground mb-1.5">密码</label>
    <input type="password" placeholder="设置密码（至少4位）" minlength="4" />
  </div>
  <div>
    <label class="block text-sm font-medium text-muted-foreground mb-1.5">确认密码</label>
    <input type="password" placeholder="再次输入密码" />
  </div>
  <!-- 验证码 -->
  <div class="flex items-center gap-3">...</div>
  <button>注册</button>
  <p>已有账号？<a href="#" onclick="AuthModal.open('login');return false;">登录</a></p>
</div>
```

#### 8.2.6 弹窗交互规范

| 交互 | 实现方式 |
|------|----------|
| 打开弹窗 | `AuthModal.open('login')` 或 `AuthModal.open('register')` |
| 关闭弹窗 | `AuthModal.close()` |
| 切换表单 | 调用 `AuthModal.open()` 切换显示登录/注册表单 |
| 回车键提交 | 账号框→密码框→验证码框→登录按钮 |

#### 8.2.7 共享认证模块

所有工具应通过以下方式引入共享认证模块：

```html
<script src="../shared-auth.js"></script>
<script src="../shared-auth-modal.js"></script>
```

登录按钮点击事件：

```html
<button onclick="AuthModal.open('login')">登录</button>
```

---

## 9. 工具拼图块 (Mosaic Tile)

### 9.1 拼图块设计

拼图块用于首页工具导航，也可用于工具内部功能导航。

拼图网格布局：
```css
.mosaic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  width: 100%;
}
```

响应式：
```css
@media (max-width: 768px) {
  .mosaic-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
  }
  .mosaic-tile {
    padding: 12px;
  }
  .tile-icon {
    width: 32px;
    height: 32px;
  }
  .tile-name {
    font-size: 12px;
  }
  .tile-desc {
    font-size: 10px;
  }
}
```

---

## 10. 响应式速查表

### 10.1 常用响应式模式

| 场景 | 代码 |
|------|------|
| 移动端隐藏，PC显示 | `hidden sm:block` |
| 移动端显示，PC隐藏 | `block sm:hidden` |
| 移动端垂直，PC水平 | `flex-col sm:flex-row` |
| 移动端1列，PC 2列 | `grid-cols-1 md:grid-cols-2` |
| 移动端全宽，PC固定宽 | `w-full sm:w-auto` |
| 移动端小内边距，PC大 | `p-4 sm:p-6` |
| 移动端小间距，PC大 | `gap-3 sm:gap-4` |
| 移动端小字，PC正常 | `text-xs sm:text-sm` |
| 移动端只图标，PC图标+文字 | `<Icon /><span className="hidden sm:inline">文字</span>` |

### 10.2 禁止使用的模式

| 模式 | 原因 | 替代方案 |
|------|------|----------|
| `max-md:` | 违反移动优先 | `md:` 反向写 |
| 固定像素宽度 | 不适配 | 百分比或 `max-w-*` |
| `overflow-x: auto` | 横向滚动体验差 | 响应式布局 |
| `@media (max-width)` | 违反移动优先 | Tailwind 断点 `sm:` `md:` |

---

## 11. 技术栈规范

| 技术 | 版本 | 说明 |
|------|------|------|
| 框架 | React 18+ | 用户界面框架 |
| 构建工具 | Vite 6+ | 快速构建与开发 |
| 状态管理 | Zustand 5+ | 轻量状态管理 |
| 样式 | Tailwind CSS 4+ | CSS原子化样式 |
| UI组件 | shadcn/ui + 自定义 | 可复制的组件库 |
| 图标 | Lucide React | 图标库 |
| 语言 | TypeScript 5+ | 类型安全 |
| 包管理 | pnpm 9+ | 快速包管理 |
| 部署 | Cloudflare Pages | 静态文件托管 |

---

## 12. 字体规范

| 用途 | 类名 | 说明 |
|------|------|------|
| 标题1 | `text-xl font-semibold` | 页面标题 |
| 标题2 | `text-lg font-semibold` | 卡片标题 |
| 正文 | `text-sm` | 正文文本 |
| 小字 | `text-xs` | 辅助文字、标签 |
