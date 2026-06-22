import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EditorPage } from "./EditorPage";

describe("EditorPage", () => {
  it("shows operation buttons in top toolbar and layer controls in side panel", () => {
    render(<EditorPage />);

    expect(screen.getByRole("button", { name: "Add Line" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Rect" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Polygon" })).toBeInTheDocument();
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
});
