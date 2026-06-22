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

  it("supports pointer drag panning on the canvas", () => {
    render(<CanvasEditor />);

    const canvas = screen.getByTestId("editor-canvas-surface");
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100, button: 0 });
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
        selectedItemId={"item-1"}
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
});
