import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

type StoreImageOptions = {
  buffer: Buffer;
  mimetype: string;
  folder: 'avatars' | 'products';
  publicIdPrefix: string;
  localDirectory: string;
  localUrlPrefix: string;
};

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function hasCloudinaryConfig() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET,
  );
}

export async function storeImage(options: StoreImageOptions): Promise<string> {
  const publicId = `${options.publicIdPrefix}-${randomUUID()}`;

  if (hasCloudinaryConfig()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });

    const result = await new Promise<UploadApiResponse>((resolveUpload, rejectUpload) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: `canteenpn/${options.folder}`,
          public_id: publicId,
          overwrite: false,
        },
        (error, uploaded) => {
          if (error || !uploaded) rejectUpload(error ?? new Error('Cloudinary không trả về kết quả tải ảnh.'));
          else resolveUpload(uploaded);
        },
      );
      upload.end(options.buffer);
    });

    return result.secure_url;
  }

  const extension = extensions[options.mimetype];
  if (!extension) throw new Error(`Không hỗ trợ kiểu ảnh ${options.mimetype}.`);
  await mkdir(options.localDirectory, { recursive: true });
  const filename = `${publicId}.${extension}`;
  await writeFile(resolve(options.localDirectory, filename), options.buffer, { flag: 'wx' });
  return `${options.localUrlPrefix.replace(/\/$/, '')}/${filename}`;
}
