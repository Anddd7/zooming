# Indoor Design Tool

本上下文描述一个面向室内设计与装修管理的项目空间：用户在同一个项目里组织户型、图层、物品、成本估算与施工任务。

## Language

**Project**:
用户管理的顶层工作单元，承载一个设计/装修方案及其预算、图纸、物品、任务与统计结果。
_Avoid_: File, workspace

**Room**:
项目中的一个命名空间区域，用于归属物品、汇总成本，并作为任务筛选维度。
_Avoid_: Zone, area block

**Layer**:
项目图纸中的一个可独立显示、排序和锁定的设计分组，用于表达户型、基装、硬装、软装、家具等视图切面。
_Avoid_: Tab, page

**Item**:
项目中的一个被建模对象，表示可计量、可定价、可归属到图层或房间的设计/施工实体。
_Avoid_: Shape, asset

**Primitive**:
编辑器中的底层可绘制几何对象（polyline / rect / polygon），作为 Item 的几何承载形式。
_Avoid_: Widget, sprite

**Vertex**:
几何对象上的可编辑控制点，可通过属性面板输入或画布拖拽直接调整位置。
_Avoid_: Anchor handle, node dot

**Task**:
一个独立施工工作项，可关联房间、图层和物品，并用于跟踪状态、进度与成本。
_Avoid_: Ticket, checklist item

**Estimate**:
面向预算判断和方案比较的成本核算结果，不承诺施工下单级精度。
_Avoid_: Quote, final bill
