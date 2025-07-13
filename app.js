const express = require('express');
const companyRoutes = require('./src/company/company.Router')
const userRoutes= require('./src/user/user.Router');
const quotationRoutes=require('./src/quotation/quotation.Router');
const clientRoutes =require('./src/client/client.Router');
const invoiceRoutes=require('./src/invoice/invoice.Router')
const contactRoutes = require('./src/contactrequest/ContactRequest.router');
const dashboardRoutes=require('./src/dashboard/dashboard.router');
const path = require('path');
const fs = require('fs');
const cors = require("cors");
const app = express();
const port = 3000;



app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
// Routes
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath);
}
const loginRouter = require('./src/auth/login');
app.use('/login', loginRouter);
app.use('/companies', companyRoutes);
app.use('/users', userRoutes);
app.use('/quotations',quotationRoutes);
app.use('/clients',clientRoutes)
app.use('/invoices',invoiceRoutes)
app.use(contactRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Route test

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Erreur serveur');
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});