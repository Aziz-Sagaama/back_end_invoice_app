const express=require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool= require('../../config/db');

const router= express.Router();

const loginValidation= [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('mot de passe requis')
];

router.post('/', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;


 try {
    // Récupérer l'utilisateur par email
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const user = users[0];

    // Vérifier le mot de passe
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

   
    delete user.password;

    res.status(200).json({
      message: 'Connexion réussie',
      user
    });
  } catch (err) {
    console.error('Erreur MySQL :', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
}
);
module.exports = router;

