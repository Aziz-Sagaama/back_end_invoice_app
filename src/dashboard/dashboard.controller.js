// src/dashboard/dashboard.controller.js
const pool = require('../../config/db');
exports.getFreelancerDashboard = async (req, res) => {
  const userId = req.params.userId;

  try {
    // Nombre de devis envoyés
    const [[sentQuotes]] = await pool.query(
      `SELECT COUNT(*) as count FROM quotations WHERE user_id = ? AND status = 'Sent'`, [userId]
    );

    // Nombre de devis approuvés
    const [[approvedQuotes]] = await pool.query(
      `SELECT COUNT(*) as count FROM quotations WHERE user_id = ? AND status = 'Approved'`, [userId]
    );

    // Total facturé (invoices payées)
    const [[totalBilled]] = await pool.query(`
      SELECT COALESCE(SUM(ii.quantity * ii.unit_price * (1 + ii.tax_rate / 100)), 0) AS total
      FROM invoices i
      JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.user_id = ? AND i.status = 'Paid'
    `, [userId]);

    // Total en attente (invoices non payées ou en retard)
    const [[totalPending]] = await pool.query(`
      SELECT COALESCE(SUM(ii.quantity * ii.unit_price * (1 + ii.tax_rate / 100)), 0) AS total
      FROM invoices i
      JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.user_id = ? AND i.status IN ('Unpaid', 'Overdue')
    `, [userId]);

    // Nombre de factures en attente
    const [[pendingInvoices]] = await pool.query(`
      SELECT COUNT(*) as count FROM invoices WHERE user_id = ? AND status IN ('Unpaid', 'Overdue')
    `, [userId]);

    // Activité récente : dernières factures (max 5)
    const [activities] = await pool.query(`
      SELECT 
        i.id AS invoice_id,
        c.name AS client,
        i.status,
        i.paid_at,
        i.created_at,
        COALESCE(SUM(ii.quantity * ii.unit_price * (1 + ii.tax_rate / 100)), 0) AS total
      FROM invoices i
      JOIN clients c ON c.id = i.client_id
      JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.user_id = ?
      GROUP BY i.id
      ORDER BY i.created_at DESC
      LIMIT 5
    `, [userId]);

    const recentActivity = activities.map(row => ({
      id: row.invoice_id,
      title: `Facture #${row.invoice_id}`,
      client: row.client,
      date: row.paid_at || row.created_at,
      type: row.paid_at ? 'payment' : 'invoice',
      status: row.status,
      amount: row.total
    }));

    res.json({
      quotesCount: {
        sent: sentQuotes.count,
        approved: approvedQuotes.count,
        growth: 8 // à calculer dynamiquement si tu veux
      },
      revenue: {
        billed: totalBilled.total,
        pending: totalPending.total,
        pendingInvoices: pendingInvoices.count,
        growth: 12
      },
      recentActivity // ✅ inclus dans la réponse
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur dashboard' });
  }
};
exports.getClientDashboard = async (req, res) => {
  const clientId = req.params.clientId;

  try {
    // Nombre de devis en attente
    const [[pendingQuotes]] = await pool.query(
      `SELECT COUNT(*) AS count FROM quotations WHERE client_id = ? AND status = 'Sent'`, [clientId]
    );

    // Nombre de devis approuvés
    const [[approvedQuotes]] = await pool.query(
      `SELECT COUNT(*) AS count FROM quotations WHERE client_id = ? AND status = 'Approved'`, [clientId]
    );

    // Nombre de factures impayées
    const [[unpaidInvoices]] = await pool.query(
      `SELECT COUNT(*) AS count FROM invoices WHERE client_id = ? AND status IN ('Unpaid', 'Overdue')`, [clientId]
    );

    // Montant total dû
    const [[totalUnpaid]] = await pool.query(`
      SELECT COALESCE(SUM(ii.quantity * ii.unit_price * (1 + ii.tax_rate / 100)), 0) AS total
      FROM invoices i
      JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.client_id = ? AND i.status IN ('Unpaid', 'Overdue')
    `, [clientId]);

    // Devis récents
    const [recentQuotes] = await pool.query(
      `SELECT id, status, created_at FROM quotations WHERE client_id = ? ORDER BY created_at DESC LIMIT 3`, [clientId]
    );

    // Factures récentes
    const [recentInvoices] = await pool.query(
      `SELECT id, status, due_date FROM invoices WHERE client_id = ? ORDER BY created_at DESC LIMIT 3`, [clientId]
    );

    res.json({
      pendingQuotes: pendingQuotes.count,
      approvedQuotes: approvedQuotes.count,
      unpaidInvoices: unpaidInvoices.count,
      totalUnpaid: totalUnpaid.total,
      recentQuotes,
      recentInvoices
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors du chargement du tableau de bord client' });
  }
};
