import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

export function initCloudinary() {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    logger.warn("Cloudinary credentials not configured — image uploads will be disabled");
    return;
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  logger.info("Cloudinary configured");
}

export const CLOUDINARY_FOLDERS = {
  products: "renthub/products",
  profiles: "renthub/profiles",
  sellers: "renthub/sellers",
};

export async function uploadImage(filePath, folder, publicId) {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    public_id: publicId,
    overwrite: true,
    transformation: [
      { quality: "auto", fetch_format: "auto" },
      { width: 1200, height: 900, crop: "limit" },
    ],
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function deleteImage(publicId) {
  await cloudinary.uploader.destroy(publicId);
}

export { cloudinary };
