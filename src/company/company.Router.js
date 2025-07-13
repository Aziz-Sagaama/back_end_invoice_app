const express = require('express');
const { body, param,query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const {
  createCompany,
  getAllCompanies,
  getOneCompany,
  updateCompany,
  deleteCompany,
  setDefaultCompany
} = require('./company.controller');

const router = express.Router();

// ✅ Validation partagée
const companyValidation = [
  body('user_id').isInt().withMessage('ID utilisateur invalide'),
  body('name').notEmpty().withMessage('Nom requis'),
  body('address').notEmpty().withMessage("Adresse requise"),
  body('tax_id').notEmpty().withMessage("Tax ID requis"),
  body('email').isEmail().withMessage("Email invalide"),
  body('phone').notEmpty().withMessage("Téléphone requis"),
  body('is_default').optional().isBoolean()
];
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // dossier où stocker les logos
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });
// ✅ Routes CRUD
router.post('/', upload.single('logo'), companyValidation, createCompany);
router.put('/:id', upload.single('logo'), companyValidation, updateCompany);
router.get('/', 
  query('user_id').isInt().withMessage('ID utilisateur invalide'), // Ajout de la validation
  getAllCompanies
);
router.get('/:id', getOneCompany);
router.delete('/:id', deleteCompany);
router.patch('/default/:id', setDefaultCompany); // Définir comme par défaut

module.exports = router;
