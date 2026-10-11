import { featureToggles } from "../../featureToggles";

/** Shared, non-interactive Penpot background. Theme colors come from CSS tokens. */
export function ObservatoryBackground({
  composition = "observatory",
  density = "observatory",
}: {
  composition?: "observatory" | "home";
  density?: "minimal" | "observatory";
}) {
  const activeComposition = composition !== "home" && featureToggles.tiltedStarOrbitsBackground
    ? "tilted-star-orbits"
    : composition;

  return (
    <div className="observatory-background" data-composition={activeComposition}
      data-density={density} aria-hidden="true">
      <div className="observatory-background-ambient" />
      <div className="observatory-background-grid" />
      <div className="observatory-background-lines" />
      <div className="observatory-background-nodes" />
      <div className="observatory-background-fade" />
    </div>
  );
}
