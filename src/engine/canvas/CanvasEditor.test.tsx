import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";

import { CanvasEditor } from "./CanvasEditor";

describe("CanvasEditor", () => {
  it("renders an actual canvas element", () => {
    render(<CanvasEditor />);

    const canvas = screen.getByTestId("editor-canvas-surface");

    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass("touch-none");
  });

  it("supports middle-button drag panning on the canvas", () => {
    render(<CanvasEditor />);

    const canvas = screen.getByTestId("editor-canvas-surface");
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100, button: 1 });
    fireEvent.mouseMove(canvas, { clientX: 130, clientY: 120 });
    fireEvent.mouseUp(canvas, { clientX: 130, clientY: 120 });

    expect(screen.getByText(/pan:\s*30,\s*20/i)).toBeInTheDocument();
  });

  it("supports wheel zoom in and zoom out", () => {
    render(<CanvasEditor />);

    const canvas = screen.getByTestId("editor-canvas-surface");
    fireEvent.wheel(canvas, { deltaY: -100 });
    fireEvent.wheel(canvas, { deltaY: 100 });

    expect(screen.getByText(/zoom:\s*1\.00x/i)).toBeInTheDocument();
  });

  it("clamps wheel zoom out to 0.01x minimum", () => {
    render(<CanvasEditor />);

    const canvas = screen.getByTestId("editor-canvas-surface");
    for (let i = 0; i < 20; i += 1) {
      fireEvent.wheel(canvas, { deltaY: 100 });
    }

    expect(screen.getByText(/zoom:\s*0\.01x/i)).toBeInTheDocument();
  });

  it("selects primitive on canvas click and drags selected primitive", () => {
    const onSelectItem = vi.fn();
    const onMoveSelectedBy = vi.fn();

    render(
      <CanvasEditor
        layers={[
          {
            id: "layer-floorplan",
            name: "Floor Plan",
            category: "floorplan",
            zIndex: 0,
            visible: true,
            locked: false,
            opacity: 1,
          },
        ]}
        items={[
          {
            id: "item-1",
            kind: "rect",
            layerId: "layer-floorplan",
            points: [
              { xMm: 100, yMm: 100 },
              { xMm: 300, yMm: 100 },
              { xMm: 300, yMm: 260 },
              { xMm: 100, yMm: 260 },
            ],
          },
        ]}
        selectedItemIds={["item-1"]}
        onSelectItem={onSelectItem}
        onMoveSelectedBy={onMoveSelectedBy}
      />,
    );

    const canvas = screen.getByTestId("editor-canvas-surface");
    fireEvent.mouseDown(canvas, { clientX: 120, clientY: 120, button: 0 });
    fireEvent.mouseMove(canvas, { clientX: 140, clientY: 150 });
    fireEvent.mouseUp(canvas, { clientX: 140, clientY: 150 });

    expect(onSelectItem).toHaveBeenCalledWith("item-1");
    expect(onMoveSelectedBy).toHaveBeenCalledWith({ xMm: 40, yMm: 60 });
  });

  it("maps pointer coordinates with canvas CSS scaling", () => {
    const onSelectItem = vi.fn();
    const onMoveSelectedBy = vi.fn();

    render(
      <CanvasEditor
        layers={[
          {
            id: "layer-floorplan",
            name: "Floor Plan",
            category: "floorplan",
            zIndex: 0,
            visible: true,
            locked: false,
            opacity: 1,
          },
        ]}
        items={[
          {
            id: "item-1",
            kind: "rect",
            layerId: "layer-floorplan",
            points: [
              { xMm: 100, yMm: 100 },
              { xMm: 300, yMm: 100 },
              { xMm: 300, yMm: 260 },
              { xMm: 100, yMm: 260 },
            ],
          },
        ]}
        selectedItemIds={["item-1"]}
        onSelectItem={onSelectItem}
        onMoveSelectedBy={onMoveSelectedBy}
      />,
    );

    const canvas = screen.getByTestId("editor-canvas-surface") as HTMLCanvasElement;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      width: 480,
      height: 240,
      top: 0,
      right: 480,
      bottom: 240,
      left: 0,
      toJSON: () => ({}),
    });

    fireEvent.mouseDown(canvas, { clientX: 60, clientY: 60, button: 0 });
    fireEvent.mouseMove(canvas, { clientX: 80, clientY: 90 });
    fireEvent.mouseUp(canvas, { clientX: 80, clientY: 90 });

    expect(onSelectItem).toHaveBeenCalledWith("item-1");
    expect(onMoveSelectedBy).toHaveBeenCalledWith({ xMm: 80, yMm: 120 });
  });

  it("box-selects primitives with left-button drag on empty space", () => {
    const onSelectItems = vi.fn();

    render(
      <CanvasEditor
        layers={[
          {
            id: "layer-floorplan",
            name: "Floor Plan",
            category: "floorplan",
            zIndex: 0,
            visible: true,
            locked: false,
            opacity: 1,
          },
        ]}
        items={[
          {
            id: "item-1",
            kind: "rect",
            layerId: "layer-floorplan",
            points: [
              { xMm: 100, yMm: 100 },
              { xMm: 300, yMm: 100 },
              { xMm: 300, yMm: 260 },
              { xMm: 100, yMm: 260 },
            ],
          },
        ]}
        onSelectItems={onSelectItems}
      />,
    );

    const canvas = screen.getByTestId("editor-canvas-surface");
    fireEvent.mouseDown(canvas, { clientX: 20, clientY: 20, button: 0 });
    fireEvent.mouseMove(canvas, { clientX: 140, clientY: 140 });
    fireEvent.mouseUp(canvas, { clientX: 140, clientY: 140 });

    expect(onSelectItems).toHaveBeenCalledWith(["item-1"]);
  });

  it("drags a selected vertex when cursor is on vertex", () => {
    const onMoveVertex = vi.fn();

    render(
      <CanvasEditor
        layers={[
          {
            id: "layer-floorplan",
            name: "Floor Plan",
            category: "floorplan",
            zIndex: 0,
            visible: true,
            locked: false,
            opacity: 1,
          },
        ]}
        items={[
          {
            id: "item-1",
            kind: "polygon",
            layerId: "layer-floorplan",
            points: [
              { xMm: 100, yMm: 100 },
              { xMm: 240, yMm: 100 },
              { xMm: 220, yMm: 200 },
            ],
          },
        ]}
        selectedItemIds={["item-1"]}
        onMoveVertex={onMoveVertex}
      />,
    );

    const canvas = screen.getByTestId("editor-canvas-surface");
    fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50, button: 0 });
    fireEvent.mouseMove(canvas, { clientX: 60, clientY: 58 });
    fireEvent.mouseUp(canvas, { clientX: 60, clientY: 58 });

    expect(onMoveVertex).toHaveBeenCalledWith(
      { itemId: "item-1", pointIndex: 0 },
      { xMm: 120, yMm: 116 },
    );
  });

  it("snaps moving selected item to 0.5m grid while shift pressed", () => {
    const onSelectItem = vi.fn();
    const onMoveSelectedBy = vi.fn();

    render(
      <CanvasEditor
        layers={[
          {
            id: "layer-floorplan",
            name: "Floor Plan",
            category: "floorplan",
            zIndex: 0,
            visible: true,
            locked: false,
            opacity: 1,
          },
        ]}
        items={[
          {
            id: "item-1",
            kind: "rect",
            layerId: "layer-floorplan",
            points: [
              { xMm: 100, yMm: 100 },
              { xMm: 300, yMm: 100 },
              { xMm: 300, yMm: 260 },
              { xMm: 100, yMm: 260 },
            ],
          },
        ]}
        selectedItemIds={["item-1"]}
        onSelectItem={onSelectItem}
        onMoveSelectedBy={onMoveSelectedBy}
      />, 
    );

    const canvas = screen.getByTestId("editor-canvas-surface");
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.mouseMove(canvas, { clientX: 260, clientY: 260, shiftKey: true });
    fireEvent.mouseUp(canvas, { clientX: 260, clientY: 260 });

    expect(onSelectItem).toHaveBeenCalledWith("item-1");
    expect(onMoveSelectedBy).toHaveBeenCalledWith({ xMm: 320, yMm: 320 });
  });

  it("snaps vertex drag to 0.5m grid while shift pressed", () => {
    const onMoveVertex = vi.fn();

    render(
      <CanvasEditor
        layers={[
          {
            id: "layer-floorplan",
            name: "Floor Plan",
            category: "floorplan",
            zIndex: 0,
            visible: true,
            locked: false,
            opacity: 1,
          },
        ]}
        items={[
          {
            id: "item-1",
            kind: "polygon",
            layerId: "layer-floorplan",
            points: [
              { xMm: 100, yMm: 100 },
              { xMm: 240, yMm: 100 },
              { xMm: 220, yMm: 200 },
            ],
          },
        ]}
        selectedItemIds={["item-1"]}
        onMoveVertex={onMoveVertex}
      />,
    );

    const canvas = screen.getByTestId("editor-canvas-surface");
    fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50, button: 0 });
    fireEvent.mouseMove(canvas, { clientX: 60, clientY: 58, shiftKey: true });
    fireEvent.mouseUp(canvas, { clientX: 60, clientY: 58 });

    expect(onMoveVertex).toHaveBeenCalledWith(
      { itemId: "item-1", pointIndex: 0 },
      { xMm: 120, yMm: 116 },
    );
  });

  it("prefers snapping to existing geometry over divider grid lines while shift pressed", () => {
    const onMoveVertex = vi.fn();

    render(
      <CanvasEditor
        layers={[
          {
            id: "layer-floorplan",
            name: "Floor Plan",
            category: "floorplan",
            zIndex: 0,
            visible: true,
            locked: false,
            opacity: 1,
          },
        ]}
        items={[
          {
            id: "item-1",
            kind: "polygon",
            layerId: "layer-floorplan",
            points: [
              { xMm: 100, yMm: 100 },
              { xMm: 240, yMm: 100 },
              { xMm: 220, yMm: 200 },
            ],
          },
          {
            id: "item-2",
            kind: "rect",
            layerId: "layer-floorplan",
            points: [
              { xMm: 492, yMm: 500 },
              { xMm: 560, yMm: 500 },
              { xMm: 560, yMm: 560 },
              { xMm: 492, yMm: 560 },
            ],
          },
        ]}
        selectedItemIds={["item-1"]}
        onMoveVertex={onMoveVertex}
      />,
    );

    const canvas = screen.getByTestId("editor-canvas-surface");
    fireEvent.mouseDown(canvas, { clientX: 50, clientY: 50, button: 0 });
    fireEvent.mouseMove(canvas, { clientX: 249, clientY: 250, shiftKey: true });
    fireEvent.mouseUp(canvas, { clientX: 249, clientY: 250 });

    expect(onMoveVertex).toHaveBeenCalledWith(
      { itemId: "item-1", pointIndex: 0 },
      { xMm: 498, yMm: 500 },
    );
  });

  it("drags hovered edge by moving both edge vertices along perpendicular direction", () => {
    const onMoveSelectedEdgeBy = vi.fn();

    render(
      <CanvasEditor
        layers={[
          {
            id: "layer-floorplan",
            name: "Floor Plan",
            category: "floorplan",
            zIndex: 0,
            visible: true,
            locked: false,
            opacity: 1,
          },
        ]}
        items={[
          {
            id: "item-1",
            kind: "rect",
            layerId: "layer-floorplan",
            points: [
              { xMm: 100, yMm: 100 },
              { xMm: 300, yMm: 100 },
              { xMm: 300, yMm: 260 },
              { xMm: 100, yMm: 260 },
            ],
          },
        ]}
        selectedItemIds={["item-1"]}
        onMoveSelectedEdgeBy={onMoveSelectedEdgeBy}
      />,
    );

    const canvas = screen.getByTestId("editor-canvas-surface");
    fireEvent.mouseDown(canvas, { clientX: 120, clientY: 50, button: 0 });
    fireEvent.mouseMove(canvas, { clientX: 120, clientY: 70 });
    fireEvent.mouseUp(canvas, { clientX: 120, clientY: 70 });

    expect(onMoveSelectedEdgeBy).toHaveBeenCalled();
    const [, delta] = onMoveSelectedEdgeBy.mock.calls[0];
    expect(Math.abs(delta.xMm)).toBeLessThan(1e-6);
    expect(Math.round(delta.yMm)).toBe(40);
  });

  it("reports viewport center in world coordinates", () => {
    const onViewportCenterChange = vi.fn();

    render(<CanvasEditor onViewportCenterChange={onViewportCenterChange} />);

    expect(onViewportCenterChange).toHaveBeenCalledWith({
      xMm: 960,
      yMm: 480,
    });
  });
});
