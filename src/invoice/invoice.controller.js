const { validationResult } = require('express-validator');
const pool = require('../../config/db');
const PDFDocument = require('pdfkit');
// ✅ Créer une facture avec items
exports.createInvoice = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });

  let {
    quotation_id = null,
    user_id,
    client_id,
    company_id,
    status = 'Unpaid',
    due_date,
    items = [] // ⬅️ très important
  } = req.body;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Insérer la facture
    const [invoiceResult] = await conn.query(
      `INSERT INTO invoices 
        (quotation_id, user_id, client_id, company_id, status, due_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [quotation_id, user_id, client_id, company_id, status, due_date]
    );

    const invoiceId = invoiceResult.insertId;

    // Insérer les items
    for (const item of items) {
      if (!item.description) continue; // ignorer les vides

      await conn.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, tax_rate)
         VALUES (?, ?, ?, ?, ?)`,
        [
          invoiceId,
          item.description,
          item.quantity,
          item.unit_price,
          item.tax_rate || 0
        ]
      );
    }

    await conn.commit();

    res.status(201).json({
      message: '✅ Facture + items créés',
      invoice_id: invoiceId
    });
  } catch (err) {
    await conn.rollback();
    console.error('❌ Erreur MySQL (createInvoice):', err);
    res.status(500).json({ message: 'Erreur serveur' });
  } finally {
    conn.release();
  }
};

// 🔹 Obtenir toutes les factures
exports.getAllInvoices = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM invoices ORDER BY created_at DESC');
    res.status(200).json(rows);
  } catch (err) {
    console.error('Erreur MySQL (getAll):', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Obtenir une facture
exports.getOneInvoice = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Facture non trouvée' });

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error('Erreur MySQL (getOne):', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Mettre à jour une facture
exports.updateInvoice = async (req, res) => {
  const { id } = req.params;
  const { quotation_id, client_id, company_id, status, due_date } = req.body;

  try {
    await pool.query(
      `UPDATE invoices 
       SET quotation_id = ?, client_id = ?, company_id = ?, status = ?, due_date = ? 
       WHERE id = ?`,
      [quotation_id, client_id, company_id, status, due_date, id]
    );

    res.status(200).json({ message: 'Facture mise à jour' });
  } catch (err) {
    console.error('Erreur MySQL (update):', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Supprimer une facture
exports.deleteInvoice = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM invoices WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Facture non trouvée' });

    res.status(200).json({ message: 'Facture supprimée' });
  } catch (err) {
    console.error('Erreur MySQL (delete):', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// 🔹 Changer le statut (Unpaid, Paid, Overdue)
exports.changeInvoiceStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ['Unpaid', 'Paid', 'Overdue'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ message: 'Statut invalide' });
  }

  try {
    await pool.query('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);
    res.status(200).json({ message: 'Statut mis à jour' });
  } catch (err) {
    console.error('Erreur MySQL (changeStatus):', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
// 🔹 Obtenir toutes les factures avec les détails du freelancer et du client
exports.getInvoicesWithDetails = async (req, res) => {
  const { userId } = req.params;

  try {
    const [rows] = await pool.query(`
      SELECT 
        i.id,
        i.status,
        i.due_date,
        i.created_at,
        i.paid_at,
        -- Total calculé dynamiquement
        COALESCE(SUM(ii.quantity * ii.unit_price * (1 + ii.tax_rate / 100)), 0) AS total,
        
        -- Freelancer
        u.full_name AS freelancer_name,
        u.email AS freelancer_email,
        u.phone AS freelancer_phone,
        u.address AS freelancer_address,

        -- Client
        cu.full_name AS client_name,
        cu.email AS client_email,
        cu.address AS client_address,
        cu.phone AS client_phone,

        -- Société
        c.name AS company_name

      FROM invoices i
      JOIN users u ON i.user_id = u.id
      JOIN clients cl ON i.client_id = cl.id
      JOIN users cu ON cl.user_id = cu.id
      JOIN companies c ON i.company_id = c.id
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id

      WHERE i.user_id = ?
      GROUP BY i.id, i.status, i.due_date, i.created_at, i.paid_at,
               u.full_name, u.email, u.phone, u.address,
               cu.full_name, cu.email, cu.address, cu.phone,
               c.name
      ORDER BY i.created_at DESC
    `, [userId]);

    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Erreur MySQL (getInvoicesWithDetails):', err.message, err.stack);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
exports.getClientInvoicesWithDetails = async (req, res) => {
  const { clientId } = req.params;

  try {
    const [rows] = await pool.query(`
      SELECT 
        i.id,
        i.status,
        i.due_date,
        i.created_at,
        i.paid_at,
        -- Total calculé dynamiquement
        COALESCE(SUM(ii.quantity * ii.unit_price * (1 + ii.tax_rate / 100)), 0) AS total,
        
        -- Freelancer
        u.full_name AS freelancer_name,
        u.email AS freelancer_email,
        u.phone AS freelancer_phone,
        u.address AS freelancer_address,

        -- Client
        cu.full_name AS client_name,
        cu.email AS client_email,
        cu.address AS client_address,
        cu.phone AS client_phone,

        -- Société
        c.name AS company_name

      FROM invoices i
      JOIN users u ON i.user_id = u.id
      JOIN clients cl ON i.client_id = cl.id
      JOIN users cu ON cl.user_id = cu.id
      JOIN companies c ON i.company_id = c.id
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id

      WHERE i.client_id = ?
      GROUP BY i.id, i.status, i.due_date, i.created_at, i.paid_at,
               u.full_name, u.email, u.phone, u.address,
               cu.full_name, cu.email, cu.address, cu.phone,
               c.name
      ORDER BY i.created_at DESC
    `, [clientId]);

    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Erreur MySQL (getClientInvoicesWithDetails):', err.message, err.stack);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
// PATCH /invoices/:id/status
exports.updateInvoiceStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await pool.query(`UPDATE invoices SET status = ?, paid_at = CASE WHEN ? = 'Paid' THEN NOW() ELSE NULL END WHERE id = ?`, [status, status, id]);
    res.status(200).json({ message: "Statut mis à jour avec succès" });
  } catch (err) {
    console.error("❌ Erreur updateInvoiceStatus:", err.message);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.generateInvoicePDF = async (req, res) => {
  const { id } = req.params;

  try {
    const [[invoice]] = await pool.query(`
      SELECT 
        i.id, i.due_date, i.created_at, i.status,
        COALESCE(SUM(ii.quantity * ii.unit_price * (1 + ii.tax_rate / 100)), 0) AS total,
        cu.full_name AS client_name, cu.email AS client_email
      FROM invoices i
      JOIN clients cl ON i.client_id = cl.id
      JOIN users cu ON cl.user_id = cu.id
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.id = ?
      GROUP BY i.id
    `, [id]);

    if (!invoice) {
      return res.status(404).json({ message: "Facture non trouvée" });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-disposition', `attachment; filename=facture-${invoice.id}.pdf`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Utiliser une police standard (sans emoji)
    doc.font('Helvetica');

    // Titre
    doc
      .fillColor('#E11D48')
      .fontSize(22)
      .text(`FACTURE #${invoice.id}`, { align: 'center' });

    doc.moveDown(2);

    // Infos client (sans emoji)
    doc
      .fillColor('black')
      .fontSize(12)
      .text(`Client : ${invoice.client_name}`)
      .text(`Email  : ${invoice.client_email}`)
      .text(`Date de création : ${new Date(invoice.created_at).toLocaleDateString('fr-FR')}`)
      .text(`Échéance         : ${new Date(invoice.due_date).toLocaleDateString('fr-FR')}`)
      .text(`Statut           : ${invoice.status}`);

    doc.moveDown();

    // Ligne séparatrice
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#E5E7EB').stroke();

    doc.moveDown(1.5);

    // Total bien formaté
    const totalFormatted = Number(invoice.total).toFixed(2).replace('.', ',') + ' €';

    doc
      .fontSize(16)
      .fillColor('#2563EB')
      .text(`TOTAL À PAYER : ${totalFormatted}`, {
        align: 'right',
        underline: true
      });

    doc.end();
  } catch (err) {
    console.error("❌ Erreur génération PDF:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
};