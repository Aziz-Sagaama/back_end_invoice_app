const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');

const {
  createUser,
  getAllUsers,
  getOneUser,
  updateUser,
  deleteUser,
  updatePassword // ✅ importer
} = require('./user.controller');

const router = express.Router();

// 📁 Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `user-${uniqueSuffix}.${ext}`);
  }
});
const upload = multer({ storage });

// ✅ Validation pour signup
const userValidation = [
  body('email').isEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe trop court'),
  body('full_name').notEmpty().withMessage('Nom requis'),
  body('phone').notEmpty().withMessage('Téléphone requis'),
  body('tax_number').notEmpty().isLength({ max: 50 }).withMessage('Numéro fiscal requis')
];

// ✅ Routes CRUD
router.post('/', userValidation, createUser);
router.get('/', getAllUsers);
router.get('/:id', getOneUser);
router.put('/:id', upload.single('profile_picture'), updateUser);
router.put('/:id/password', updatePassword); // ✅ AJOUT de la route manquante
router.delete('/:id', deleteUser);

module.exports = router;
