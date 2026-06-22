import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CanvasEditor } from "./CanvasEditor";

describe("CanvasEditor", () => {
  it("renders an actual canvas element", () => {
    render(<CanvasEditor />);

    expect(screen.getByTestId("editor-canvas-surface")).toBeInTheDocument();
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
});
