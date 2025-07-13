const { validationResult } = require('express-validator');
const pool = require('../../config/db');
const PDFDocument = require('pdfkit');
// ✅ Créer un devis
exports.createQuotation = async (req, res) => {
  let { user_id, client_id, company_id, status = 'Sent', notes, services = [] } = req.body;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // --- Traduire client_id (qui est en fait user_id client) en client_id réel (dans clients) ---
    const [[clientRow]] = await conn.query(
      'SELECT id FROM clients WHERE user_id = ?',
      [client_id]
    );
    if (!clientRow) {
      await conn.rollback();
      return res.status(400).json({ message: 'Client non trouvé dans la table clients' });
    }
    client_id = clientRow.id;

    // --- Insert quotations avec client_id corrigé ---
    const [quoteResult] = await conn.query(
      `INSERT INTO quotations (user_id, client_id, company_id, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [user_id, client_id, company_id, status, notes]
    );

    const quotationId = quoteResult.insertId;

    for (const item of services) {
      await conn.query(
        `INSERT INTO quotation_items (quotation_id, description, quantity, unit_price, tax_rate)
         VALUES (?, ?, ?, ?, ?)`,
        [quotationId, item.description, item.quantity, item.unit_price, item.tax_rate || 0]
      );
    }

    await conn.commit();

    res.status(201).json({
      message: '✅ Devis créé et envoyé avec succès',
      quotation_id: quotationId,
    });
  } catch (error) {
    await conn.rollback();
    console.error("Erreur MySQL (createQuotation):", error);
    res.status(500).json({ message: '❌ Erreur lors de la création du devis' });
  } finally {
    conn.release();
  }
};


// ✅ Obtenir tous les devis
exports.getAllQuotations = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM quotations ORDER BY created_at DESC');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erreur MySQL (getAll):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ✅ Obtenir un devis
exports.getOneQuotation = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query('SELECT * FROM quotations WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Devis non trouvé' });

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Erreur MySQL (getOne):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ✅ Mettre à jour un devis
exports.updateQuotation = async (req, res) => {
  const { id } = req.params;
  const { client_id, company_id, status, notes } = req.body;

  try {
    await pool.query(
      `UPDATE quotations SET client_id = ?, company_id = ?, status = ?, notes = ? WHERE id = ?`,
      [client_id, company_id, status, notes, id]
    );

    res.status(200).json({ message: 'Devis mis à jour' });
  } catch (err) {
    console.error('Erreur MySQL (update):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ✅ Supprimer un devis
exports.deleteQuotation = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM quotations WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Devis non trouvé' });

    res.status(200).json({ message: 'Devis supprimé avec succès' });
  } catch (err) {
    console.error('Erreur MySQL (delete):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ✅ Changer le statut d’un devis
exports.changeQuotationStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowedStatus = ['Draft', 'Sent', 'Approved', 'Rejected'];
  if (!allowedStatus.includes(status)) {
    return res.status(400).json({ message: 'Statut invalide' });
  }

  try {
    await pool.query(`UPDATE quotations SET status = ? WHERE id = ?`, [status, id]);
    res.status(200).json({ message: 'Statut mis à jour' });
  } catch (err) {
    console.error('Erreur MySQL (changeStatus):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};
// ✅ Obtenir tous les devis destinés à un client spécifique (en recevant user_id)

exports.getQuotationsForClient = async (req, res) => {
  const { userId } = req.params;

  try {
    // 1. Trouver client_id
    const [[clientRow]] = await pool.query(
      'SELECT id FROM clients WHERE user_id = ?',
      [userId]
    );

    if (!clientRow) {
      return res.status(404).json({ message: 'Client non trouvé dans la table clients' });
    }

    const clientId = clientRow.id;

    // 2. Obtenir les devis avec les infos utiles
      const [rows] = await pool.query(`
    SELECT 
      q.id,
      q.status,
      q.notes,
      q.created_at,
      c.name AS company_name,
      u.full_name AS freelancer_name,
      COALESCE(SUM(qi.quantity * qi.unit_price * (1 + qi.tax_rate / 100)), 0) AS total
    FROM quotations q
    JOIN companies c ON q.company_id = c.id
    JOIN users u ON q.user_id = u.id
    LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
    WHERE q.client_id = ?
    GROUP BY q.id, q.status, q.notes, q.created_at, c.name, u.full_name
    ORDER BY q.created_at DESC
  `, [clientId]);

     

    res.status(200).json(rows);
  } catch (err) {
    console.error('Erreur MySQL (getQuotationsForClient):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};


exports.getQuotationsForFreelancer = async (req, res) => {
  const { userId } = req.params; // C’est le user_id du freelancer connecté

  try {
    const [rows] = await pool.query(`
      SELECT 
        q.id,
        q.status,
        q.notes,
        q.created_at,
        c.name AS company_name,
        cu.full_name AS client_name,
        COALESCE(SUM(qi.quantity * qi.unit_price * (1 + qi.tax_rate / 100)), 0) AS total
      FROM quotations q
      JOIN companies c ON q.company_id = c.id
      JOIN clients cl ON q.client_id = cl.id
      JOIN users cu ON cl.user_id = cu.id
      LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
      WHERE q.user_id = ?
      GROUP BY q.id, q.status, q.notes, q.created_at, c.name, cu.full_name
      ORDER BY q.created_at DESC
    `, [userId]);

   
    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Erreur MySQL (getQuotationsForFreelancer):', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};
// quotation.controller.js
exports.getDetailedQuotation = async (req, res) => {
  const { id } = req.params;

  try {
   const [[quote]] = await pool.query(`
  SELECT q.id, q.status, q.notes, q.created_at,
         c.name AS company_name, 
         u.full_name AS client_name, u.email, u.address, u.phone
  FROM quotations q
  JOIN clients cl ON q.client_id = cl.id
  JOIN users u ON cl.user_id = u.id
  JOIN companies c ON q.company_id = c.id
  WHERE q.id = ?
 `, [id]);


    const [items] = await pool.query(`
      SELECT id, description, quantity, unit_price, tax_rate,
             (quantity * unit_price * (1 + tax_rate / 100)) AS total
      FROM quotation_items
      WHERE quotation_id = ?
    `, [id]);

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price * (item.tax_rate / 100), 0);
    const total = subtotal + taxAmount;

    res.json({
      ...quote,
      items,
      subtotal,
      taxRate: items[0]?.tax_rate || 0,
      taxAmount,
      total,
    });
  } catch (err) {
    console.error("❌ getDetailedQuotation error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};
exports.generateQuotePDF = async (req, res) => {
  const { id } = req.params;

  try {
    const [[quote]] = await pool.query(`
      SELECT q.id, q.status, q.notes, q.created_at,
             c.name AS company_name,
             u.full_name AS client_name, u.email AS client_email
      FROM quotations q
      JOIN clients cl ON q.client_id = cl.id
      JOIN users u ON cl.user_id = u.id
      JOIN companies c ON q.company_id = c.id
      WHERE q.id = ?
    `, [id]);

    if (!quote) return res.status(404).json({ message: "Devis introuvable" });

    const [items] = await pool.query(`
      SELECT description, quantity, unit_price, tax_rate,
             (quantity * unit_price * (1 + tax_rate / 100)) AS total
      FROM quotation_items
      WHERE quotation_id = ?
    `, [id]);

    const total = items.reduce((sum, i) => sum + i.total, 0);

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Disposition', `attachment; filename=devis-${quote.id}.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // === En-tête ===
    doc.fontSize(22).fillColor('#e11d48').text(`Devis #${quote.id}`, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).fillColor('black');
    doc.text(`Date de création : ${new Date(quote.created_at).toLocaleDateString('fr-FR')}`);
    doc.text(`Statut : ${quote.status}`);
    doc.moveDown();

    doc.fontSize(13).text(`Client : ${quote.client_name}`);
    doc.text(`Email  : ${quote.client_email}`);
    doc.text(`Entreprise : ${quote.company_name}`);
    doc.moveDown();

    // === Détail des services ===
    doc.fontSize(14).text('Détail des services :');
    doc.moveDown(0.5);

    items.forEach((item) => {
      const totalTTC = parseFloat(item.total);
      doc
        .fontSize(11)
        .text(`• ${item.description} — ${parseFloat(item.quantity).toFixed(2)} x ${parseFloat(item.unit_price).toFixed(2)} € HT`, {
          continued: true,
        })
        .text(`  (TVA: ${parseFloat(item.tax_rate).toFixed(2)}%) = ${totalTTC.toFixed(2)} € TTC`, {
          align: 'right',
        });
    });

    doc.moveDown(1.5);

    // === Total TTC ===
    const totalFormatted = total.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    doc.fontSize(16).fillColor('#16a34a').text(`TOTAL TTC : ${totalFormatted} €`, {
      align: 'right',
      underline: true,
    });

    doc.end();
  } catch (err) {
    console.error("❌ Erreur génération PDF du devis :", err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
