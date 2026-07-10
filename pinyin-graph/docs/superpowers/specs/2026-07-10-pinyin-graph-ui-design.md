# 拼音学习图谱 UI 设计规范

> 版本：v1.0  
> 日期：2026-07-10  
> 范围：pinyin-graph（拼音学习图谱）  
> 设计方向：糖果撞色教育风（大胆、活泼、支持深色模式）  
> 约束：不改变现有功能与页面布局

---

## 1. 设计目标

- 建立统一、可扩展的色彩系统，替代当前零散的 Tailwind 默认色与硬编码色值。
- 建立清晰的字体层级，消除 `text-[9px]` 到 `text-5xl` 的混乱取值。
- 提升整体现代感与儿童教育场景的亲和力。
- 同时交付 Light 与 Dark 两套主题，确保在浅色与夜间设备下均有良好体验。

---

## 2. 设计原则

1. **大胆但有序**：使用高饱和撞色，但通过固定色板与使用场景约束避免花哨。
2. **教育认知优先**：声母 / 韵母 / 拼音三类核心节点保留色彩区分，帮助记忆。
3. **一致性优先**：同一交互状态（选中 / 正确 / 错误 / 禁用）在全应用使用同一组 Token。
4. **无障碍基础**：正文与背景对比度 ≥ 4.5:1，大标题与色块对比度 ≥ 3:1。

---

## 3. 色彩系统

### 3.1 品牌色（Brand）

| Token | Light | Dark | 用途 |
|-------|-------|------|------|
| `brand-50` | `#FFF3E6` | `#3D2818` | 极浅背景、高亮 |
| `brand-100` | `#FFE2C2` | `#5C3A24` | 浅色 hover |
| `brand-300` | `#FFB366` | `#B86B3A` | 次级强调 |
| `brand-500` | `#FF8C42` | `#FF9A5C` | 主按钮、品牌标识、进度条 |
| `brand-700` | `#CC5E1E` | `#FFBC8A` | 深色按钮、链接 |
| `brand-900` | `#7A330E` | `#FFE4CC` | 标题强调 |

### 3.2 语义色（Semantic）

| 语义 | Light | Dark | 用途 |
|------|-------|------|------|
| 声母 Shengmu | `#E85D75` | `#FF7A95` | 声母节点、声母相关标签 |
| 韵母 Yunmu | `#00C9A7` | `#33E6C4` | 韵母节点、韵母相关标签 |
| 拼音 Pinyin | `#FFD15C` / 文字 `#7A4F00` | `#FFE08A` / 文字 `#3D2800` | 拼音节点、高亮卡片 |
| 学习 Learning | `#6C5CE7` | `#A29BFE` | 练习入口、成就、特殊强调 |

### 3.3 中性色（Neutral）

| Token | Light | Dark | 用途 |
|-------|-------|------|------|
| `bg-page` | `#FFFBF7` | `#1A1D2E` | 页面背景 |
| `bg-card` | `#FFFFFF` | `#252842` | 卡片、浮层背景 |
| `bg-elevated` | `#FFFFFF` | `#2E3250` | 弹窗、下拉、悬浮卡片 |
| `border` | `#F0E6DE` | `#3A3F5C` | 卡片边框、分割线 |
| `border-strong` | `#E5D8CE` | `#4A5070` | 选中边框、hover 边框 |
| `text-primary` | `#2D2420` | `#F5F1EC` | 主标题、重要正文 |
| `text-secondary` | `#6B6058` | `#B8B2C4` | 次级正文、说明 |
| `text-tertiary` | `#9E938A` | `#7A7F99` | 占位、禁用、辅助 |

### 3.4 功能状态色（State）

| 状态 | Light | Dark | 用途 |
|------|-------|------|------|
| Success | `#2ECC71` | `#4DFF88` | 正确选项、成功反馈 |
| Error | `#E74C3C` | `#FF6B6B` | 错误选项、错题 |
| Warning | `#F1C40F` | `#FFD93D` | 提示、注意 |
| Info | `#3498DB` | `#5DADE2` | 选中状态、信息提示 |
| Disabled | `#D1C7C0` | `#5A5F7A` | 禁用按钮、不可交互 |

### 3.5 图谱专用色（Graph）

| 元素 | Light | Dark | 说明 |
|------|-------|------|------|
| 声母节点填充 | `#E85D75` | `#FF7A95` | 中心节点 |
| 声母节点文字 | `#FFFFFF` | `#2D0A12` | 保证对比度 |
| 韵母节点填充 | `#00C9A7` | `#33E6C4` | 外围节点 |
| 韵母节点文字 | `#FFFFFF` | `#003D32` | 保证对比度 |
| 拼音节点填充 | `#FFD15C` | `#FFE08A` | 第三层节点 |
| 拼音节点文字 | `#7A4F00` | `#3D2800` | 保证对比度 |
| 连线默认 | `#E5D8CE` | `#4A5070` | 细线 |
| 连线高亮 | `#FF8C42` | `#FF9A5C` | 选中/ hover |

---

## 4. 字体层级

字体栈保持不变：`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', sans-serif`

| 层级 | 大小 | 字重 | 行高 | 用途 |
|------|------|------|------|------|
| Display | 2.5rem (40px) | 700 | 1.2 | 页面主标题、满分庆祝 |
| H1 | 1.75rem (28px) | 700 | 1.3 | 声母总览标题、练习结果标题 |
| H2 | 1.375rem (22px) | 600 | 1.35 | 卡片标题、章节标题 |
| H3 | 1.125rem (18px) | 600 | 1.4 | 小标题、统计数字 |
| Body | 1rem (16px) | 400 | 1.6 | 正文、按钮文字 |
| Body Strong | 1rem (16px) | 600 | 1.6 | 强调正文 |
| Caption | 0.875rem (14px) | 400 | 1.5 | 辅助说明、标签 |
| Small | 0.75rem (12px) | 500 | 1.4 | 统计单位、图例 |
| Tiny | 0.6875rem (11px) | 500 | 1.3 | 极短辅助信息 |

**禁止**：不再使用 `text-[9px]`、`text-[10px]` 等硬编码尺寸；统一使用上述 9 个层级。

---

## 5. 间距系统

基于 4px 栅格：

| Token | 值 | 用途 |
|-------|-----|------|
| `space-1` | 4px | 图标与文字间距 |
| `space-2` | 8px | 行内元素间距 |
| `space-3` | 12px | 卡片内部小间距 |
| `space-4` | 16px | 卡片内边距默认 |
| `space-5` | 20px | 模块间距 |
| `space-6` | 24px | 区块间距 |
| `space-8` | 32px | 大区块间距 |
| `space-10` | 40px | 页面级间距 |

---

## 6. 圆角与阴影

### 6.1 圆角

| Token | 值 | 用途 |
|-------|-----|------|
| `radius-sm` | 8px | 小按钮、标签 |
| `radius-md` | 12px | 按钮、输入框 |
| `radius-lg` | 16px | 卡片 |
| `radius-xl` | 20px | 大卡片、弹窗 |
| `radius-full` | 9999px | Pill 按钮、头像 |

### 6.2 阴影（Light）

| Token | 值 | 用途 |
|-------|-----|------|
| `shadow-sm` | `0 1px 2px rgba(45, 36, 32, 0.05)` | 卡片、按钮 |
| `shadow-md` | `0 4px 12px rgba(45, 36, 32, 0.08)` | 浮层、下拉 |
| `shadow-lg` | `0 8px 24px rgba(45, 36, 32, 0.12)` | 弹窗、详情卡片 |
| `shadow-colored` | `0 4px 14px rgba(255, 140, 66, 0.25)` | 主按钮 hover |

### 6.3 阴影（Dark）

深色模式下阴影使用黑色不透明度，避免发灰：

| Token | 值 |
|-------|-----|
| `shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.25)` |
| `shadow-md` | `0 4px 12px rgba(0, 0, 0, 0.35)` |
| `shadow-lg` | `0 8px 24px rgba(0, 0, 0, 0.45)` |

---

## 7. 组件规范

### 7.1 Button

**Primary Button**
- 背景：`brand-500`
- 文字：`#FFFFFF`
- 圆角：`radius-md` (12px)
- 内边距：`px-5 py-2.5`
- 字重：600
- Hover：`brand-700` + `shadow-colored`
- Active：scale 0.97
- Disabled：`Disabled` 背景 + 无阴影

**Secondary Button**
- 背景：`bg-card`
- 边框：1px `border`
- 文字：`text-secondary`
- Hover：`bg-page` / `border-strong`
- Active：scale 0.97

**Ghost Button**
- 背景：transparent
- 文字：`text-secondary`
- Hover：`bg-page` / `text-primary`

### 7.2 Card

- 背景：`bg-card`
- 边框：1px `border`
- 圆角：`radius-lg` (16px)
- 内边距：`space-4` (16px) 移动端 / `space-5` (20px) 桌面端
- 阴影：`shadow-sm`
- Hover（可点击卡片）：`shadow-md` + `border-strong`

### 7.3 练习选项按钮

**默认状态**
- 背景：`bg-card`
- 边框：2px `border`
- 文字：`text-primary`
- 圆角：`radius-md` (12px)

**Hover**
- 边框：`Info` / 背景：`Info` 的 8% 透明度

**选中（未揭晓）**
- 边框：`Info`
- 背景：`Info` 的 10% 透明度
- 文字：`Info`

**正确**
- 边框：`Success`
- 背景：`Success` 的 12% 透明度
- 文字：`Success`

**错误**
- 边框：`Error`
- 背景：`Error` 的 10% 透明度
- 文字：`Error`

### 7.4 图谱节点

| 节点类型 | 填充 | 文字 | 描边 |
|----------|------|------|------|
| 声母 | 声母色 500 | 白色 | 无 |
| 韵母 | 韵母色 500 | 白色 | 无 |
| 拼音 | 拼音色 500 | 拼音文字色 | 无 |
| 选中 | 填充色 + 白色描边 3px | 同填充文字 | `shadow-md` |
| 未选中（其他节点激活时） | 降低至 30% 不透明度 | 同填充文字 | 无 |

### 7.5 Badge / Tag

- 背景：语义色 100（Light）/ 语义色 900（Dark）
- 文字：语义色 700（Light）/ 语义色 300（Dark）
- 圆角：`radius-full`
- 内边距：`px-2.5 py-0.5`
- 字重：500

---

## 8. 深色模式映射策略

- 使用 CSS 变量或 Tailwind `dark:` 前缀实现。
- 页面背景从 `#FFFBF7` 转为 `#1A1D2E`（午夜蓝灰），避免纯黑刺眼。
- 卡片背景使用 `#252842`，与页面背景形成层次。
- 所有语义色在 Dark 模式下提亮一个阶，保持鲜艳感。
- 阴影全部改用黑色不透明度，确保不发灰。
- 文字层级反转：`text-primary` 用暖白 `#F5F1EC`，`text-secondary` 用淡紫灰 `#B8B2C4`。

---

## 9. 关键页面改造样例

### 9.1 声母总览页

- 页面标题：H1 + `text-primary`
- 右上角提示文字：Caption + `text-tertiary`
- 声母卡片：背景 `bg-card`，边框 `border`，圆角 `radius-lg`
- 选中声母：边框 `brand-500` 2px + `shadow-colored`
- 右下角练习按钮组：Primary + Secondary 按钮组合
- 图例：Small + 语义色小方块

### 9.2 声母详情图谱页

- 顶部面包屑：Caption + `text-secondary`
- 控制按钮：Secondary Button
- 图谱容器：Card 样式
- 声母中心节点：声母色 500 + 白色文字
- 韵母节点：韵母色 500 + 白色文字
- 拼音节点：拼音色 500 + 拼音文字色
- 底部工具栏：Card 样式内部

### 9.3 练习页

- 进度条：背景 `border`，填充 `brand-500`
- 题目文字：Display（汉字）/ H1（拼音）
- 提示文字：Caption + `text-tertiary`
- 选项：练习选项按钮规范
- 结果页统计：H1 数字 + Small 标签

---

## 10. 实施建议

### 10.1 代码层落地

1. **Tailwind 配置扩展**：在 `tailwind.config.js` 中完整定义上述 colors / fontSize / boxShadow / borderRadius。
2. **CSS 变量兜底**：在 `index.css` 中定义 `:root` 与 `.dark` 两套 CSS 变量，支持 JS 切换。
3. **组件 token 化**：将 `btn-primary`、`btn-secondary`、`card` 等类名按新规范重写。
4. **暗色模式切换**：在 TopNav 或设置中增加主题切换按钮，通过 `document.documentElement.classList.toggle('dark')` 控制。

### 10.2 迁移清单

- [ ] 更新 `tailwind.config.js` 颜色、字体、阴影、圆角 Token
- [ ] 更新 `index.css` 基础变量与暗色模式
- [ ] 重构 `btn-primary` / `btn-secondary` / `card` / `tag`
- [ ] 统一各组件字体层级（Display/H1/H2/H3/Body/Caption/Small/Tiny）
- [ ] 统一练习组件状态色（选中/正确/错误）
- [ ] 统一图谱节点配色
- [ ] 更新 PinyinCard、PracticeResult、PracticeHeader 视觉
- [ ] 添加深色模式切换入口
- [ ] 对比度检查（可用 axe / WAVE）
- [ ] 多端截图验收

---

## 11. 性能与体验注意事项

- 不使用整个图标字体库，继续使用本地 SVG 图标。
- 阴影与模糊效果避免大面积使用，防止低端设备掉帧。
- 深色模式切换时避免闪白，可在 HTML 加载前写入主题脚本。

---

## 12. 附录：Token 速查表

### 12.1 CSS 变量定义（src/index.css）

```css
:root {
  color-scheme: light;

  --color-brand-50: 255 243 230;
  --color-brand-100: 255 226 194;
  --color-brand-300: 255 179 102;
  --color-brand-500: 255 140 66;
  --color-brand-700: 204 94 30;
  --color-brand-900: 122 51 14;

  --color-shengmu: 232 93 117;
  --color-yunmu: 0 201 167;
  --color-pinyin: 255 209 92;
  --color-pinyin-text: 122 79 0;
  --color-learning: 108 92 231;

  --color-state-success: 46 204 113;
  --color-state-error: 231 76 60;
  --color-state-warning: 241 196 15;
  --color-state-info: 52 152 219;
  --color-state-disabled: 209 199 192;

  --color-surface: 255 251 247;
  --color-surface-card: 255 255 255;
  --color-surface-elevated: 255 255 255;
  --color-divider: 240 230 222;
  --color-divider-strong: 229 216 206;
  --color-content-primary: 45 36 32;
  --color-content-secondary: 107 96 88;
  --color-content-tertiary: 158 147 138;
}

.dark {
  color-scheme: dark;

  --color-shengmu: 255 122 149;
  --color-yunmu: 51 230 196;
  --color-pinyin: 255 224 138;
  --color-pinyin-text: 61 40 0;
  --color-learning: 162 155 254;

  --color-state-success: 77 255 136;
  --color-state-error: 255 107 107;
  --color-state-warning: 255 217 61;
  --color-state-info: 93 173 226;
  --color-state-disabled: 90 95 122;

  --color-surface: 26 29 46;
  --color-surface-card: 37 40 66;
  --color-surface-elevated: 46 50 80;
  --color-divider: 58 63 92;
  --color-divider-strong: 74 80 112;
  --color-content-primary: 245 241 236;
  --color-content-secondary: 184 178 196;
  --color-content-tertiary: 122 127 153;
}
```

### 12.2 Tailwind 配置（tailwind.config.js）

```js
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'rgb(var(--color-brand-50) / <alpha-value>)',
          100: 'rgb(var(--color-brand-100) / <alpha-value>)',
          300: 'rgb(var(--color-brand-300) / <alpha-value>)',
          500: 'rgb(var(--color-brand-500) / <alpha-value>)',
          700: 'rgb(var(--color-brand-700) / <alpha-value>)',
          900: 'rgb(var(--color-brand-900) / <alpha-value>)',
        },
        shengmu: 'rgb(var(--color-shengmu) / <alpha-value>)',
        yunmu: 'rgb(var(--color-yunmu) / <alpha-value>)',
        pinyin: {
          DEFAULT: 'rgb(var(--color-pinyin) / <alpha-value>)',
          text: 'rgb(var(--color-pinyin-text) / <alpha-value>)',
        },
        learning: 'rgb(var(--color-learning) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--color-surface) / <alpha-value>)',
          card: 'rgb(var(--color-surface-card) / <alpha-value>)',
          elevated: 'rgb(var(--color-surface-elevated) / <alpha-value>)',
        },
        divider: 'rgb(var(--color-divider) / <alpha-value>)',
        'divider-strong': 'rgb(var(--color-divider-strong) / <alpha-value>)',
        content: {
          primary: 'rgb(var(--color-content-primary) / <alpha-value>)',
          secondary: 'rgb(var(--color-content-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--color-content-tertiary) / <alpha-value>)',
        },
        state: {
          success: 'rgb(var(--color-state-success) / <alpha-value>)',
          error: 'rgb(var(--color-state-error) / <alpha-value>)',
          warning: 'rgb(var(--color-state-warning) / <alpha-value>)',
          info: 'rgb(var(--color-state-info) / <alpha-value>)',
          disabled: 'rgb(var(--color-state-disabled) / <alpha-value>)',
        },
      },
      fontSize: { /* display/h1/h2/h3/body/body-strong/caption/small/tiny */ },
      borderRadius: { sm: '8px', md: '12px', lg: '16px', xl: '20px' },
      boxShadow: {
        sm: '0 1px 2px rgba(45, 36, 32, 0.05)',
        md: '0 4px 12px rgba(45, 36, 32, 0.08)',
        lg: '0 8px 24px rgba(45, 36, 32, 0.12)',
        colored: '0 4px 14px rgba(255, 140, 66, 0.25)',
        'colored-dark': '0 4px 14px rgba(255, 154, 92, 0.30)',
      },
    },
  },
}
```

### 12.3 主题预加载脚本（index.html）

```html
<head>
  <script>
    (function () {
      const theme = localStorage.getItem('pinyin-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      }
    })()
  </script>
</head>
```

---

## 13. 设计交付物清单

- [x] 设计规范文档（本文档）
- [x] 组件视觉样例
  - Light: [light-overview.png](assets/light-overview.png), [light-detail-b.png](assets/light-detail-b.png), [light-practice-question.png](assets/light-practice-question.png), [light-practice-result.png](assets/light-practice-result.png)
  - Dark: [dark-overview.png](assets/dark-overview.png), [dark-detail-b.png](assets/dark-detail-b.png), [dark-practice-question.png](assets/dark-practice-question.png), [dark-practice-result.png](assets/dark-practice-result.png)
- [x] 开发协作说明（Token 映射表与迁移清单，见第 10 节与第 12 节）

> 设计规范已确认后，进入 `writing-plans` 阶段拆分为具体实施计划。
