const { validationResult } = require('express-validator');
const pool = require('../../config/db');

// 🔹 Créer un client
exports.createClient = async (req, res) => {
  const errors = validationResult(req);
  const profile_picture = req.file ? req.file.filename : null;
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { user_id, name, email = null, address = null, tax_id = null } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO clients (user_id, name, email, address, tax_id,profile_picture)
       VALUES (?, ?, ?, ?, ?,?)`,
      [user_id, name, email, address,profile_picture, tax_id]
    );

    res.status(201).json({
      id: result.insertId,
      user_id,
      name,
      email,
      address,
      tax_id
    });
    
  } catch (err) {
    console.error('Erreur MySQL (create):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// 🔹 Récupérer tous les clients
exports.getAllClients = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM clients ORDER BY name');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erreur MySQL (getAll):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// 🔹 Récupérer un client
// 🔹 Obtenir un client à partir de son user_id
exports.getClientByUserId = async (req, res) => {
  const { user_id } = req.params;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM clients WHERE user_id = ?',
      [user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Client non trouvé' });
    }

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Erreur MySQL (getClientByUserId):', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};



// 🔹 Modifier un client
// update client with profile picture
exports.updateClient = async (req, res) => {
  const { id } = req.params;
  const { name, email, address, tax_id } = req.body;
  const profile_picture = req.file ? req.file.filename : null;

  try {
    await pool.query(
      `UPDATE clients SET name = ?, email = ?, address = ?, tax_id = ?, profile_picture = ?
       WHERE id = ?`,
      [name, email, address, tax_id, profile_picture, id]
    );
    res.status(200).json({ message: 'Client mis à jour' });
  } catch (err) {
    console.error('Erreur MySQL (update):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};


// 🔹 Supprimer un client
exports.deleteClient = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM clients WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Client non trouvé' });

    res.status(200).json({ message: 'Client supprimé avec succès' });
  } catch (err) {
    console.error('Erreur MySQL (delete):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};
