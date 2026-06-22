import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { beforeEach } from "vitest";

import { EditorPage } from "./EditorPage";

describe("EditorPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows operation buttons in top toolbar and layer controls in side panel", () => {
    render(<EditorPage />);

    expect(screen.getByRole("button", { name: "Add Line" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Rect" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Polygon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Selected" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Selected" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Layer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Selected Layer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select default layer" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Quick zoom" })).toBeInTheDocument();
  });

  it("toggles default layer visibility from panel", () => {
    render(<EditorPage />);

    const defaultVisibilityButton = screen.getByRole("button", { name: "Hide default" });

    fireEvent.click(defaultVisibilityButton);

    expect(screen.getByRole("button", { name: "Show default" })).toBeInTheDocument();
  });

  it("changes zoom by selecting quick zoom option", () => {
    render(<EditorPage />);

    fireEvent.change(screen.getByRole("combobox", { name: "Quick zoom" }), {
      target: { value: "0.5" },
    });

    expect(screen.getByText(/zoom:\s*0\.50x/i)).toBeInTheDocument();
  });

  it("shows read-only area and keeps vertices collapsed by default", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add Polygon" }));

    expect(screen.getByText("Area (read-only)")).toBeInTheDocument();
    expect(screen.getByText(/mm²\s*\/\s*[0-9.]+\s*m²/i)).toBeInTheDocument();
    expect(screen.queryByDisplayValue("120")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Vertices" }));

    expect(screen.getAllByDisplayValue("120").length).toBeGreaterThan(0);
  });

  it("shows '-' in properties panel when no item selected", () => {
    render(<EditorPage />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("copies selected shape", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add Rect" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy Selected" }));

    expect(screen.getByText(/rect\s·\sitem-2/i)).toBeInTheDocument();
  });

  it("supports entering rotation angle for selected shape", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add Rect" }));

    const angleInput = screen.getByRole("spinbutton", {
      name: "Rotation angle",
    });
    fireEvent.change(angleInput, { target: { value: "30" } });

    expect((angleInput as HTMLInputElement).value).toBe("30");
  });

  it("supports quick +90° rotation action", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add Rect" }));
    fireEvent.click(screen.getByRole("button", { name: "+90°" }));

    const angleInput = screen.getByRole("spinbutton", { name: "Rotation angle" });
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
            kind: "polygon",
            layerId: "layer-default",
            points: [
              { xMm: 120, yMm: 120 },
              { xMm: 260, yMm: 120 },
              { xMm: 220, yMm: 240 },
            ],
          },
        ],
        zoomLevel: 0.5,
      }),
    );

    render(<EditorPage />);

    expect(screen.getByText(/polygon\s·\sitem-1/i)).toBeInTheDocument();
    expect(screen.getByText(/zoom:\s*0\.50x/i)).toBeInTheDocument();
  });
});
