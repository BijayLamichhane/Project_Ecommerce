import multer from "multer";
import { ValidationError } from "./errorHandler.js";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const storage = multer.memoryStorage();

function fileFilter(_req, file, callback) {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new ValidationError("Only JPEG, PNG, WebP, and GIF images are allowed"));
  }
}

export function detectImageMime(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 6 &&
    (buffer.subarray(0, 6).equals(Buffer.from("GIF87a")) ||
      buffer.subarray(0, 6).equals(Buffer.from("GIF89a")))
  ) {
    return "image/gif";
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).equals(Buffer.from("RIFF")) &&
    buffer.subarray(8, 12).equals(Buffer.from("WEBP"))
  ) {
    return "image/webp";
  }

  return null;
}

function validateImageSignatures(req, _res, next) {
  try {
    for (const file of req.files || []) {
      const detectedMime = detectImageMime(file.buffer);
      if (!detectedMime || !ALLOWED_MIME_TYPES.has(detectedMime)) {
        throw new ValidationError(
          "Uploaded file content is not a supported JPEG, PNG, WebP, or GIF image"
        );
      }

      if (detectedMime !== file.mimetype) {
        throw new ValidationError("Uploaded file type does not match its declared content type");
      }

      file.mimetype = detectedMime;
    }

    next();
  } catch (error) {
    next(error);
  }
}

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10,
  },
  fileFilter,
});

export const uploadSingle = upload.single("image");
export const uploadMultiple = upload.array("images", 10);
export const uploadProductImages = (req, res, next) => {
  upload.array("images", 10)(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    validateImageSignatures(req, res, next);
  });
};
export const uploadProfileImage = upload.single("avatar");
