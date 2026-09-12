const multer = require('multer');
const path = require('path');

// Allowed image MIME types and extensions
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml'
];

const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg'
];

// Configure memory storage for in-memory processing and sharp optimization
const storage = multer.memoryStorage();

// Multer file filter verifying both MIME type and file extension
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIME_TYPES.includes(mime)) {
    cb(null, true);
  } else {
    const error = new Error('Unsupported image format. Allowed formats: JPEG, PNG, WebP, GIF, SVG.');
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

// 5MB per file limit, max 5 images
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5
  },
  fileFilter
});

// Middleware wrapper with graceful error mapping for Express
const handleImageUpload = (req, res, next) => {
  // Support both 'images' (array) and 'image' (single) field names
  const uploadFields = upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'image', maxCount: 1 }
  ]);

  uploadFields(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'Image size exceeds maximum limit of 5MB.'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'Maximum of 5 images allowed per upload.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      }

      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed.'
      });
    }

    // Normalize req.files to a flat array on req.processedFiles
    const files = [];
    if (req.files) {
      if (req.files.images && Array.isArray(req.files.images)) {
        files.push(...req.files.images);
      }
      if (req.files.image && Array.isArray(req.files.image)) {
        files.push(...req.files.image);
      }
    } else if (req.file) {
      files.push(req.file);
    }
    req.uploadedFiles = files;

    next();
  });
};

module.exports = {
  handleImageUpload,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS
};
