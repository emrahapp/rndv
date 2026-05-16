import {
  COLOR_CLASSES,
  ICON_COMPONENTS,
  type AvatarColor,
  type AvatarType,
  type SectorIcon,
} from "@/lib/auth/avatar-color";
import { cn } from "@/lib/utils";

/** Universal avatar renderer. Works in both server + client components. */
export function Avatar({
  type,
  initial,
  iconName,
  color,
  imageUrl,
  size = 80,
  className,
}: {
  type: AvatarType;
  initial: string;
  iconName?: SectorIcon | null;
  color: AvatarColor;
  imageUrl?: string | null;
  size?: number;
  className?: string;
}) {
  // 1) Uploaded image
  if (type === "image" && imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className={cn("rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  // 2) Sector icon
  if (type === "icon" && iconName && ICON_COMPONENTS[iconName]) {
    const Icon = ICON_COMPONENTS[iconName];
    return (
      <div
        className={cn(
          "grid place-items-center rounded-full",
          COLOR_CLASSES[color],
          className,
        )}
        style={{ width: size, height: size }}
      >
        <Icon
          style={{ width: size * 0.46, height: size * 0.46 }}
          strokeWidth={2.2}
        />
      </div>
    );
  }

  // 3) Initial letter (default)
  return (
    <div
      className={cn(
        "grid place-items-center rounded-full font-bold",
        COLOR_CLASSES[color],
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initial}
    </div>
  );
}
