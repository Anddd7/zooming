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

  it("supports quick zoom selection", () => {
    render(<CanvasEditor />);

    const zoomSelect = screen.getByRole("combobox", { name: "Quick zoom" });
    fireEvent.change(zoomSelect, { target: { value: "0.50" } });

    expect(screen.getByText(/zoom:\s*0\.50x/i)).toBeInTheDocument();
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
    expect(onMoveSelectedBy).toHaveBeenCalledWith({ xMm: 20, yMm: 30 });
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
    expect(onMoveSelectedBy).toHaveBeenCalledWith({ xMm: 40, yMm: 60 });
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
});
