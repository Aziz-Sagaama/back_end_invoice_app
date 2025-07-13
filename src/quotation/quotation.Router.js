const express = require('express');
const { body } = require('express-validator');
const {
  createQuotation,
  getAllQuotations,
  getOneQuotation,
  updateQuotation,
  deleteQuotation,
  changeQuotationStatus,
  getQuotationsForClient,
  getQuotationsForFreelancer,
  getDetailedQuotation,
  generateQuotePDF,

} = require('./quotation.controller');

const router = express.Router();

const quotationValidation = [
  body('user_id').isInt().withMessage('user_id requis'),
  body('client_id').isInt().withMessage('client_id requis'),
  body('company_id').isInt().withMessage('company_id requis'),
  body('status').optional().isIn(['Draft', 'Sent', 'Approved', 'Rejected']),
  body('notes').optional().isString()
];

// 🔹 Routes CRUD
router.post('/', quotationValidation, createQuotation);
router.get('/', getAllQuotations);
router.get('/:id', getOneQuotation);
router.put('/:id', updateQuotation);
router.delete('/:id', deleteQuotation);
router.get('/client/:userId', getQuotationsForClient);
router.get('/freelancer/:userId',getQuotationsForFreelancer);
router.get('/details/:id', getDetailedQuotation);
router.get('/:id/pdf', generateQuotePDF);



// 🔹 Changer le statut
router.patch('/:id/status', body('status').isIn(['Draft', 'Sent', 'Approved', 'Rejected']), changeQuotationStatus);

module.exports = router;
