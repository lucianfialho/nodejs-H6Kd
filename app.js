const express = require('express');
const path = require('path');
const cors = require('cors');
const indexRouter = require('./routes/index'); // Importa o roteador

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = ['https://www.mensagempara.com.br', 'http://localhost:3000'];

app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Registra o roteador principal
app.use('/', indexRouter);

// Catch-all para 404
app.use((req, res) => {
  console.error(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
