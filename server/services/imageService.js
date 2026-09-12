const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('[ImageService] Sharp library failed to load; using direct file write fallback.', e.message);
}

// Upload directory path
const UPLOAD_DIR = path.join(__dirname, '../uploads/resources');

// Ensure upload directory exists
const ensureUploadDir = () => {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
};

/**
 * Optimizes an uploaded image buffer and saves it to disk.
 * 
 * @param {object} file - Multer file object ({ buffer, originalname, mimetype, size })
 * @returns {Promise<{ image_url: string, filename: string, size: number }>}
 */
const processAndSaveImage = async (file) => {
  ensureUploadDir();

  const originalExt = path.extname(file.originalname).toLowerCase();
  const fileHash = crypto.randomBytes(8).toString('hex');
  const timestamp = Date.now();

  // SVG files are vector images and do not require raster resizing
  if (file.mimetype === 'image/svg+xml' || originalExt === '.svg') {
    const filename = `res-${timestamp}-${fileHash}.svg`;
    const targetPath = path.join(UPLOAD_DIR, filename);
    await fs.promises.writeFile(targetPath, file.buffer);
    return {
      image_url: `/uploads/resources/${filename}`,
      filename,
      size: file.buffer.length
    };
  }

  // If sharp is available and format is raster (JPEG, PNG, WebP, GIF)
  if (sharp) {
    try {
      const filename = `res-${timestamp}-${fileHash}.webp`;
      const targetPath = path.join(UPLOAD_DIR, filename);

      // Resize large images to maximum 1600x1600px maintaining aspect ratio
      // Convert to WebP format at 80% quality for optimal web performance
      const optimizedBuffer = await sharp(file.buffer)
        .resize({
          width: 1600,
          height: 1600,
          fit: 'inside',
          withoutEnlargement: true
        })
        .webp({ quality: 80 })
        .toBuffer();

      await fs.promises.writeFile(targetPath, optimizedBuffer);

      return {
        image_url: `/uploads/resources/${filename}`,
        filename,
        size: optimizedBuffer.length
      };
    } catch (sharpError) {
      console.warn('[ImageService] Sharp optimization failed; falling back to direct save:', sharpError.message);
    }
  }

  // Fallback: Write file buffer directly with original extension
  const safeExt = originalExt || '.jpg';
  const filename = `res-${timestamp}-${fileHash}${safeExt}`;
  const targetPath = path.join(UPLOAD_DIR, filename);
  await fs.promises.writeFile(targetPath, file.buffer);

  return {
    image_url: `/uploads/resources/${filename}`,
    filename,
    size: file.buffer.length
  };
};

/**
 * Optimizes and saves an array of uploaded files.
 * 
 * @param {Array<object>} files - Array of Multer file objects
 * @returns {Promise<Array<{ image_url: string, filename: string, size: number }>>}
 */
const processAndSaveImages = async (files) => {
  if (!Array.isArray(files) || files.length === 0) {
    return [];
  }

  const results = [];
  for (const file of files) {
    const saved = await processAndSaveImage(file);
    results.push(saved);
  }
  return results;
};

/**
 * Safely removes an image file from local disk if it was uploaded locally.
 * Prevents directory traversal attacks by validating resolved path.
 * 
 * @param {string} imageUrl - Relative or absolute image URL
 */
const deleteImageFile = async (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return;

  // Only remove files belonging to /uploads/
  if (!imageUrl.includes('/uploads/')) return;

  try {
    const relativePart = imageUrl.substring(imageUrl.indexOf('/uploads/'));
    const absolutePath = path.normalize(path.join(__dirname, '..', relativePart));

    // Ensure target path is strictly within the uploads root directory
    const uploadsRoot = path.normalize(path.join(__dirname, '../uploads'));
    if (!absolutePath.startsWith(uploadsRoot)) {
      console.warn('[ImageService] Blocked directory traversal attempt on delete:', imageUrl);
      return;
    }

    if (fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
    }
  } catch (err) {
    console.warn('[ImageService] Could not delete image file:', err.message);
  }
};

module.exports = {
  processAndSaveImage,
  processAndSaveImages,
  deleteImageFile,
  ensureUploadDir
};
