const express = require('express');
const router = express.Router();
const contactController = require('./ContactRequest.controller');

router.post('/contact-requests', contactController.createRequest);
router.get('/freelancers/:id/contact-requests', contactController.getRequestsForFreelancer);
router.put('/contact-requests/:id', contactController.updateRequestStatus);
router.get("/freelancer/:id/clients", contactController.getAcceptedClientsForFreelancer);
router.get('/clients/:id/freelancers', contactController.getAcceptedFreelancersForClient);

module.exports = router;
