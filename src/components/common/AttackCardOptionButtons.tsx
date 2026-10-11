import { Avatar } from "@radix-ui/themes";
import { convertFileSrc } from "../../tauri";
import { useAttackCardIcons } from "./useAttackCardIcons";

// Indices follow get_attack_card_icon_paths: 宝具、红卡、蓝卡、绿卡、任意.
export function AttackCardOptionButtons<Value extends string>({ options, label, className = "", onSelect }: {
  options: { value: Value; label: string; iconIndex: number | null }[];
  label: string;
  className?: string;
  onSelect: (value: Value) => void;
}) {
  const icons = useAttackCardIcons();

  return <div className={`battle-option-group command-skill-options ${className}`} role="group" aria-label={label}>
    {options.map(option => {
      const path = option.iconIndex == null ? null : icons[option.iconIndex]?.path;
      return <button type="button" key={option.value} className="battle-option-btn skill-icon command-skill-option"
        aria-label={option.label} title={option.label} onClick={() => onSelect(option.value)}>
        {option.iconIndex != null && <Avatar src={path ? convertFileSrc(path) : undefined} alt={option.label} fallback={option.label.slice(0, 1)} radius="small" size="3" />}
        <span className="command-skill-name">{option.label}</span>
      </button>;
    })}
  </div>;
}
