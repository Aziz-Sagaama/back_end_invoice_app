const pool = require('../../config/db');

// POST /contact-requests
exports.createRequest = async (req, res) => {
  const { client_id, freelancer_id } = req.body;

  if (!client_id || !freelancer_id) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  try {
    await pool.query(
      `INSERT INTO contact_requests (client_id, freelancer_id)
       VALUES (?, ?)`,
      [client_id, freelancer_id]
    );

    res.status(201).json({ message: "Demande envoyée avec succès" });
  } catch (error) {
    console.error("Erreur MySQL (createRequest):", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// GET /freelancers/:id/contact-requests
exports.getRequestsForFreelancer = async (req, res) => {
  const freelancer_id = req.params.id;

  try {
    const [rows] = await pool.query(
      `SELECT cr.id, cr.client_id, u.full_name, u.email, cr.status, cr.created_at
       FROM contact_requests cr
       JOIN users u ON cr.client_id = u.id
       WHERE cr.freelancer_id = ?
       ORDER BY cr.created_at DESC`,
      [freelancer_id]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("Erreur MySQL (getRequestsForFreelancer):", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// PUT /contact-requests/:id
exports.updateRequestStatus = async (req, res) => {
  const requestId = req.params.id;
  const { status } = req.body;

  if (!['accepted', 'refused'].includes(status)) {
    return res.status(400).json({ message: "Statut invalide" });
  }

  try {
    await pool.query(
      `UPDATE contact_requests SET status = ? WHERE id = ?`,
      [status, requestId]
    );

    res.status(200).json({ message: `Demande ${status}` });
  } catch (error) {
    console.error("Erreur MySQL (updateRequestStatus):", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// GET accepted clients for a freelancer
exports.getAcceptedClientsForFreelancer = async (req, res) => {
  const freelancerId = req.params.id;

  try {
    const [rows] = await pool.query(`
      SELECT 
        users.id, users.full_name, users.email, users.phone, users.address
      FROM contact_requests
      JOIN users ON contact_requests.client_id = users.id
      WHERE contact_requests.freelancer_id = ? AND contact_requests.status = 'accepted'
    `, [freelancerId]);

    res.status(200).json(rows);
  } catch (err) {
    console.error("Erreur MySQL (getAcceptedClientsForFreelancer):", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.getAcceptedFreelancersForClient = async (req, res) => {
  const clientId = req.params.id;

  try {
    const [rows] = await pool.query(`
      SELECT 
        users.id, users.full_name, users.email, users.profile_picture, users.description
      FROM contact_requests
      JOIN users ON contact_requests.freelancer_id = users.id
      WHERE contact_requests.client_id = ? AND contact_requests.status = 'accepted'
    `, [clientId]);

    res.status(200).json(rows);
  } catch (err) {
    console.error("Erreur MySQL (getAcceptedFreelancersForClient):", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
