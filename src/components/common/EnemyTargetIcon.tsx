const POSITIONS = [
  [0.5, 0.5], [12.5, 0.5], [24.5, 0.5],
  [0.5, 12.5], [12.5, 12.5], [24.5, 12.5],
] as const;

export function EnemyTargetIcon({ target }: { target: string | null }) {
  if (!target || !/^enemy_[1-6]$/.test(target)) return null;
  const selected = Number(target.slice(-1)) - 1;

  return (
    <svg className="enemy-target-icon" width="32" height="20" viewBox="0 0 32 20"
      fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true" focusable="false">
      {POSITIONS.map(([x, y], index) => (
        <rect key={index} x={x} y={y} width="7" height="7"
          fill={index === selected ? "currentColor" : "none"}
          opacity={index === selected ? 1 : 0.35} />
      ))}
    </svg>
  );
}
