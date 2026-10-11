import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithTheme } from "../../../test/renderWithTheme";
import { EnemyTargetActionSummary } from "../EnemyTargetActionSummary";

describe("EnemyTargetActionSummary", () => {
  it.each([
    ["enemy_1", "01", "0.5", "0.5"],
    ["enemy_2", "02", "12.5", "0.5"],
    ["enemy_3", "03", "24.5", "0.5"],
    ["enemy_4", "04", "0.5", "12.5"],
    ["enemy_5", "05", "12.5", "12.5"],
    ["enemy_6", "06", "24.5", "12.5"],
  ])("places the highlighted grid icon before %s's number", (target, number, x, y) => {
    const label = `选择敌方目标 ${Number(number)}`;
    renderWithTheme(<EnemyTargetActionSummary target={target} label={label} />);
    const outcome = screen.getByLabelText(label).querySelector(".command-row-outcome")!;
    const icon = outcome.firstElementChild!;
    expect(icon).toHaveClass("enemy-target-icon");
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon.querySelectorAll("rect")).toHaveLength(6);
    const highlighted = icon.querySelectorAll('rect[fill="currentColor"]');
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]).toHaveAttribute("x", x);
    expect(highlighted[0]).toHaveAttribute("y", y);
    expect(icon.nextElementSibling).toHaveTextContent(number);
  });

  it("keeps the unknown target placeholder without highlighting a position", () => {
    renderWithTheme(<EnemyTargetActionSummary target={null} label="未指定敌方目标" />);
    const outcome = screen.getByLabelText("未指定敌方目标").querySelector(".command-row-outcome")!;
    expect(outcome).toHaveTextContent("?");
    expect(outcome.querySelector("svg")).toBeNull();
  });
});
