# Review System 弹窗组件优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking。

**Goal:** 优化 review-system 项目中两个弹窗（登录/注册弹窗、提交重复提醒弹窗）的视觉呈现和交互体验，采用现代简洁风格，固定尺寸设计。

**Architecture:** 采用方案 A（JS 字符串替换法）。登录/注册弹窗通过修改 `index.html` 内联 CSS 实现；重复提醒弹窗通过精确字符串替换编译后 JS 文件中的 Tailwind className 实现。不涉及业务逻辑变更，仅调整样式类名和 CSS 属性。

**Tech Stack:** 纯 HTML/CSS（登录弹窗）、编译后 React + Tailwind CSS（重复提醒弹窗）、Python 脚本用于 JS 字符串替换

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `review-system/index.html` | 修改 | 登录/注册弹窗的内联 CSS 样式 |
| `review-system/assets/index-BmCB11Ko.js` | 修改 | 重复提醒弹窗的 className 字符串替换 |
| `fix_modal_v2.py` | 新建 | 执行 JS 字符串替换的 Python 脚本 |

---

### Task 1: 优化登录/注册弹窗 CSS 样式

**Files:**
- Modify: `review-system/index.html` (CSS 在 `<style>` 标签内，约第 25-280 行)

- [ ] **Step 1: 备份当前文件**

```bash
cp /Users/yq/Downloads/zhihr/review-system/index.html /Users/yq/Downloads/zhihr/review-system/index.html.bak
```

- [ ] **Step 2: 修改登录卡片容器 — 固定宽度 420px 并增强阴影**

在 `.login-card` 规则中：
- 保持 `border-radius: 24px`
- 阴影从单层改为多层：`box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25), 0 12px 24px -8px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.1)`
- 添加 `width: 420px; max-width: 90vw` 固定宽度 + 小屏适配

- [ ] **Step 3: 优化输入框过渡时间和 focus 效果**

在 `.input-field` 规则中：
- `transition: all 0.25s ease` (从 0.2s 增加到 0.25s)
- focus 时增加微弱 scale：`transform: scale(1.005)`（通过 box-shadow 模拟）

- [ ] **Step 4: 增强 submit-btn hover 效果**

在 `.submit-btn:hover:not(:disabled)` 中：
- 添加 `transform: translateY(-1px) scale(1.01)`
- 增强阴影：`box-shadow: 0 10px 25px rgba(37,99,235,0.45)`

- [ ] **Step 5: 优化表单切换 Tab 样式**

在 `.form-tab.active` 规则中：
- 添加底部指示条效果：`border-bottom: 2px solid #3b82f6; border-radius: 8px 8px 0 0`
- 或保持现有样式但增加 `font-weight: 600`

- [ ] **Step 6: 验证登录弹窗视觉效果**

启动本地服务器并打开浏览器检查：
```bash
cd /Users/yq/Downloads/zhihr && python3 -m http.server 8082
```
访问 `http://127.0.0.1:8082/review-system/`
确认：卡片居中、固定宽度、输入框和按钮交互正常、无控制台报错

---

### Task 2: 创建 JS 字符串替换脚本

**Files:**
- Create: `review-system/fix_modal_v2.py`

- [ ] **Step 1: 编写替换脚本**

创建 Python 脚本，对 `assets/index-BmCB11Ko.js` 执行以下精确字符串替换：

**替换 1 — 外层容器：添加居中布局**
```
旧值: f&&V.jsxs("div",{className:"mt-4 animate-slideDown",children:[
新值: f&&V.jsxs("div",{className:"flex justify-center mt-4",children:[
```

**替换 2 — 卡片外层：固定尺寸 + 移除暖色边框**
```
旧值: V.jsxs("div",{className:"bg-white dark:bg-slate-800 rounded-xl border-2 border-amber-200 dark:border-amber-800 shadow-lg p-5 w-full",children:[
新值: V.jsxs("div",{className:"bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 w-[480px] mx-auto",children:[
```

**替换 3 — 标题样式微调**
```
旧值: V.jsx("h3",{className:"text-lg font-semibold text-slate-800 dark:text-slate-100 text-center mb-2",children:"今日已有复盘记录"})
新值: V.jsx("h3",{className:"text-base font-semibold text-slate-800 dark:text-slate-100 text-center mb-1",children:"今日已有复盘记录"})
```

**替换 4 — 副标题 + 分隔线**
```
旧值: V.jsx("p",{className:"text-sm text-slate-500 dark:text-slate-400 text-center mb-6",children:"检测到您今天已有复盘记录，请选择操作方式"})
新值: V.jsx("p",{className:"text-sm text-slate-400 dark:text-slate-500 text-center mb-5 pb-4 border-b border-slate-100 dark:border-slate-700",children:"检测到您今天已有复盘记录，请选择操作方式"})
```

**替换 5 — "覆盖现有记录"按钮样式**
```
旧值: className:"w-full p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 hover:border-blue-500 dark:hover:border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-left transition-colors cursor-pointer"
新值: className:"w-full p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-left transition-all duration-200 hover:shadow-md cursor-pointer group"
```

**替换 6 — "覆盖现有记录"图标容器增大**
```
旧值: className:"w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center" (覆盖按钮内的图标 div)
新值: className:"w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 flex items-center justify-center transition-colors"
```

**替换 7 — "创建新记录"按钮样式**
```
旧值: className:"w-full p-4 rounded-lg border-2 border-green-200 dark:border-green-800 hover:border-green-500 dark:hover:border-green-500 bg-green-50 dark:bg-green-900/20 text-left transition-colors cursor-pointer"
新值: className:"w-full p-4 rounded-xl border border-slate-200 dark:border-slate-600 hover:border-emerald-400 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 text-left transition-all duration-200 hover:shadow-md cursor-pointer group"
```

**替换 8 — "创建新记录"图标容器增大**
```
旧值: className:"w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center" (创建按钮内的图标 div)
新值: className:"w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 flex items-center justify-center transition-colors"
```

**替换 9 — 取消按钮样式**
```
旧值: className:"w-full mt-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer",children:"取消"
新值: className:"w-full mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer text-center transition-colors",children:"取消"
```

脚本逻辑：
1. 读取 `index-BmCB11Ko.js`
2. 先备份为 `index-BmCB11Ko.js.bak2`
3. 依次执行上述 9 组替换
4. 统计成功/失败数量
5. 写回文件

- [ ] **Step 2: 运行替换脚本**

```bash
cd /Users/yq/Downloads/zhihr/review-system && python3 fix_modal_v2.py
```
预期输出：9/9 replacements applied

---

### Task 3: 功能验证与用户体验测试

**Files:**
- Test: 浏览器中验证 `review-system/index.html`

- [ ] **Step 1: 启动本地服务器并访问页面**

```bash
cd /Users/yq/Downloads/zhihr && python3 -m http.server 8082
```
访问 `http://127.0.0.1:8082/review-system/`

- [ ] **Step 2: 验证登录弹窗**

检查项：
- [ ] 登录卡片宽度固定约 420px，水平居中
- [ ] 输入框 focus 时有平滑过渡动画
- [ ] 提交按钮 hover 有上浮 + 微缩放效果
- [ ] 登录/注册 Tab 切换视觉清晰
- [ ] 暗色模式切换正常
- [ ] 无 JavaScript 控制台错误

- [ ] **Step 3: 验证重复提醒弹窗**

需要触发该弹窗的条件：同一天已有复盘记录时再次点击提交。可通过以下方式模拟或在浏览器中手动触发：
- 在浏览器 DevTools Console 中设置状态触发弹窗显示
- 或直接查看 DOM 中相关元素的 className 是否已更新

检查项：
- [ ] 弹窗宽度固定为 480px，水平居中
- [ ] 卡片圆角为 `rounded-2xl`，阴影层次感明显
- [ ] 无暖色 amber 边框，使用中性色 slate 边框
- [ ] 标题与选项区之间有分隔线
- [ ] 两个选项按钮默认中性色，hover 时显示蓝/绿色倾向
- [ ] 图标容器从 32px 增大到 40px
- [ ] 取消按钮有顶部边框分隔，居中文字
- [ ] hover 过渡动画流畅（duration-200）
- [ ] 暗色模式下颜色正确

- [ ] **Step 4: 回滚准备**

如果验证发现问题：
```bash
# 回滚 index.html
cp /Users/yq/Downloads/zhihr/review-system/index.html.bak /Users/yq/Downloads/zhihr/review-system/index.html
# 回滚 JS
cp /Users/yq/Downloads/zhihr/review-system/assets/index-BmCB11Ko.js.bak2 /Users/yq/Downloads/zhihr/review-system/assets/index-BmCB11Ko.js
```

---

## Self-Review Checklist

- [x] **Spec coverage:** 登录弹窗优化 → Task 1；重复提醒弹窗优化 → Task 2；功能验证 → Task 3
- [x] **Placeholder scan:** 所有步骤包含具体代码/命令，无 TBD/TODO
- [x] **Type consistency:** className 字符串与实际编译输出一致
- [x] **Scope check:** 仅涉及样式变更，不触碰业务逻辑
