import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EditorPage } from "./EditorPage";

describe("EditorPage", () => {
  it("shows operation buttons and layer toggles in floating toolbar", () => {
    render(<EditorPage />);

    expect(screen.getByRole("button", { name: "Add Line" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Rect" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Polygon" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Selected" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Floor Plan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Furniture" })).toBeInTheDocument();
  });

  it("toggles floor plan and furniture independently with selected state", () => {
    render(<EditorPage />);

    const floorPlanButton = screen.getByRole("button", { name: "Floor Plan" });
    const furnitureButton = screen.getByRole("button", { name: "Furniture" });

    expect(floorPlanButton).toHaveAttribute("aria-pressed", "true");
    expect(furnitureButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(furnitureButton);

    expect(floorPlanButton).toHaveAttribute("aria-pressed", "true");
    expect(furnitureButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(floorPlanButton);

    expect(floorPlanButton).toHaveAttribute("aria-pressed", "false");
    expect(furnitureButton).toHaveAttribute("aria-pressed", "false");
  });
});
