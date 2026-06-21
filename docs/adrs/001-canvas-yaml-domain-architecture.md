# ADR-001: Canvas + YAML + Domain Architecture

## Status

Accepted

## Context

本项目需要同时支持：

- 2D 俯视图绘制
- 多图层编辑
- 物品几何与业务属性绑定
- 成本估算与任务追踪
- 当前本地文件存储，未来可迁移数据库

如果直接以页面组件为中心开发，容易出现以下问题：

- 绘图逻辑、业务规则、持久化格式耦合
- YAML 结构直接渗透到 UI
- 后续切换数据库成本高
- Canvas 交互代码和成本/任务逻辑混杂

## Decision

采用以下架构决策：

1. **渲染层使用 Canvas 2D 作为主绘图技术**
2. **领域模型采用点/线/面统一抽象，并在其上承载业务对象**
3. **存储层当前使用 YAML 文件，但通过 repository 接口隔离**
4. **应用采用分层架构：UI / Application / Domain / Infrastructure / Engine**

## Rationale

### 1. Why Canvas

Canvas 更适合：

- 大量图元绘制
- 缩放、平移、拖拽等连续交互
- 后续复杂场景下的性能控制

相比纯 SVG / DOM：

- 更适合中大型图元场景
- 更利于自行实现场景图、命中检测与分层渲染

### 2. Why Unified Geometry Model

虽然业务对象类型很多，但基础几何能力可以抽象为：

- Point
- Polyline
- Polygon
- Rect

这样可以统一：

- 选择与命中
- 测量（长度/面积/周长）
- 样式渲染
- 吸附逻辑

然后在领域层再表达：

- 管线 = 线性对象
- 瓷砖区 = 平面对象
- 家具 = 平面占位对象
- 墙纸/墙漆 = 非平面属性对象

### 3. Why YAML with Repository Abstraction

当前使用 YAML 的原因：

- 人类可读
- 便于调试和手工修订
- 易于样例项目管理
- 适合无后端 MVP

但 YAML 不应成为系统内部契约，因此采用：

- `ProjectRepository`
- `ItemRepository`（可选）
- `TaskRepository`（可选）

先由 `YamlProjectRepository` 实现，未来可新增：

- `SqlProjectRepository`
- `RemoteProjectRepository`

### 4. Why Layered Architecture

为控制复杂度，职责按层分离：

- **UI Layer**：页面、面板、表格、交互反馈
- **Application Layer**：用例编排，如创建项目、添加物品、计算报价
- **Domain Layer**：核心模型和业务规则
- **Infrastructure Layer**：YAML 序列化、导入导出、存储适配
- **Engine Layer**：Canvas 渲染、视口、吸附、命中检测

## Consequences

### Positive

- 便于数据库迁移
- 绘图引擎与业务逻辑边界清晰
- 测试更容易聚焦在规则层
- YAML 可作为交换格式而不是系统内核

### Negative

- 初期工程结构会比“页面直写”更重
- 需要维护领域模型与存储 DTO 的映射
- Canvas 命中检测与交互需要自行实现更多基础设施

## Implementation Guidance

### Recommended Frontend Stack

- React
- TypeScript
- Vite
- Zustand
- Zod
- Canvas 2D API
- YAML parser (`yaml`)

### Suggested Module Boundaries

- `domains/project`
- `domains/drawing`
- `domains/layer`
- `domains/item`
- `domains/estimate`
- `domains/task`
- `engine/canvas`
- `infrastructure/storage/yaml`

### Repository Rule

禁止：

- 组件直接拼装 YAML
- 页面直接读写导出文件结构

要求：

- UI 只能操作应用层接口或 store action
- 存储格式由 infrastructure 层独立负责

## Rejected Alternatives

### Alternative A: 直接用 SVG + React State 驱动全部图元

不选原因：

- 图元多时性能和交互复杂度上升明显
- 后续命中、吸附和批量渲染控制不如 Canvas 灵活

### Alternative B: 直接以 YAML 结构作为前端状态

不选原因：

- 后续迁移数据库代价高
- 前端状态会被存储格式绑死
- 难以维护领域不变量

### Alternative C: 一开始就引入数据库/后端

不选原因：

- 超出当前范围
- MVP 价值验证优先于后端建设

## Verification

- 能从领域模型导出 YAML，再从 YAML 恢复领域模型
- 更换 repository 实现时，UI 和应用层无需大改
- 编辑器、成本、任务模块均不直接依赖 YAML 文件结构
