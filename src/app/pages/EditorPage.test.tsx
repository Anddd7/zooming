import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EditorPage } from "./EditorPage";

describe("EditorPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows operation buttons in top toolbar and layer controls in side panel", () => {
    render(<EditorPage />);

    expect(screen.getByRole("button", { name: "添加线段" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加矩形" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加多边形" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导入多边形" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制选中" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除选中" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "收藏" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "素材库" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "平铺" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "水平对齐" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "垂直对齐" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新增图层" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除选中图层" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "预算" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择图层 default" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "快速缩放" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "语言" })).toBeInTheDocument();
  });

  it("toggles default layer visibility from panel", () => {
    render(<EditorPage />);

    const defaultVisibilityButton = screen.getByRole("button", {
      name: "隐藏图层 default",
    });

    fireEvent.click(defaultVisibilityButton);

    expect(
      screen.getByRole("button", { name: "显示图层 default" }),
    ).toBeInTheDocument();
  });

  it("changes zoom by selecting quick zoom option", () => {
    render(<EditorPage />);

    fireEvent.change(screen.getByRole("combobox", { name: "快速缩放" }), {
      target: { value: "0.5" },
    });

    expect(screen.getByText(/zoom:\s*0\.50x/i)).toBeInTheDocument();
  });

  it("shows read-only area and keeps vertices collapsed by default", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加多边形" }));
    fireEvent.click(screen.getByRole("button", { name: /材质与计价/i }));

    expect(screen.getByText(/估算/i)).toBeInTheDocument();
    expect(screen.getByText(/mm²\s*\/\s*[0-9.]+\s*m²/i)).toBeInTheDocument();
    expect(screen.queryAllByRole("spinbutton").length).toBe(2);

    fireEvent.click(screen.getByRole("button", { name: /位置/i }));

    expect(screen.getAllByRole("spinbutton").length).toBeGreaterThan(2);
  });

  it("shows '-' in properties panel when no item selected", () => {
    render(<EditorPage />);

    expect(screen.getByText("属性")).toBeInTheDocument();
  });

  it("copies selected shape", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加矩形" }));
    fireEvent.click(screen.getByRole("button", { name: "复制选中" }));

    expect(screen.getByText("item-2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "item-2" }));
    expect(screen.getByRole("textbox", { name: "对象名称" })).toHaveValue("item-2");
  });

  it("supports entering rotation angle for selected shape", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加矩形" }));
    fireEvent.click(screen.getByRole("button", { name: /位置/i }));

    const angleInput = screen.getByRole("spinbutton", {
      name: "旋转角度",
    });
    fireEvent.change(angleInput, { target: { value: "30" } });

    expect((angleInput as HTMLInputElement).value).toBe("30");
  });

  it("shows vertex aliases and edge length editors for polygon", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加多边形" }));
    fireEvent.click(screen.getByRole("button", { name: /位置/i }));

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Edge AB" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Edge BC" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Edge CA" })).toBeInTheDocument();
  });

  it("updates polygon edge length from properties panel", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加多边形" }));
    fireEvent.click(screen.getByRole("button", { name: /位置/i }));

    const edgeAbInput = screen.getByRole("spinbutton", { name: "Edge AB" });
    fireEvent.change(edgeAbInput, { target: { value: "200" } });

    expect((edgeAbInput as HTMLInputElement).value).toBe("200");
  });

  it("supports quick +90° rotation action", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加矩形" }));
    fireEvent.click(screen.getByRole("button", { name: /位置/i }));
    fireEvent.click(screen.getByRole("button", { name: "+90°" }));

    const angleInput = screen.getByRole("spinbutton", { name: "旋转角度" });
    expect(Number((angleInput as HTMLInputElement).value)).toBeGreaterThan(80);
  });

  it("restores persisted editor snapshot from localStorage", () => {
    window.localStorage.setItem(
      "zooming.editor.snapshot.v1",
      JSON.stringify({
        selectedLayerId: "layer-default",
        selectedItemIds: ["item-1"],
        layers: [
          {
            id: "layer-default",
            name: "default",
            category: "custom",
            zIndex: 0,
            visible: true,
            locked: false,
            opacity: 1,
          },
        ],
        items: [
          {
            id: "item-1",
            name: "item-1",
            kind: "polygon",
            layerId: "layer-default",
            points: [
              { xMm: 120, yMm: 120 },
              { xMm: 260, yMm: 120 },
              { xMm: 220, yMm: 240 },
            ],
            pricing: {
              mode: "fixed",
              unitPrice: 0,
              wasteRate: 0,
              materialName: "",
            },
            tagColor: "#64748b",
          },
        ],
        projectBudget: { amount: 100000, currency: "CNY" },
        zoomLevel: 0.5,
      }),
    );

    render(<EditorPage />);

    expect(screen.getByText("item-1")).toBeInTheDocument();
    expect(screen.getByText(/zoom:\s*0\.50x/i)).toBeInTheDocument();
  });

  it("supports editing selected item alias", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加矩形" }));

    fireEvent.click(screen.getByRole("button", { name: "item-1" }));

    const titleInput = screen.getByRole("textbox", { name: "对象名称" });
    fireEvent.change(titleInput, { target: { value: "Sofa" } });
    fireEvent.keyDown(titleInput, { key: "Enter" });

    expect(screen.getByText("Sofa")).toBeInTheDocument();
  });

  it("opens budget modal and shows estimation details table", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加矩形" }));
    fireEvent.click(screen.getByRole("button", { name: "预算" }));

    expect(screen.getByText("估算 / 预算")).toBeInTheDocument();
    expect(screen.getByText("估算明细")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "项目" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "材质" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "价格" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "工程量" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "总计" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "关闭预算" }));

    expect(screen.queryByText("估算 / 预算")).not.toBeInTheDocument();
  });

  it("switches language from Chinese to English", () => {
    render(<EditorPage />);

    fireEvent.change(screen.getByRole("combobox", { name: "语言" }), {
      target: { value: "en" },
    });

    expect(screen.getByRole("button", { name: "Add Rect" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Budget" })).toBeInTheDocument();
  });

  it("supports keyboard copy and paste with ctrl+c and ctrl+v", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加矩形" }));

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    fireEvent.keyDown(window, { key: "v", ctrlKey: true });

    expect(screen.getByText("item-2")).toBeInTheDocument();
  });

  it("opens import polygons dialog from toolbar", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "导入多边形" }));

    expect(screen.getByText("导入户型多边形")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "提示词" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "多边形 JSON" })).toBeInTheDocument();
  });

  it("creates new primitive at current viewport center", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加矩形" }));
    fireEvent.click(screen.getByRole("button", { name: /位置/i }));

    expect(screen.getAllByDisplayValue("870").length).toBeGreaterThan(0);
    expect(screen.getAllByDisplayValue("420").length).toBeGreaterThan(0);
  });

  it("supports favorite and insert from asset library", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加矩形" }));
    fireEvent.click(screen.getByRole("button", { name: "收藏" }));
    fireEvent.click(screen.getByRole("button", { name: "素材库" }));
    fireEvent.click(screen.getByRole("button", { name: /收藏-item-1/i }));

    expect(screen.getByText("item-2")).toBeInTheDocument();
  });

  it("tiles selected primitive by x*y values", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加矩形" }));
    fireEvent.click(screen.getByRole("button", { name: "平铺" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "平铺 X" }), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "平铺 Y" }), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "执行平铺" }));

    expect(screen.getByText("item-4")).toBeInTheDocument();
  });

  it("copies import prompt text by one-click copy button", async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText: writeTextSpy },
      configurable: true,
    });

    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "导入多边形" }));
    fireEvent.click(screen.getByRole("button", { name: "一键复制提示词" }));

    expect(writeTextSpy).toHaveBeenCalledWith(
      "以户型图左上角为(0,0)原点，X右Y下，单位mm；按图纸标注毫米尺寸累加计算边界；识别全部房间，每个房间多边形顶点严格顺时针排序；输出仅含房间名-顶点二维数组的纯JSON，无额外内容。",
    );
  });

  it("imports polygons from json input in dialog", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "导入多边形" }));
    fireEvent.change(screen.getByRole("textbox", { name: "多边形 JSON" }), {
      target: {
        value:
          '{"卧室B":[[1992,874],[3423,874],[3423,4540],[1992,4540]],"卫生间B":[[1992,4540],[3423,4540],[3423,6859],[1992,6859]]}',
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "导入" }));

    expect(screen.getByText("卫生间B")).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it("shows alert when imported polygon json is invalid", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => undefined);

    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "导入多边形" }));
    fireEvent.change(screen.getByRole("textbox", { name: "多边形 JSON" }), {
      target: { value: "{}" },
    });
    fireEvent.click(screen.getByRole("button", { name: "导入" }));

    expect(alertSpy).toHaveBeenCalledWith("JSON 格式无效：请检查多边形数据。");
    expect(screen.getByText("属性")).toBeInTheDocument();

    alertSpy.mockRestore();
  });

  it("deletes selected item by Delete key", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加矩形" }));
    fireEvent.keyDown(window, { key: "Delete" });

    expect(screen.queryByText("item-1")).not.toBeInTheDocument();
    expect(screen.getByText("属性")).toBeInTheDocument();
  });

  it("deletes multiple selected items by Delete key", () => {
    window.localStorage.setItem(
      "zooming.editor.snapshot.v1",
      JSON.stringify({
        selectedLayerId: "layer-default",
        selectedItemIds: ["item-1", "item-2"],
        layers: [
          {
            id: "layer-default",
            name: "default",
            category: "custom",
            zIndex: 0,
            visible: true,
            locked: false,
            opacity: 1,
          },
        ],
        items: [
          {
            id: "item-1",
            name: "item-1",
            kind: "rect",
            layerId: "layer-default",
            points: [
              { xMm: 140, yMm: 140 },
              { xMm: 320, yMm: 140 },
              { xMm: 320, yMm: 260 },
              { xMm: 140, yMm: 260 },
            ],
            pricing: {
              mode: "fixed",
              unitPrice: 0,
              wasteRate: 0,
              materialName: "",
            },
            tagColor: "#64748b",
          },
          {
            id: "item-2",
            name: "item-2",
            kind: "polygon",
            layerId: "layer-default",
            points: [
              { xMm: 120, yMm: 120 },
              { xMm: 260, yMm: 120 },
              { xMm: 220, yMm: 240 },
            ],
            pricing: {
              mode: "fixed",
              unitPrice: 0,
              wasteRate: 0,
              materialName: "",
            },
            tagColor: "#64748b",
          },
        ],
        projectBudget: { amount: 100000, currency: "CNY" },
        zoomLevel: 1,
      }),
    );

    render(<EditorPage />);

    fireEvent.keyDown(window, { key: "Delete" });

    expect(screen.queryByText("item-1")).not.toBeInTheDocument();
    expect(screen.queryByText("item-2")).not.toBeInTheDocument();
    expect(screen.getByText("属性")).toBeInTheDocument();
  });

  it("undoes latest action with ctrl+z", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加矩形" }));
    expect(screen.getByText("item-1")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });

    expect(screen.queryByText("item-1")).not.toBeInTheDocument();
    expect(screen.getByText("属性")).toBeInTheDocument();
  });

  it("esc closes budget modal and clears selection", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "添加矩形" }));
    fireEvent.click(screen.getByRole("button", { name: "预算" }));

    expect(screen.getByText("估算 / 预算")).toBeInTheDocument();
    expect(screen.getAllByText("item-1").length).toBeGreaterThan(0);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByText("估算 / 预算")).not.toBeInTheDocument();
    expect(screen.queryByText("item-1")).not.toBeInTheDocument();
    expect(screen.getByText("属性")).toBeInTheDocument();
  });
});
