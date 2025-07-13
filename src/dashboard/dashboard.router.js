// src/dashboard/dashboard.router.js
const express = require('express');
const { getFreelancerDashboard, getClientDashboard } = require('./dashboard.controller');


const router = express.Router();
router.get('/freelancer/:userId', getFreelancerDashboard);
router.get('/client/:clientId', getClientDashboard);

module.exports = router;
