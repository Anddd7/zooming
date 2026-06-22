import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EditorPage } from "./EditorPage";

describe("EditorPage", () => {
  it("creates primitives from toolbar", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Add Rect" }));

    expect(screen.getByText(/items:\s*1/i)).toBeInTheDocument();
    expect(screen.getByText(/selected:\s*item-1/i)).toBeInTheDocument();
  });

  it("toggles layer visibility", () => {
    render(<EditorPage />);

    fireEvent.click(screen.getByRole("button", { name: "Hide Floor Plan" }));

    expect(screen.getByText(/floor plan \(hidden\)/i)).toBeInTheDocument();
  });
});
