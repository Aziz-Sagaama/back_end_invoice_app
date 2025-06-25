const express = require('express');
const app = express();
const port = 3001;

// Middleware
app.use(express.json()); // Parse les requêtes JSON

// Routes
const createUser = require('./src/user/createUser');
app.use('/auth/signupUser', createUser);
const loginRouter = require('./src/auth/login');
app.use('/auth/login', loginRouter);
// Route test
app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.post('/test-json', (req, res) => {
  console.log('Test JSON:', req.body);
  res.json({ success: true, body: req.body });
});
// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Erreur serveur');
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});