# 001 - Indoor Design Tool MVP Plan

## Status

Proposed

## Progress Snapshot

- [x] MVP 范围、里程碑、验收标准已定义
- [x] 核心架构决策已沉淀到 ADR
- [x] 设计系统与主题生成流程已确定
- [x] MVP 运行模式、建模边界、编辑器最小闭环已澄清
- [x] 初始化 React/Vite/TypeScript 项目骨架
- [x] 路由、基础布局、主题接入（Milestone 1）
- [x] 领域模型与 repository 接口基线（Milestone 1）
- [x] 落地 Canvas 编辑器基础能力
- [x] Canvas 真正渲染层 + 网格 + 基础 pan/zoom（Milestone 2 slice 1）
- [x] 图层切换 + 线/矩形/多边形基础编辑（Milestone 2 slice 2）
- [x] 图层面板 + 本地持久化 + 顶点/旋转编辑闭环（Milestone 2 interaction hardening）
- [x] 落地工程量/成本/任务联动（Milestone 3 slice: pricing modes + measure/cost summary + budget compare + properties panel collapse）
- [ ] 落地 YAML 导入导出与素材库/标准素材

## Related ADRs

- [ADR-001](../adrs/001-canvas-yaml-domain-architecture.md): Canvas + YAML + Domain Architecture
- [ADR-002](../adrs/002-design-system-and-theme-pipeline.md): Design System and Theme Pipeline

## Background

本项目是一个面向室内设计/装修管理场景的前端应用，核心目标不是纯绘图，而是把以下能力统一在一个项目上下文中：

- 2D 俯视图绘制（单位：mm）
- 多图层管理（户型图、基装、硬装、软装、家具、自定义图层）
- 点/线/面统一建模
- 家具/材料/施工项属性管理
- 工程量与成本估算
- 任务、子任务、进度记录与预算联动
- 当前使用 YAML 文件存储，后续可迁移到数据库

## Product Goal

交付一个可运行的 React 浏览器应用，使用户可以：

1. 创建项目并维护基础预算信息
2. 在 Canvas 中绘制 2D 户型和设计图层
3. 为物品绑定尺寸、属性和价格规则
4. 按图层/房间/类别汇总成本
5. 创建任务和子任务，关联图层、房间、物品并跟踪进度

## Scope

### In Scope (MVP)

- React + TypeScript 单页应用
- Canvas 2D 编辑器基础能力
- mm 世界坐标系统
- 项目创建/加载/导入/导出
- YAML 文件导入导出
- 自定义图层的增删改、排序、显隐、锁定
- 基础图元与对象：
  - 线性对象：管线、踢脚线等（直线/折线）
  - 平面对象：瓷砖区域、地面区域、家具矩形占位
  - 非平面对象：墙纸/墙漆等作为属性型对象挂靠房间或墙面
- 物品尺寸/面积/体积/价格属性
- 成本计算：固定价、按长度、按面积、按体积
- 按图层/房间/类别筛选物品和汇总成本
- 任务/子任务、状态、进度、预算对比
- 基于 Apple design.md 风格的 UI 主题接入流程
- Tailwind CSS + shadcn 风格无头组件接入

### Out of Scope (当前不做)

- 多人协作/实时协同
- 服务端 API / 用户系统
- 数据库存储实现
- File System Access API / 自动写回本地文件
- 桌面壳（Tauri/Electron）
- 精确级瓷砖排版与切割优化算法
- 3D 建模/渲染
- 自动识别 CAD / 图像户型
- 墙体厚度模型、门窗语义、自动拓扑推导
- 施工下单级算量
- 高级编辑体验（多选、Undo/Redo、复杂对齐线、富旋转交互）
- 复杂施工排程（关键路径、资源负载）

## Explicit Assumptions

- 假设：MVP 先以“浏览器内编辑 + 手动导入导出 YAML 文件”为主，不依赖本地原生文件系统持续写回。（置信度：中）
- 假设：瓷砖类对象一期先做“覆盖面积 + 规格 + 损耗率”估算，不做精确切砖求解。（置信度：高）
- 假设：墙纸/墙漆/吊顶等非平面对象一期以属性记录与成本计算为主，不要求在平面图中完整几何表达。（置信度：高）

## Confirmed MVP Decisions

### 1. Runtime Model

- MVP 运行在浏览器中
- 用户通过“导入 YAML / 导出 YAML”完成持久化
- 不做自动写回本地文件
- 不引入 File System Access API 或桌面壳作为一期前提

### 2. Floor Plan Modeling Boundary

- 采用轻量户型边界模型
- 支持边界线、房间轮廓、房间命名
- Room 由用户显式定义，不从墙体拓扑自动推导
- 不做墙体厚度、门窗语义、自动闭合拓扑推导

### 3. Item Capability Boundary

- `linear`: 支持折线绘制与长度计算
- `surface`: 支持区域定义与面积计算
- `furniture`: 支持矩形占位、拖拽、旋转、吸附
- `verticalSurface`: 支持属性记录、挂靠关系、成本计算

### 4. Estimate Precision Boundary

- 一期成本系统定位为估算级核算
- 服务于预算判断、方案比较与任务成本跟踪
- 不承诺施工下单级精度

### 5. Task Model Boundary

- 任务是独立施工工作项
- 房间、图层、物品是任务的关联上下文与筛选维度
- 不以房间树或物品树作为任务主轴

### 6. Editor Interaction Boundary

- 一期编辑器以最小可用交互闭环为目标
- 支持画布导航、图层切换、基础对象创建、对象选择与移动、基础吸附、删除
- 高级编辑体验不进入一期验收标准

## User Roles

- 设计师：绘制户型、摆放家具、配置材料和主题
- 项目负责人：看预算、看进度、管理任务
- 装修执行者：按任务查看房间/图层/物品要求

## Core User Flows

### 1. 创建项目

用户创建项目，输入名称、预算、单位、风格主题，进入编辑器。

### 2. 绘制户型

用户在户型图层上绘制墙体边界、房间轮廓，并命名房间。

### 3. 逐层设计

用户切换到不同图层，添加管线、瓷砖区域、家具等对象，并调整位置、尺寸、旋转和样式。

### 4. 录入材料与价格

用户为对象选择材料或填写计价规则，系统自动更新工程量和成本。

### 5. 创建施工任务

用户创建任务/子任务，关联到图层、房间或物品，并维护状态与进度。

### 6. 查看总览

用户在统计/任务页查看预算、已估算成本、超支情况、任务完成度。

## Functional Modules

### 1. Project Management

- 创建、编辑、导入、导出项目
- 维护预算、主题、基础设置

### 2. Drawing Editor

- Canvas 画布
- 缩放、平移、网格、标尺
- 选择、拖拽、删除
- 基础吸附：网格、顶点、边缘
- 最小对象工具：polyline、polygon/rect、furniture rect

### 3. Layer Management

- 自定义图层
- 排序、显隐、锁定、透明度

### 4. Room Management

- 定义房间
- 物品归属房间
- 按房间汇总面积与成本

### 5. Item & Material Management

- 点线面/元对象统一抽象
- 绑定尺寸、几何、样式、材料、价格规则

### 6. Estimate & Budget

- 工程量计算
- 多种计价模式
- 预算对比与超支提示

### 7. Task Tracking

- 任务、子任务
- 关联图层/房间/物品
- 进度、状态、预计成本、实际成本

### 8. Theme Preview

- 主题色预览
- 类别默认样式映射

## Information Architecture

建议主导航：

1. 项目总览
2. 户型图编辑
3. 图层管理
4. 物品清单
5. 材料与报价
6. 成本统计
7. 任务追踪
8. 项目设置

## MVP Domain Model

### Core Aggregates

- Project
- FloorPlan
- Layer
- Room
- Item
- Material
- Task

### Item Kinds

- `linear`: 管线、踢脚线
- `surface`: 瓷砖区域、地板、地毯
- `furniture`: 家具俯视占位
- `verticalSurface`: 墙纸、墙漆、吊顶等属性对象

### Pricing Modes

- `fixed`
- `perLength`
- `perArea`
- `perVolume`

## Non-Functional Requirements

- 绘图单位统一为 mm
- YAML 可读、可导出、可回放
- 领域模型与存储结构解耦，便于未来迁移数据库
- 编辑器操作响应流畅，适配中等复杂度户型与图层
- 基础测试覆盖核心规则：坐标转换、工程量计算、价格计算、YAML 序列化

## Milestones

### Milestone 1 - Project Skeleton

- React/Vite/TypeScript 初始化
- 路由、基础布局、主题接入
- 领域模型与 repository 接口

### Milestone 2 - Canvas Editor Foundation

- App 主体嵌入可编辑 Canvas 主区（editor host）
- 画布、视口、网格、坐标转换
- 图层切换
- 线/矩形/多边形基础编辑

### Milestone 3 - Item/Cost Integration

- 物品属性面板
- 材料与价格规则
- 工程量与成本计算

### Milestone 4 - Task & Dashboard

- 任务/子任务
- 成本汇总
- 进度追踪与预算对比

### Milestone 5 - YAML Persistence

- 项目导入/导出
- 存储格式稳定化
- 素材库与标准素材（可收藏当前对象并复用插入）

## Acceptance Criteria

### Editing

- 可以创建项目并打开编辑器
- App 主体已嵌入 Canvas 编辑主区（后续交互能力在该区域演进）
- 可以新增多个图层并控制显隐/锁定
- 可以在画布中新增 `linear`、`surface`、`furniture` 三类可编辑对象
- `verticalSurface` 可被创建并参与属性/成本系统
- 支持平移、缩放、选择、拖拽、删除、基础吸附

### Data

- 项目可导出为 YAML
- YAML 可重新导入并恢复主要数据
- UI 不直接依赖 YAML 结构
- 导入/导出是一期唯一持久化路径

### Estimate

- 能按图层/房间/类别查看工程量与成本汇总
- 能看到项目预算、当前估算与是否超预算

### Task

- 能创建任务和子任务
- 能将任务关联到图层/房间/物品
- 能查看任务状态与整体进度

### UI

- 使用 Apple design.md 作为设计原语来源
- 通过 design.md 导出的 Tailwind CSS 主题可在应用中生效

## Risks and Mitigations

| 风险 | 说明 | 缓解策略 |
|---|---|---|
| 绘图引擎复杂度膨胀 | 命中、吸附、旋转、缩放容易耦合 | 先做最小交互闭环，渲染/交互/领域分层 |
| YAML 结构早期失控 | UI 直接读写 YAML 会导致后期难迁移 | 强制 repository abstraction |
| 估算规则过早追求精确 | 瓷砖排版和裁剪求解复杂 | 一期先做面积+损耗率 |
| 任务与图纸关系混乱 | 关联范围多 | 用显式关联表与筛选视图 |

## Verification Plan

- 单元测试：
  - 坐标转换
  - 工程量计算
  - 价格规则计算
  - YAML 反序列化/序列化
- 集成测试：
  - 创建项目 → 添加图层 → 添加物品 → 计算成本 → 导出 YAML
- E2E：
  - 编辑器基础操作
  - 任务与预算总览联动

## Parallel Execution Breakdown

### Track 0 - Spec & Skeleton Baseline

- 更新计划、术语与 ADR 对齐
- 初始化 React/Vite/TypeScript 项目骨架
- 建立目录结构与基础 store/repository interfaces

### Track 1 - Domain & YAML

- 定义 `Project / Layer / Room / Item / Task / Estimate` 模型
- 定义 item kind、pricing mode、关系模型
- 定义 YAML DTO、mapper、样例项目

### Track 2 - Canvas Engine

- 实现 viewport、网格、world(mm) ↔ screen(px)
- 实现 polyline/polygon/rect primitive
- 实现 hit test、selection、drag、grid/vertex snap

### Track 3 - Editor UI Shell

- 实现 editor 页面布局、工具栏、图层面板、属性面板
- 装配图层控制与对象创建流程

### Track 4 - Estimate & Budget

- 实现 measurement、pricing、waste rate、aggregation query
- 实现预算对比与超支状态

### Track 5 - Task & Progress

- 实现任务/子任务模型、关联关系、任务页与进度摘要

### Track 6 - Theme System

- 接入 Tailwind CSS + shadcn 风格无头组件
- 接入 `DESIGN.md -> src/styles/theme.css`
- 建 semantic token / domain token 映射

## Recommended Delivery Order

1. Track 0 + Track 1 基础模型
2. Track 6 主题接入最小闭环
3. Track 2 + Track 3 打通编辑器闭环
4. Track 4 + Track 5 打通业务价值闭环
5. YAML round-trip、素材库/标准素材、E2E smoke 验收

## Follow-up Documents

- ADR-001: Canvas + YAML + Domain Architecture
- ADR-002: Design System and Theme Pipeline
