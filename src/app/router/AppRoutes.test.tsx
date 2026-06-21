import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AppRoutes } from "./AppRoutes";

describe("AppRoutes", () => {
  it("renders dashboard page on /dashboard", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Project Dashboard" })).toBeInTheDocument();
  });

  it("renders editor page with canvas host on /editor", () => {
    render(
      <MemoryRouter initialEntries={["/editor"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByTestId("editor-canvas")).toBeInTheDocument();
  });
});
