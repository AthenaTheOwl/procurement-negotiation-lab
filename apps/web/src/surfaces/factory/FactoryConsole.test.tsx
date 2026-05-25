import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { FactoryConsole } from "./FactoryConsole";

afterEach(() => cleanup());

describe("FactoryConsole", () => {
  it("renders task state, checkpoint state, artifacts, and run report summary", () => {
    render(<FactoryConsole />);

    expect(screen.getByTestId("factory-console")).toBeTruthy();
    expect(screen.getByTestId("factory-task-state").textContent).toContain(
      "example-with-checkpoint",
    );
    expect(screen.getByTestId("factory-checkpoint-state").textContent).toContain(
      "plan review",
    );
    expect(screen.getByTestId("factory-artifacts").textContent).toContain(
      "0-plan.txt",
    );
    expect(screen.getByTestId("factory-run-report").textContent).toContain(
      "substrate-crunch",
    );
  });

  it("links to the replay report with encoded JSON", () => {
    render(<FactoryConsole />);

    const link = screen.getByRole("link", { name: /open replay report/i });
    expect(link.getAttribute("href")).toContain("/?json=");
  });
});
