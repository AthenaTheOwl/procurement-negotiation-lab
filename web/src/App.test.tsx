import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";
import { BERGEMANN_ARTICLE_URL } from "./components/Hero";
import { labTakeaway, makeScenario } from "./model/simulation";

describe("App", () => {
  it("claims the mechanism-design field with a live dollar gap and source link", async () => {
    const user = userEvent.setup();
    const expectedGap = `$${Math.round(labTakeaway(makeScenario()).coordinationGap).toLocaleString()}`;
    render(<App />);

    expect(screen.getByText(/mechanism design/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: new RegExp(expectedGap.replace("$", "\\$")) })).toBeInTheDocument();
    const sourceLink = screen.getByRole("link", { name: /read the source article/i });
    expect(sourceLink).toHaveAttribute("href", BERGEMANN_ARTICLE_URL);
    expect(sourceLink).toHaveAttribute("target", "_blank");
    expect(sourceLink).toHaveAttribute("rel", "noreferrer");

    const heroActions = within(screen.getByTestId("hero-actions"));
    expect(heroActions.getAllByRole("button")).toHaveLength(3);
    expect(heroActions.getByRole("button", { name: /walk the arc/i })).toBeInTheDocument();

    await user.click(heroActions.getByRole("button", { name: /walk the arc/i }));
    expect(screen.getByTestId("arc-surface")).toBeInTheDocument();
  });

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

  it("walks the arc through algorithms, formula authoring, joint cases, and CBT", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(within(screen.getByTestId("hero-actions")).getByRole("button", { name: /walk the arc/i }));
    expect(screen.getByTestId("arc-step-gap")).toBeInTheDocument();
    expect(screen.getAllByText(/coordination gap/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByTestId("arc-step-privacy")).toBeInTheDocument();
    expect(screen.getByText(/utility rises, privacy exposure rises too/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByTestId("arc-step-truth")).toBeInTheDocument();
    expect(screen.getAllByText(/CPP \+ VCG\/CBT/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByTestId("arc-step-admm")).toBeInTheDocument();
    expect(screen.getByText(/residual path/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByTestId("arc-step-algorithms")).toBeInTheDocument();
    expect(screen.getAllByText(/price-only coordination/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByTestId("arc-step-author")).toBeInTheDocument();
    const formulaEditor = screen.getByLabelText(/utility formula/i);
    await user.clear(formulaEditor);
    await user.type(formulaEditor, "__import__('os')");
    expect(screen.getByText(/private\/dunder|not allowed/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByTestId("arc-step-joint-cases")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /ADMM oscillates/i }));
    expect(screen.getAllByText(/oscillating/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByTestId("arc-step-cbt")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /equal split/i }));
    expect(screen.getAllByText(/no worse off/i).length).toBeGreaterThan(0);
  });

  it("renders lab explanations and algorithm comparison", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getAllByRole("button", { name: /lab arena/i })[0]);
    expect(screen.getByTestId("lab-surface")).toBeInTheDocument();
    expect(screen.getByTestId("lab-so-what")).toBeInTheDocument();
    expect(screen.getByText(/make your own agents/i)).toBeInTheDocument();
    expect(screen.getAllByText(/coordination gap/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/centralized oracle/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CPP \+ VCG\/CBT/i).length).toBeGreaterThan(0);
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
