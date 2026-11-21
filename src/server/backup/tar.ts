import { gunzipSync, gzipSync } from "node:zlib";

/**
 * A minimal ustar reader/writer for plain files, enough for backups (one data.json).
 * Kept in-house so backups need no extra package.
 */
const BLOCK = 512;

function header(name: string, size: number, mtime: Date): Buffer {
  const h = Buffer.alloc(BLOCK, 0);
  const put = (value: string, offset: number, length: number) => h.write(value, offset, length, "ascii");
  put(name, 0, 100);
  put("0000644\0", 100, 8);
  put("0000000\0", 108, 8);
  put("0000000\0", 116, 8);
  put(size.toString(8).padStart(11, "0") + "\0", 124, 12);
  put(
    Math.floor(mtime.getTime() / 1000)
      .toString(8)
      .padStart(11, "0") + "\0",
    136,
    12,
  );
  put("        ", 148, 8);
  put("0", 156, 1);
  put("ustar\0", 257, 6);
  put("00", 263, 2);
  let sum = 0;
  for (const byte of h) sum += byte;
  put(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8);
  return h;
}

export function writeTarGz(files: { name: string; data: Buffer }[], mtime = new Date()): Buffer {
  const parts: Buffer[] = [];
  for (const f of files) {
    if (Buffer.byteLength(f.name) > 99) throw new Error(`file name too long: ${f.name}`);
    parts.push(header(f.name, f.data.length, mtime), f.data);
    const pad = (BLOCK - (f.data.length % BLOCK)) % BLOCK;
    if (pad) parts.push(Buffer.alloc(pad, 0));
  }
  parts.push(Buffer.alloc(BLOCK * 2, 0));
  return gzipSync(Buffer.concat(parts));
}

export class ArchiveError extends Error {}

/** The regular files of a .tar.gz, by name. Throws ArchiveError for anything malformed. */
export function readTarGz(archive: Buffer, maxBytes = 200 * 1024 * 1024): Map<string, Buffer> {
  let tar: Buffer;
  try {
    tar = gunzipSync(archive, { maxOutputLength: maxBytes });
  } catch {
    throw new ArchiveError("not a gzip archive, or too large");
  }
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (offset + BLOCK <= tar.length) {
    const h = tar.subarray(offset, offset + BLOCK);
    if (h.every((b) => b === 0)) break;
    let sum = 0;
    for (let i = 0; i < BLOCK; i++) sum += i >= 148 && i < 156 ? 32 : h[i]!;
    const stored = parseInt(h.subarray(148, 156).toString("ascii").replace(/\0.*$/, "").trim(), 8);
    if (!Number.isFinite(stored) || stored !== sum) throw new ArchiveError("damaged tar header");
    const name = h.subarray(0, 100).toString("utf8").replace(/\0.*$/s, "");
    const size = parseInt(h.subarray(124, 136).toString("ascii").replace(/\0.*$/, "").trim() || "0", 8);
    const type = String.fromCharCode(h[156]!);
    if (!Number.isFinite(size) || size < 0 || offset + BLOCK + size > tar.length)
      throw new ArchiveError("truncated archive");
    if (type === "0" || type === "\0") files.set(name, tar.subarray(offset + BLOCK, offset + BLOCK + size));
    offset += BLOCK + Math.ceil(size / BLOCK) * BLOCK;
  }
  return files;
}
