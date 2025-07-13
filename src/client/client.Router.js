const express = require('express');
const multer = require('multer');
const path = require('path');

const { body } = require('express-validator');
const {
  createClient,
  getAllClients,
  getOneClient,
  updateClient,
  deleteClient,
  getClientByUserId
} = require('./client.controller');

const router = express.Router();

const clientValidation = [
  body('user_id').isInt().withMessage('user_id requis'),
  body('name').notEmpty().withMessage('Le nom du client est requis'),
  body('email').optional().isEmail().withMessage('Email invalide'),
  body('address').optional(),
  body('tax_id').optional()
];
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // assure-toi que le dossier "uploads" existe
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// CRUD
router.post(  '/',upload.single('profile_picture'),clientValidation,createClient);
router.get('/', getAllClients);
router.get('/by-user/:user_id', getClientByUserId);

router.put(  '/:id',upload.single('profile_picture'),updateClient);
router.delete('/:id', deleteClient);

module.exports = router;
