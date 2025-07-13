const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../../config/db');
const router = express.Router();

// ✅ Validation des champs
const quotationValidation = [
  body('user_id').isInt().withMessage('ID utilisateur invalide'),
  body('company_id').isInt().withMessage('ID société invalide'),
  body('client_name').notEmpty().withMessage('Le nom du client est requis'),
  body('client_email').optional().isEmail().withMessage('Email du client invalide'),
  body('client_address').optional().isString(),
  body('status')
    .optional()
    .isIn(['Draft', 'Sent', 'Approved', 'Rejected'])
    .withMessage('Statut invalide')
];

// ✅ Route POST /quotations
router.post('/', quotationValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    user_id,
    company_id,
    client_name,
    client_email = null,
    client_address = null,
    status = 'Draft'
  } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO quotations (
        user_id, company_id, client_name, client_email, client_address, status
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, company_id, client_name, client_email, client_address, status]
    );

    res.status(201).json({
      id: result.insertId,
      user_id,
      company_id,
      client_name,
      client_email,
      client_address,
      status
    });
  } catch (err) {
    console.error('Erreur MySQL :', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;
