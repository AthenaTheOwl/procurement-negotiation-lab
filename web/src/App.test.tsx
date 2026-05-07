import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  it("opens with the player role and the procurement job", () => {
    render(<App />);
    expect(screen.getByText(/you are the buyer/i)).toBeInTheDocument();
    expect(screen.getByText(/cinder lithography services/i)).toBeInTheDocument();
    expect(screen.getByText(/reserve enough long-lead capacity/i)).toBeInTheDocument();
  });

  it("reveals consequences before showing the next week", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /choose this move/i })[1]);
    expect(screen.getByTestId("consequence-reveal")).toBeInTheDocument();
    expect(screen.getByText(/cinder's response/i)).toBeInTheDocument();
    expect(screen.queryByText(/week 3 of 12/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continue to the next week/i }));
    expect(screen.getByText(/Week 3 of 12/i)).toBeInTheDocument();
  });

  it("renders lab explanations and algorithm comparison", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /lab arena/i })[0]);
    expect(screen.getByTestId("lab-surface")).toBeInTheDocument();
    expect(screen.getByText(/does ADMM actually beat simpler rules/i)).toBeInTheDocument();
    expect(screen.getAllByText(/centralized oracle/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/alternating best response/i).length).toBeGreaterThan(0);
  });

  it("renders tutorial definitions for technical terms", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /^tutorial$/i })[0]);
    expect(screen.getByTestId("study-surface")).toBeInTheDocument();
    expect(screen.getByText(/utility is a dollar-like score/i)).toBeInTheDocument();
    expect(screen.getByText(/residual is the gap/i)).toBeInTheDocument();
    expect(screen.getByText(/risk score is a teaching knob/i)).toBeInTheDocument();
  });
});
