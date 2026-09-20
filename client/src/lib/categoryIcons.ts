import {
  Bike,
  Camera,
  Gamepad2,
  Laptop,
  Music,
  Navigation,
  Package,
  Projector,
  Sparkles,
  Tent,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const CATEGORY_ICONS = {
  Bike,
  Camera,
  Gamepad2,
  Laptop,
  Music,
  Navigation,
  Package,
  Projector,
  Sparkles,
  Tent,
  Wrench,
} satisfies Record<string, LucideIcon>;

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS);

export function getCategoryIcon(iconName?: string): LucideIcon {
  return CATEGORY_ICONS[iconName as keyof typeof CATEGORY_ICONS] || Package;
}
