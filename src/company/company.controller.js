const { validationResult } = require('express-validator');
const pool = require('../../config/db');

// ✅ Créer une société
exports.createCompany = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    user_id,
    name,
    address,
    tax_id,
    email,
    phone,
    is_default = false
  } = req.body;
  const logo = req.file ? req.file.filename : null;

  try {
    if (is_default) {
      await pool.query('UPDATE companies SET is_default = false WHERE user_id = ?', [user_id]);
    }

    
  const [result] = await pool.query(
    `INSERT INTO companies (user_id, name, logo, address, tax_id, email, phone, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [user_id, name, logo, address, tax_id, email, phone, is_default]
  );

    res.status(201).json({
      id: result.insertId,
      user_id,
      name,
      logo,
      address,
      tax_id,
      email,
      phone,
      is_default
    });
  } catch (err) {
    console.error('Erreur MySQL (create):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ✅ Obtenir toutes les sociétés
exports.getAllCompanies = async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ message: 'user_id est requis dans la requête' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM companies WHERE user_id = ?', [user_id]);
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erreur MySQL (getAll):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};



// ✅ Obtenir une société par ID
exports.getOneCompany = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM companies WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Société non trouvée' });
    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Erreur MySQL (getOne):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ✅ Mettre à jour une société
exports.updateCompany = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { id } = req.params;
  const {
    user_id,
    name,
   
    address,
    tax_id,
    email,
    phone,
    is_default = false
  } = req.body;
  const logo = req.file ? req.file.filename : null;

  try {
    if (is_default) {
      await pool.query('UPDATE companies SET is_default = false WHERE user_id = ?', [user_id]);
    }

    await pool.query(
  `UPDATE companies
   SET user_id = ?, name = ?, logo = ?, address = ?, tax_id = ?, email = ?, phone = ?, is_default = ?
   WHERE id = ?`,
  [user_id, name, logo, address, tax_id, email, phone, is_default, id]
  );

    res.status(200).json({ message: 'Société mise à jour avec succès' });
  } catch (err) {
    console.error('Erreur MySQL (update):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ✅ Supprimer une société
exports.deleteCompany = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM companies WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Société non trouvée' });
    res.status(200).json({ message: 'Société supprimée avec succès' });
  } catch (err) {
    console.error('Erreur MySQL (delete):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ✅ Définir une société comme par défaut
exports.setDefaultCompany = async (req, res) => {
  const { id } = req.params;

  try {
    // Vérifie que la société existe
    const [company] = await pool.query('SELECT * FROM companies WHERE id = ?', [id]);
    if (company.length === 0) return res.status(404).json({ message: 'Société non trouvée' });

    const user_id = company[0].user_id;

    await pool.query('UPDATE companies SET is_default = false WHERE user_id = ?', [user_id]);
    await pool.query('UPDATE companies SET is_default = true WHERE id = ?', [id]);

    res.status(200).json({ message: 'Société définie comme par défaut' });
  } catch (err) {
    console.error('Erreur MySQL (setDefault):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};
