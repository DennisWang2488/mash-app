import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ObservatoryBackground } from "../ObservatoryBackground";

const flags = vi.hoisted(() => ({ tiltedStarOrbitsBackground: true }));
vi.mock("../../../featureToggles", () => ({ featureToggles: flags }));

afterEach(() => { flags.tiltedStarOrbitsBackground = true; });

describe("ObservatoryBackground", () => {
  it("preserves Home's background while enabling tilted star orbits on other pages", () => {
    const { container, rerender } = render(<ObservatoryBackground composition="home" />);
    expect(container.firstChild).toHaveAttribute("data-composition", "home");
    rerender(<ObservatoryBackground density="minimal" />);
    expect(container.firstChild).toHaveAttribute("data-composition", "tilted-star-orbits");
    expect(container.firstChild).toHaveAttribute("data-density", "minimal");
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("restores page-specific compositions when disabled", () => {
    flags.tiltedStarOrbitsBackground = false;
    const { container, rerender } = render(<ObservatoryBackground composition="home" />);
    expect(container.firstChild).toHaveAttribute("data-composition", "home");
    rerender(<ObservatoryBackground />);
    expect(container.firstChild).toHaveAttribute("data-composition", "observatory");
  });
});
