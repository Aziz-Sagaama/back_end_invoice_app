const express = require('express');
const bcrypt =require('bcryptjs');
const {body,validationResult}=require('express-validator');
const pool=require('../../config/db');
const router=express.Router();

const signupValidation=[
    body('email').isEmail().withMessage('Email invalide'),
    body('password')
        .isLength({min:8})
        .withMessage('le mot de passe doit contenir 8 caractére ou plus '),
    body('full_name').notEmpty().withMessage('le nom complet est requis'),
    body('phone').notEmpty().withMessage('Téléphone invalide'),
    body('tax_number').notEmpty().isLength({ max: 50 }),

];
router.post('/', signupValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    email,
    password,
    full_name,
    address ,
    tax_number ,
    phone ,
    profile_picture = null,
  } = req.body;

  try {
    
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      `INSERT INTO users (email, password, full_name, address, tax_number, phone, profile_picture)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [email, hashedPassword, full_name, address, tax_number, phone, profile_picture]
    );


    res.status(201).json({
      id: result.insertId,
      email,
      full_name,
      address,
      tax_number,
      phone,
      profile_picture,
    });
  } catch (err) {
    console.error('Erreur MySQL :', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});
module.exports = router;