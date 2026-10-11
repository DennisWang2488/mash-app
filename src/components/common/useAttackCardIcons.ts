import { useEffect, useState } from "react";
import { invoke } from "../../tauri";

// Indices follow get_attack_card_icon_paths: 宝具、红卡、蓝卡、绿卡、任意.
export function useAttackCardIcons() {
  const [icons, setIcons] = useState<{ path: string | null; name: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    invoke<typeof icons>("get_attack_card_icon_paths")
      .then(entries => { if (!cancelled) setIcons(entries ?? []); })
      .catch(() => { if (!cancelled) setIcons([]); });
    return () => { cancelled = true; };
  }, []);
  return icons;
}
