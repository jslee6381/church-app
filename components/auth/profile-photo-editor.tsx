"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  initialPhotoUrl: string | null;
  displayName: string;
};

const PREVIEW_SIZE = 208;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCoverRect(
  naturalWidth: number,
  naturalHeight: number,
  previewSize: number,
  zoom: number,
  panX: number,
  panY: number,
) {
  const coverScale = Math.max(previewSize / naturalWidth, previewSize / naturalHeight);
  const scaledWidth = naturalWidth * coverScale * zoom;
  const scaledHeight = naturalHeight * coverScale * zoom;
  const maxOffsetX = Math.max(0, (scaledWidth - previewSize) / 2);
  const maxOffsetY = Math.max(0, (scaledHeight - previewSize) / 2);
  const offsetX = (panX / 100) * maxOffsetX;
  const offsetY = (panY / 100) * maxOffsetY;

  return {
    width: scaledWidth,
    height: scaledHeight,
    left: (previewSize - scaledWidth) / 2 + offsetX,
    top: (previewSize - scaledHeight) / 2 + offsetY,
    maxOffsetX,
    maxOffsetY,
  };
}

export function ProfilePhotoEditor({ initialPhotoUrl, displayName }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [draftPreviewUrl, setDraftPreviewUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setDraftPreviewUrl(null);
      setNaturalSize({ width: 0, height: 0 });
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setDraftPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!draftPreviewUrl) {
      return;
    }

    const image = new Image();
    image.onload = () => {
      setNaturalSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.src = draftPreviewUrl;
  }, [draftPreviewUrl]);

  const previewRect = useMemo(() => {
    if (!draftPreviewUrl || !naturalSize.width || !naturalSize.height) {
      return null;
    }

    return getCoverRect(naturalSize.width, naturalSize.height, PREVIEW_SIZE, zoom, panX, panY);
  }, [draftPreviewUrl, naturalSize.height, naturalSize.width, panX, panY, zoom]);

  function updatePanFromDrag(clientX: number, clientY: number) {
    const dragState = dragStateRef.current;

    if (!dragState || !previewRect) {
      return;
    }

    const deltaX = clientX - dragState.startX;
    const deltaY = clientY - dragState.startY;
    const nextPanX =
      previewRect.maxOffsetX > 0
        ? clamp(dragState.startPanX + (deltaX / previewRect.maxOffsetX) * 100, -100, 100)
        : 0;
    const nextPanY =
      previewRect.maxOffsetY > 0
        ? clamp(dragState.startPanY + (deltaY / previewRect.maxOffsetY) * 100, -100, 100)
        : 0;

    setPanX(nextPanX);
    setPanY(nextPanY);
  }

  async function buildCroppedFile(file: File) {
    if (!naturalSize.width || !naturalSize.height) {
      return file;
    }

    const rect = getCoverRect(naturalSize.width, naturalSize.height, PREVIEW_SIZE, zoom, panX, panY);
    const canvas = document.createElement("canvas");
    canvas.width = PREVIEW_SIZE;
    canvas.height = PREVIEW_SIZE;
    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    const image = new Image();
    image.src = draftPreviewUrl ?? URL.createObjectURL(file);

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to prepare photo preview."));
    });

    context.clearRect(0, 0, PREVIEW_SIZE, PREVIEW_SIZE);
    context.drawImage(image, rect.left, rect.top, rect.width, rect.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) {
      return file;
    }

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "profile-photo"}.jpg`, {
      type: "image/jpeg",
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFile) {
      setFeedback("Please choose a photo first.");
      return;
    }

    setIsSaving(true);
    setFeedback("");

    try {
      const croppedFile = await buildCroppedFile(selectedFile);
      const formData = new FormData();
      formData.set("photo", croppedFile);

      const response = await fetch("/api/member/profile-photo", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to upload profile photo.");
      }

      setPhotoUrl(payload.photoUrl ?? null);
      setSelectedFile(null);
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setFeedback("Profile photo updated.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to upload profile photo.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemovePhoto() {
    setIsRemoving(true);
    setFeedback("");

    try {
      const response = await fetch("/api/member/profile-photo", {
        method: "DELETE",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to remove profile photo.");
      }

      setPhotoUrl(null);
      setSelectedFile(null);
      setDraftPreviewUrl(null);
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setFeedback("Profile photo removed.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to remove profile photo.");
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <section className="mb-4">
      <div className="flex flex-wrap items-center gap-4">
        <button
          aria-label="Choose profile photo"
          className="rounded-full border-0 bg-transparent p-0"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          {photoUrl ? (
            <img alt={`${displayName} profile`} className="size-16 rounded-full object-cover" src={photoUrl} />
          ) : (
            <div className="inline-flex size-16 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Users className="size-7" />
            </div>
          )}
        </button>
        <div>
          <p className="m-0 text-sm font-semibold uppercase tracking-[0.12em] text-primary">Profile Photo</p>
          <p className="ui-text m-0 mt-1 text-muted-foreground">Tap the circle to choose a photo</p>
        </div>
      </div>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            setSelectedFile(event.target.files?.[0] ?? null);
            setZoom(1);
            setPanX(0);
            setPanY(0);
          }}
          ref={fileInputRef}
          type="file"
        />
        <p className="ui-text m-0 text-muted-foreground">JPG, PNG, or WEBP up to 8 MB</p>
        {draftPreviewUrl && previewRect ? (
          <div className="settings-card-surface grid gap-4 rounded-[16px] border border-border/70 bg-white/72 p-4">
            <div className="flex justify-center">
              <div
                className="relative overflow-hidden rounded-full border border-border/80 bg-accent/30"
                style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                onPointerDown={(event) => {
                  dragStateRef.current = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    startPanX: panX,
                    startPanY: panY,
                  };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (dragStateRef.current?.pointerId !== event.pointerId) {
                    return;
                  }

                  updatePanFromDrag(event.clientX, event.clientY);
                }}
                onPointerUp={(event) => {
                  if (dragStateRef.current?.pointerId === event.pointerId) {
                    dragStateRef.current = null;
                  }
                }}
                onPointerCancel={(event) => {
                  if (dragStateRef.current?.pointerId === event.pointerId) {
                    dragStateRef.current = null;
                  }
                }}
                onPointerLeave={(event) => {
                  if (dragStateRef.current?.pointerId === event.pointerId && event.pointerType === "mouse") {
                    dragStateRef.current = null;
                  }
                }}
              >
                <img
                  alt={`${displayName} crop preview`}
                  className="absolute max-w-none"
                  src={draftPreviewUrl}
                  style={{
                    width: previewRect.width,
                    height: previewRect.height,
                    left: previewRect.left,
                    top: previewRect.top,
                    touchAction: "none",
                    userSelect: "none",
                  }}
                />
              </div>
            </div>

            <label className="grid gap-2 text-sm font-medium text-muted-foreground">
              Zoom
              <input
                className="w-full accent-[var(--primary)]"
                max={3}
                min={1}
                onChange={(event) => setZoom(Number(event.target.value))}
                step={0.01}
                type="range"
                value={zoom}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-muted-foreground">
              Left / Right
              <input
                className="w-full accent-[var(--primary)]"
                max={100}
                min={-100}
                onChange={(event) => setPanX(clamp(Number(event.target.value), -100, 100))}
                step={1}
                type="range"
                value={panX}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-muted-foreground">
              Up / Down
              <input
                className="w-full accent-[var(--primary)]"
                max={100}
                min={-100}
                onChange={(event) => setPanY(clamp(Number(event.target.value), -100, 100))}
                step={1}
                type="range"
                value={panY}
              />
            </label>

            <div className="flex justify-end">
              <Button
                className="settings-action-surface min-h-10 rounded-[14px]"
                onClick={() => {
                  setZoom(1);
                  setPanX(0);
                  setPanY(0);
                }}
                size="sm"
                type="button"
                variant="secondary"
              >
                <RotateCcw className="size-4" />
                Reset
              </Button>
            </div>
          </div>
        ) : null}
        {selectedFile ? (
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="settings-action-surface min-h-11 rounded-[16px]"
              disabled={isSaving || isRemoving}
              onClick={() => {
                setSelectedFile(null);
                setDraftPreviewUrl(null);
                setZoom(1);
                setPanX(0);
                setPanY(0);
                setFeedback("");
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              size="sm"
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button className="min-h-11 rounded-[16px]" disabled={isSaving || isRemoving} size="sm" type="submit">
              {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Upload photo
            </Button>
          </div>
        ) : null}
        {photoUrl ? (
          <Button
            className="settings-action-surface min-h-11 rounded-[16px]"
            disabled={isSaving || isRemoving}
            onClick={handleRemovePhoto}
            size="sm"
            type="button"
            variant="secondary"
          >
            {isRemoving ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Remove current photo
          </Button>
        ) : null}
      </form>

      {feedback ? <p className="mb-0 mt-3 text-sm text-muted-foreground">{feedback}</p> : null}
    </section>
  );
}
