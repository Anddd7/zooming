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
    expect(screen.getByRole("button", { name: "Budget" })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: /Material & Pricing/i }));

    expect(screen.getByText(/Estimate/i)).toBeInTheDocument();
    expect(screen.getByText(/mm²\s*\/\s*[0-9.]+\s*m²/i)).toBeInTheDocument();
    expect(screen.queryByDisplayValue("120")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Position/i }));

    expect(screen.getAllByDisplayValue("120").length).toBeGreaterThan(0);
  });

  it("shows '-' in properties panel when no item selected", () => {
    render(<EditorPage />);

    expect(screen.getByText("Properties")).toBeInTheDocument();
  });

  it("copies selected shape", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add Rect" }));
    fireEvent.click(screen.getByRole("button", { name: "Copy Selected" }));

    expect(screen.getByText("item-2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "item-2" }));
    expect(screen.getByRole("textbox", { name: "Item Title" })).toHaveValue("item-2");
  });

  it("supports entering rotation angle for selected shape", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add Rect" }));
    fireEvent.click(screen.getByRole("button", { name: /Position/i }));

    const angleInput = screen.getByRole("spinbutton", {
      name: "Rotation angle",
    });
    fireEvent.change(angleInput, { target: { value: "30" } });

    expect((angleInput as HTMLInputElement).value).toBe("30");
  });

  it("supports quick +90° rotation action", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add Rect" }));
    fireEvent.click(screen.getByRole("button", { name: /Position/i }));
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

    fireEvent.click(screen.getByRole("button", { name: "Add Rect" }));

    fireEvent.click(screen.getByRole("button", { name: "item-1" }));

    const titleInput = screen.getByRole("textbox", { name: "Item Title" });
    fireEvent.change(titleInput, { target: { value: "Sofa" } });
    fireEvent.keyDown(titleInput, { key: "Enter" });

    expect(screen.getByText("Sofa")).toBeInTheDocument();
  });

  it("opens budget modal and shows estimation details table", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add Rect" }));
    fireEvent.click(screen.getByRole("button", { name: "Budget" }));

    expect(screen.getByText("Estimation / Budget")).toBeInTheDocument();
    expect(screen.getByText("Estimation Details")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "item" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "material" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "price" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "quality" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "total" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close Budget" }));

    expect(screen.queryByText("Estimation / Budget")).not.toBeInTheDocument();
  });
});
