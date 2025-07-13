const express = require('express');
const { body } = require('express-validator');
const {
  createInvoice,
  getAllInvoices,
  getOneInvoice,
  updateInvoice,
  deleteInvoice,
  changeInvoiceStatus,
  getInvoicesWithDetails,
  getClientInvoicesWithDetails,
  updateInvoiceStatus,
  generateInvoicePDF
} = require('./invoice.controller');

const router = express.Router();

const invoiceValidation = [
  body('user_id').isInt().withMessage('user_id requis'),
  body('client_id').isInt().withMessage('client_id requis'),
  body('company_id').isInt().withMessage('company_id requis'),
  body('due_date').isISO8601().withMessage('due_date invalide'),
  body('status').optional().isIn(['Unpaid', 'Paid', 'Overdue']),
  body('quotation_id').optional().isInt()
];

// Routes
router.post('/', invoiceValidation, createInvoice);
router.get('/', getAllInvoices);
router.get('/:id', getOneInvoice);
router.get('/freelancer/:userId/details', getInvoicesWithDetails);
router.get('/client/:clientId/details', getClientInvoicesWithDetails);
router.patch('/:id/status', updateInvoiceStatus);
router.get('/:id/pdf', generateInvoicePDF);

router.put('/:id', updateInvoice);
router.delete('/:id', deleteInvoice);
router.patch('/:id/status', body('status').isIn(['Unpaid', 'Paid', 'Overdue']), changeInvoiceStatus);

module.exports = router;
