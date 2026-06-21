# ADR-002: Design System and Theme Pipeline

## Status

Accepted

## Context

用户已明确指定前端设计原语与主题生成方式：

- 使用 Apple 风格的 `design.md`
- 通过以下命令引入设计原语：
  - `npx getdesign@latest add apple`
- 通过以下命令导出 Tailwind CSS 主题：
  - `npx @google/design.md export --format css-tailwind DESIGN.md > src/styles/theme.css`

本项目需要一套：

- 易于统一风格
- 可版本化
- 可与 React/Tailwind 集成
- 可与 shadcn 风格无头组件组合
- 可支持“中古 / 奶油 / 现代 / 意式”等业务主题扩展

的前端设计体系。

## Decision

采用 `DESIGN.md` 作为设计原语的源文件（source of truth），并将其导出的 `theme.css` 作为应用主题样式输入。

同时约定：

1. **设计原语层** 使用 Apple design.md 基线
2. **主题产物层** 使用导出的 Tailwind CSS 变量/样式
3. **业务主题层** 在 design token 之上扩展室内设计业务配色
 4. **组件层** 采用 Tailwind CSS + shadcn 风格无头组件组织方式
 5. **组件实现** 优先消费 token/class，而不是写死颜色值

## Rationale

### Why `DESIGN.md` as Source of Truth

- 设计决策可文本化、可版本管理
- 适合 AI/工程协作
- 可追踪设计系统演进

### Why Export to Tailwind CSS

- React 前端容易接入
- 可结合组件库与自定义样式
- 保持 token 到 UI 的一致传递

### Why Tailwind + shadcn-style Headless Components

- 保持组件结构灵活，不被重型视觉组件库绑定
- 便于严格消费 `DESIGN.md -> theme.css` 生成的 token
- 更适合在表单、面板、工具栏与编辑器周边 UI 中逐步搭建一致体验

### Why Separate Product Themes from Base Design Primitives

Apple 风格提供基础视觉语言，但本产品还需要表达空间设计语义，如：

- 图层颜色
- 材料类别颜色
- 预算/超支状态色
- 任务状态色
- 风格预览主题色

因此需要把：

- 基础 UI 设计 token
- 业务语义 token

分层维护。

## Consequences

### Positive

- 前端视觉规则统一
- token 可复用到编辑器、表格、面板、看板
- 后续新增主题时影响面可控

### Negative

- 需要维护 DESIGN.md 与生成产物的一致性
- 主题调试流程比手写 CSS 多一步生成

## Implementation Guidance

### Source Files

- `DESIGN.md`: 设计原语源文件
- `src/styles/theme.css`: 由 design.md 导出的主题文件
- `src/styles/tokens.css` 或 `src/styles/semantic-theme.css`: 业务语义 token 扩展

### Commands

初始化 Apple 设计原语：

```bash
npx getdesign@latest add apple
```

导出 Tailwind CSS：

```bash
npx @google/design.md export --format css-tailwind DESIGN.md > src/styles/theme.css
```

### Theme Layering Rule

建议主题分三层：

1. **Base tokens**：来自 Apple design.md
2. **Semantic UI tokens**：按钮、边框、面板、文本、状态色
3. **Domain tokens**：图层类别色、材料类别色、装修风格预览色

### Editor-Specific Theme Rule

Canvas 内对象样式不要直接复用按钮/表单 token，而应维护单独的领域语义映射，例如：

- `layer.floorplan.stroke`
- `layer.base.fill`
- `item.furniture.fill`
- `status.overBudget.color`

这些映射可以从主题 token 派生，但不应直接散落在组件中。

## Rejected Alternatives

### Alternative A: 直接手写 Tailwind config 和 CSS

不选原因：

- 缺少统一设计源
- 难以结构化维护设计决策

### Alternative B: 完全依赖组件库默认主题

不选原因：

- 无法充分表达产品特有的空间设计语义
- 难以支持风格化预览

## Verification

- `DESIGN.md` 变更后，可稳定生成 `theme.css`
- 应用组件不直接硬编码主色值
- 至少支持一套基础主题和一套业务风格主题映射

## Notes

后续如果主题系统变复杂，可新增 ADR 记录：

- 多主题切换策略
- Canvas 主题 token 映射策略
- Design token 命名规范
