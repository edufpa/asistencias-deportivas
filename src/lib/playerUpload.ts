import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type PlayerImageKind = "photo" | "documentFront" | "documentBack";

export function validatePlayerImage(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Solo se permiten imágenes JPG, PNG o WebP";
  }
  if (file.size > MAX_BYTES) {
    return "La imagen no puede superar 5 MB";
  }
  return null;
}

function useBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

async function saveToBlob(
  playerId: string,
  kind: PlayerImageKind,
  file: File,
  ext: string,
  buffer: Buffer
): Promise<string> {
  const pathname = `players/${playerId}/${kind}.${ext}`;
  const blob = await put(pathname, buffer, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: false,
  });
  return blob.url;
}

async function saveToLocalDisk(
  playerId: string,
  kind: PlayerImageKind,
  ext: string,
  buffer: Buffer
): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", "players", playerId);
  await mkdir(dir, { recursive: true });

  const filename = `${kind}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  return `/uploads/players/${playerId}/${filename}`;
}

export async function savePlayerImage(
  playerId: string,
  kind: PlayerImageKind,
  file: File
): Promise<string> {
  const err = validatePlayerImage(file);
  if (err) throw new Error(err);

  const ext = EXT_BY_TYPE[file.type] ?? "jpg";
  const buffer = Buffer.from(await file.arrayBuffer());

  if (process.env.VERCEL === "1" && !useBlobStorage()) {
    throw new Error(
      "Almacenamiento de imágenes no configurado en producción. Contactá al administrador del sistema."
    );
  }

  if (useBlobStorage()) {
    return saveToBlob(playerId, kind, file, ext, buffer);
  }

  return saveToLocalDisk(playerId, kind, ext, buffer);
}

export function playerImageDbField(kind: PlayerImageKind) {
  const map = {
    photo: "photoUrl",
    documentFront: "documentPhotoFrontUrl",
    documentBack: "documentPhotoBackUrl",
  } as const;
  return map[kind];
}
