const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test Cloudinary connection on startup
cloudinary.api.ping()
  .then(() => console.log('✅ Cloudinary connected successfully'))
  .catch(err => console.error('❌ Cloudinary connection failed:', JSON.stringify(err, Object.getOwnPropertyNames(err))));

// Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    try {
      const params = {
        folder:        'projecthub/attachments',
        resource_type: 'auto',
        public_id:     `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
        use_filename:  false
      };
      console.log('[Cloudinary] Upload params:', JSON.stringify(params));
      return params;
    } catch (err) {
      console.error('[Cloudinary] Params error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
      throw err;
    }
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
  ];
  if (allowedTypes.includes(file.mimetype)) {
    console.log('[Upload] File type allowed:', file.mimetype);
    cb(null, true);
  } else {
    console.error('[Upload] File type rejected:', file.mimetype);
    cb(new Error('File type not allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = { upload, cloudinary };