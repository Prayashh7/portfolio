import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import { env } from "../config/env.js";
import { asyncHandler, badRequest, invalid, notFound } from "../utils/http.js";

/*
  Image uploads for the dashboard. Two rules do most of the security work here:

  - The extension is chosen from the mimetype allowlist below, never taken from
    the uploaded name, and the basename is random. A caller cannot influence the
    path or the type of file that ends up on disk.
  - image/svg+xml is not on the allowlist. SVG can carry script, and these files
    are served from the same origin as the site.
*/

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_DIR = path.join(HERE, "..", "public", "media");
const UPLOAD_DIR = path.join(MEDIA_DIR, "uploads");

const EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
};

/* Only files this module created can be deleted: seeded artwork does not match. */
const GENERATED_NAME = /^[a-f0-9]{24}\.(jpg|png|webp|avif|gif)$/;
const IMAGE_FILE = /\.(jpe?g|png|webp|avif|gif)$/i;

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, done) => done(null, UPLOAD_DIR),
  filename: (req, file, done) =>
    done(null, crypto.randomBytes(12).toString("hex") + EXTENSIONS[file.mimetype]),
});

export const receiveFile = multer({
  storage,
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter: (req, file, done) => {
    if (!EXTENSIONS[file.mimetype]) {
      return done(
        invalid("That file type is not supported.", {
          file: "Upload a JPEG, PNG, WebP, AVIF or GIF image.",
        })
      );
    }
    done(null, true);
  },
}).single("file");

export const saveUpload = asyncHandler(async (req, res) => {
  if (!req.file) throw invalid("No file was received.", { file: "Choose an image to upload." });

  res.status(201).json({
    url: `/media/uploads/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

async function describe(directory, urlPrefix) {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  const images = entries.filter((entry) => entry.isFile() && IMAGE_FILE.test(entry.name));

  return Promise.all(
    images.map(async (entry) => {
      const stats = await fs.stat(path.join(directory, entry.name));
      return {
        filename: entry.name,
        url: `${urlPrefix}/${entry.name}`,
        size: stats.size,
        modified_at: stats.mtime.toISOString(),
        removable: GENERATED_NAME.test(entry.name),
      };
    })
  );
}

/* Backs the image picker in the dashboard: seeded artwork plus anything uploaded. */
export const listMedia = asyncHandler(async (req, res) => {
  const [seeded, uploaded] = await Promise.all([
    describe(MEDIA_DIR, "/media"),
    describe(UPLOAD_DIR, "/media/uploads"),
  ]);

  const files = [...uploaded, ...seeded].sort((a, b) =>
    b.modified_at.localeCompare(a.modified_at)
  );
  res.json(files);
});

export const removeUpload = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  if (!GENERATED_NAME.test(filename)) {
    throw badRequest("Only uploaded files can be deleted.");
  }

  try {
    await fs.unlink(path.join(UPLOAD_DIR, filename));
  } catch (error) {
    if (error.code === "ENOENT") throw notFound("That file has already been removed.");
    throw error;
  }

  res.status(204).end();
});
