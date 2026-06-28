"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { PlayerImageKind } from "@/lib/playerUpload";

type Props = {
  label: string;
  hint?: string;
  playerId: string | null;
  kind: PlayerImageKind;
  currentUrl: string | null;
  onUrlChange: (url: string | null) => void;
  onPendingFile?: (file: File | null) => void;
  disabled?: boolean;
};

export function PlayerImageUpload({
  label,
  hint,
  playerId,
  kind,
  currentUrl,
  onUrlChange,
  onPendingFile,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const displayUrl = preview ?? currentUrl;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");

    if (!playerId) {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
      onPendingFile?.(file);
      return;
    }

    setUploading(true);
    const fd = new FormData();
    fd.append("kind", kind);
    fd.append("file", file);

    const res = await fetch(`/api/players/${playerId}/upload`, { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al subir");
      return;
    }

    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    onUrlChange(data.url ?? null);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}

      <div className="flex flex-wrap items-start gap-4">
        <div className="relative w-28 h-28 rounded-lg border bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
          {displayUrl ? (
            <Image src={displayUrl} alt={label} fill className="object-cover" unoptimized />
          ) : (
            <span className="text-xs text-gray-400 text-center px-2">Sin imagen</span>
          )}
        </div>

        <div className="space-y-2 min-w-[140px]">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              void handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Subiendo..." : displayUrl ? "Cambiar" : "Subir"}
          </Button>
          {!playerId && (
            <p className="text-xs text-gray-500">Se guardará al crear el jugador</p>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

async function uploadPending(playerId: string, kind: PlayerImageKind, file: File) {
  const fd = new FormData();
  fd.append("kind", kind);
  fd.append("file", file);
  await fetch(`/api/players/${playerId}/upload`, { method: "POST", body: fd });
}

export async function uploadPendingPlayerImages(
  playerId: string,
  pending: {
    photo?: File | null;
    documentFront?: File | null;
    documentBack?: File | null;
  }
) {
  if (pending.photo) await uploadPending(playerId, "photo", pending.photo);
  if (pending.documentFront) await uploadPending(playerId, "documentFront", pending.documentFront);
  if (pending.documentBack) await uploadPending(playerId, "documentBack", pending.documentBack);
}
