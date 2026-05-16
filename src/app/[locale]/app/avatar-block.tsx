"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Cropper, { type Area } from "react-easy-crop";
import { Check, Loader2, Pencil, Upload } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/business/avatar";
import { Button } from "@/components/ui/button";
import {
  updateAvatarAction,
  uploadAvatarAction,
} from "@/lib/auth/actions";
import {
  AVATAR_COLORS,
  COLOR_CLASSES,
  ICON_COMPONENTS,
  SECTOR_ICONS,
  type AvatarColor,
  type AvatarType,
  type SectorIcon,
} from "@/lib/auth/avatar-color";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  email: string;
  initialColor: AvatarColor;
  initialType: AvatarType;
  initialIcon: SectorIcon | null;
  initialUrl: string | null;
};

const TARGET_AVATAR_SIZE = 512; // exported PNG/JPEG side length

export function AvatarBlock({
  name,
  email,
  initialColor,
  initialType,
  initialIcon,
  initialUrl,
}: Props) {
  const t = useTranslations("app.avatar");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [color, setColor] = useState<AvatarColor>(initialColor);
  const [type, setType] = useState<AvatarType>(initialType);
  const [icon, setIcon] = useState<SectorIcon | null>(initialIcon);
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl);
  const [error, setError] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();
  const [uploading, startUpload] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropper state — when cropSrc is set, the dialog enters crop mode.
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();

  // ─────── Metadata updates ───────

  function pushUpdate(patch: {
    type?: AvatarType;
    color?: AvatarColor;
    icon?: SectorIcon | null;
  }) {
    setError(null);
    startTransition(async () => {
      const res = await updateAvatarAction(patch);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  function pickColor(c: AvatarColor) {
    if (c === color || pending) return;
    setColor(c);
    pushUpdate({ color: c });
  }

  function pickIcon(i: SectorIcon) {
    setIcon(i);
    if (type !== "icon") {
      setType("icon");
      pushUpdate({ type: "icon", icon: i });
    } else {
      pushUpdate({ icon: i });
    }
  }

  function pickMode(next: AvatarType) {
    if (next === type) return;
    if (next === "image") {
      setType("image");
      return;
    }
    if (next === "icon") {
      const i = icon ?? "scissors";
      setIcon(i);
      setType("icon");
      pushUpdate({ type: "icon", icon: i });
      return;
    }
    setType("initial");
    pushUpdate({ type: "initial" });
  }

  function onPickFile() {
    fileInputRef.current?.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError(t("uploadTooLarge"));
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
    ) {
      setError(t("uploadInvalidType"));
      return;
    }
    // Read into data URL and enter crop mode (don't upload yet).
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  }

  async function saveCropped() {
    if (!cropSrc || !croppedAreaPixels) return;
    setError(null);
    try {
      const blob = await renderCroppedAvatar(cropSrc, croppedAreaPixels);
      const cropped = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const formData = new FormData();
      formData.append("file", cropped);
      startUpload(async () => {
        const res = await uploadAvatarAction(formData);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setImageUrl(res.data!.url);
        setType("image");
        setCropSrc(null);
        router.refresh();
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("cropFailed"));
    }
  }

  function cancelCrop() {
    setCropSrc(null);
    setError(null);
  }

  function removeImage() {
    setImageUrl(null);
    const next: AvatarType = icon ? "icon" : "initial";
    setType(next);
    pushUpdate({ type: next });
  }

  // ─────── Render ───────

  return (
    <>
      <div className="flex flex-col items-center gap-2.5 px-5 pb-6 pt-14">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t("title")}
        >
          <Avatar
            type={type}
            initial={initial}
            iconName={icon}
            color={color}
            imageUrl={imageUrl}
            size={80}
          />
          <span className="absolute -bottom-0.5 -right-0.5 grid size-7 place-items-center rounded-full border border-border bg-background shadow-sm">
            <Pencil className="size-3.5 text-foreground" />
          </span>
        </button>
        <div className="space-y-0.5 text-center">
          <div className="text-lg font-semibold leading-tight text-foreground">
            {name}
          </div>
          <div className="max-w-[200px] truncate text-sm text-muted-foreground">
            {email}
          </div>
        </div>
      </div>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v && cropSrc) return; // don't close mid-crop accidentally
          setOpen(v);
        }}
      >
        <DialogContent className="max-w-md">
          {cropSrc ? (
            // ─────── Crop step ───────
            <>
              <DialogHeader>
                <DialogTitle>{t("cropTitle")}</DialogTitle>
                <DialogDescription>{t("cropDescription")}</DialogDescription>
              </DialogHeader>

              <div className="relative h-72 w-full overflow-hidden rounded-xl bg-zinc-900">
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {t("zoom")}
                </label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-foreground"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={cancelCrop}
                  disabled={uploading}
                >
                  {t("cropCancel")}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="flex-1"
                  onClick={saveCropped}
                  disabled={uploading || !croppedAreaPixels}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      {t("uploading")}
                    </>
                  ) : (
                    t("cropSave")
                  )}
                </Button>
              </div>
            </>
          ) : (
            // ─────── Normal step ───────
            <>
              <DialogHeader>
                <DialogTitle>{t("title")}</DialogTitle>
                <DialogDescription>{t("description")}</DialogDescription>
              </DialogHeader>

              <div className="flex justify-center py-1">
                <Avatar
                  type={type}
                  initial={initial}
                  iconName={icon}
                  color={color}
                  imageUrl={imageUrl}
                  size={96}
                />
              </div>

              {/* Mode tabs */}
              <div className="mx-auto inline-flex rounded-full bg-muted p-1">
                {(["image", "initial", "icon"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pickMode(m)}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                      type === m
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(`modes.${m}`)}
                  </button>
                ))}
              </div>

              {/* Color swatches */}
              {type !== "image" && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    {t("color")}
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => pickColor(c)}
                        disabled={pending}
                        aria-label={c}
                        className={cn(
                          "grid aspect-square place-items-center rounded-full transition-transform hover:scale-105 disabled:opacity-50",
                          COLOR_CLASSES[c],
                          c === color && "ring-2 ring-foreground ring-offset-2",
                        )}
                      >
                        {c === color && <Check className="size-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sector icons */}
              {type === "icon" && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    {t("sectorIcon")}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {SECTOR_ICONS.map((s) => {
                      const Icon = ICON_COMPONENTS[s];
                      const active = icon === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => pickIcon(s)}
                          disabled={pending}
                          aria-label={t(`sectors.${s}`)}
                          title={t(`sectors.${s}`)}
                          className={cn(
                            "grid aspect-square place-items-center rounded-2xl transition-transform hover:scale-105 disabled:opacity-50",
                            COLOR_CLASSES[color],
                            active && "ring-2 ring-foreground ring-offset-2",
                          )}
                        >
                          <Icon className="size-6" strokeWidth={2.2} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Image upload entry */}
              {type === "image" && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    hidden
                    onChange={handleFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onPickFile}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="size-4" />
                    {imageUrl ? t("changeImage") : t("uploadCta")}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {t("uploadHint")}
                  </p>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={removeImage}
                      disabled={pending}
                      className="mx-auto block text-xs font-medium text-destructive underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      {t("removeImage")}
                    </button>
                  )}
                </div>
              )}

              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                  {error}
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("image-load")));
    image.src = url;
  });
}

/** Crops + resizes to a TARGET_AVATAR_SIZE square JPEG for upload. */
async function renderCroppedAvatar(
  imageSrc: string,
  pixelCrop: Area,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = TARGET_AVATAR_SIZE;
  canvas.height = TARGET_AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-context");
  // White background under any alpha (JPEGs don't carry alpha)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, TARGET_AVATAR_SIZE, TARGET_AVATAR_SIZE);
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    TARGET_AVATAR_SIZE,
    TARGET_AVATAR_SIZE,
  );
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas-encode"));
      },
      "image/jpeg",
      0.88,
    );
  });
}
