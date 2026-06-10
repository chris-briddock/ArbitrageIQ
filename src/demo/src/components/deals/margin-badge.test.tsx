import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarginBadge } from "./margin-badge";

describe("MarginBadge", () => {
  it("renders the margin with one decimal place", () => {
    render(<MarginBadge netMarginPct="34.23" />);
    expect(screen.getByText("34.2%")).toBeInTheDocument();
  });

  it("uses the positive tone at or above 20%", () => {
    render(<MarginBadge netMarginPct="20.0" />);
    const badge = screen.getByText("20.0%");
    expect(badge).toHaveClass("text-emerald-700");
    expect(badge).toHaveClass("dark:text-emerald-300");
  });

  it("uses the caution tone below 20%", () => {
    render(<MarginBadge netMarginPct="19.4" />);
    const badge = screen.getByText("19.4%");
    expect(badge).toHaveClass("text-amber-700");
    expect(badge).toHaveClass("dark:text-amber-300");
  });
});
