const express = require('express');
const path = require('path');
const sharp = require('sharp');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para tratar JSON no corpo da requisição
app.use(express.json());

// Rota para gerar a imagem
app.post('/generate-image', async (req, res) => {
  try {
    const { category, recipient, gender, styles, type } = req.body;

    if (!category || !recipient || !gender || !styles || !type) {
      return res.status(400).json({ error: 'Todos os parâmetros são obrigatórios.' });
    }

    // Geração da mensagem
    const message = `Uma mensagem ${styles} para ${recipient} com gênero ${gender} na categoria ${category}.`;

    // Baixa a imagem de exemplo
    const imageUrl = 'https://picsum.photos/600/500.jpg';
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Erro ao baixar a imagem: ${response.statusText}`);
    }

    const imageBuffer = await response.buffer();

    // Processa a imagem com sharp
    const processedImage = await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(`
            <svg width="600" height="500" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="600" height="500" fill="rgba(0, 0, 0, 0.5)" />
              <text x="50%" y="30%" font-size="24" fill="white" text-anchor="middle" style="font-family: Arial, sans-serif;">
                ${message}
              </text>
              <text x="50%" y="90%" font-size="18" fill="white" text-anchor="middle" style="font-family: Arial, sans-serif;">
                mensagempara.com.br
              </text>
            </svg>
          `),
          top: 0,
          left: 0,
        },
      ])
      .toFormat('jpg')
      .toBuffer();

    // Retorna a imagem processada como base64
    const base64Image = `data:image/jpeg;base64,${processedImage.toString('base64')}`;

    res.status(200).json({ message, image: base64Image });
  } catch (error) {
    console.error('Erro ao processar a imagem:', error);
    res.status(500).json({ error: 'Erro interno ao gerar a imagem.', message: error.message });
  }
});

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
