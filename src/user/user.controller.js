const { validationResult } = require('express-validator');
const pool = require('../../config/db');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
require('dotenv').config();


// ✅ Créer un utilisateur
exports.createUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    email,
    password,
    full_name,
    address,
    tax_number,
    phone,
    profile_picture = null,
    role = 'freelancer',
      description = ''
  } = req.body;

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ message: 'Cet email est déjà utilisé.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertion dans la table users
    const [result] = await pool.query(
      `INSERT INTO users (email, password, full_name, address, tax_number, phone, profile_picture, role,description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)`,
      [email, hashedPassword, full_name, address, tax_number, phone, profile_picture, role,description]
    );

    const userId = result.insertId;

    // Si le rôle est client, on crée aussi dans la table clients
    if (role === 'client') {
      await pool.query(
        `INSERT INTO clients (user_id, name, email, address, tax_id)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, full_name, email, address, tax_number]
      );
    }

    // Envoi de l'email de bienvenue
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Bienvenue sur notre plateforme',
      text: `Bonjour ${full_name},\n\nMerci pour votre inscription sur notre plateforme !\n\nVotre mot de passe est : ${password}\n\nVeuillez le garder en sécurité.`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      id: userId,
      email,
      full_name,
      address,
      tax_number,
      phone,
      profile_picture,
      role,
      message: "Utilisateur créé et email envoyé"
    });
  } catch (err) {
    console.error('Erreur MySQL (create):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};



// ✅ Récupérer tous les utilisateurs
exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, email, full_name, address, tax_number, phone, profile_picture, role,description  FROM users');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erreur MySQL (getAll):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ✅ Récupérer un utilisateur
exports.getOneUser = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT id, email, full_name, address, tax_number, phone, profile_picture, role,description  FROM users WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Erreur MySQL (getOne):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ✅ Mettre à jour un utilisateur
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    full_name,
    email,
    address,
    tax_number,
    phone,
    description
  } = req.body;

  try {
    let profile_picture;

    if (req.file) {
      profile_picture = `/uploads/${req.file.filename}`;
    } else {
      // Conserver l'ancienne image si aucune nouvelle image n'est uploadée
      const [current] = await pool.query('SELECT profile_picture FROM users WHERE id = ?', [id]);
      profile_picture = current[0]?.profile_picture || null;
    }

    await pool.query(
      `UPDATE users SET full_name=?, email=?, address=?, tax_number=?, phone=?, profile_picture=?, description=? WHERE id=?`,
      [full_name, email, address, tax_number, phone, profile_picture, description, id]
    );

    res.status(200).json({ message: 'Profil mis à jour', profile_picture });
  } catch (err) {
    console.error('Erreur MySQL (update):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};


exports.updatePassword = async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  try {
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [id]);
    if (users.length === 0) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const isMatch = await bcrypt.compare(currentPassword, users[0].password);
    if (!isMatch) return res.status(400).json({ message: 'Mot de passe actuel incorrect' });

    const hashedNew = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedNew, id]);

    res.status(200).json({ message: 'Mot de passe mis à jour' });
  } catch (err) {
    console.error('Erreur MySQL (updatePassword):', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ✅ Supprimer un utilisateur
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.status(200).json({ message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    console.error('Erreur MySQL (delete):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};
