const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Chemin absolu vers le dossier d'upload
const uploadDir = path.join(process.cwd(), 'uploads', 'companies');

// Création récursive du dossier s'il n'existe pas
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Dossier upload créé : ${uploadDir}`);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Vérification supplémentaire de l'existence du dossier
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = 'company-' + uniqueSuffix + extension;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Error: Seules les images (JPEG, JPG, PNG) sont autorisées'));
};

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1 // 1 fichier maximum
  },
  fileFilter: fileFilter
}).single('logo'); // 'logo' doit correspondre au nom du champ dans le form-data

// Middleware de gestion d'erreurs amélioré
const handleUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Erreur spécifique à Multer
      return res.status(400).json({ 
        success: false,
        message: err.message 
      });
    } else if (err) {
      // Erreur de fileFilter ou autre
      return res.status(400).json({ 
        success: false,
        message: err.message 
      });
    }
    // Si tout est OK, passer au middleware suivant
    next();
  });
};

module.exports = {
  uploadMiddleware: handleUpload,
  getFilePath: (filename) => path.join(uploadDir, filename)
};