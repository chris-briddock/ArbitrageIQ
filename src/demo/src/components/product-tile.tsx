import {
  Bike,
  Gamepad2,
  HeartPulse,
  Home,
  MonitorSmartphone,
  Package,
  ToyBrick,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, typeof Package> = {
  Electronics: MonitorSmartphone,
  "Toys & Games": ToyBrick,
  "Home & Garden": Home,
  Gaming: Gamepad2,
  Sports: Bike,
  "Health & Beauty": HeartPulse,
};

/** Deterministic pastel hue per SKU — stable across renders, no assets. */
function hueFromId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index++) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) % 360;
}

/**
 * Offline product image stand-in: category icon and brand initial on a
 * deterministic pastel tile.
 */
export function ProductTile({
  id,
  title,
  category,
  size = "md",
  className,
}: {
  id: string;
  title: string;
  category: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const hue = hueFromId(id);
  const Icon = CATEGORY_ICONS[category] ?? Package;

  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-md border",
        size === "md" ? "size-12" : "size-9",
        className,
      )}
      style={{
        backgroundColor: `oklch(var(--product-tile-bg) 0.035 ${hue})`,
        borderColor: `oklch(var(--product-tile-border) 0.06 ${hue})`,
        color: `oklch(var(--product-tile-text) 0.12 ${hue})`,
      }}
    >
      <Icon className={size === "md" ? "size-5" : "size-4"} aria-hidden />
      {size === "md" ? (
        <span className="text-[9px] font-semibold tracking-wide">
          {title.slice(0, 1).toUpperCase()}
        </span>
      ) : null}
    </div>
  );
}
