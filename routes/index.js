const express = require('express');

const sharp = require('sharp');
const router = express.Router();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config()

const supabase = createClient(
  process.env.SUPABASE_URL, // URL do Supabase
  process.env.SUPABASE_SERVICE_ROLE_KEY // Chave de Serviço do Supabase
);

router.post('/generate-image', async (req, res) => {
  try {
    const { category, recipient, gender, styles, type } = req.body;

    if (!category || !recipient || !gender || !styles || !type) {
      return res.status(400).json({ error: 'Todos os parâmetros são obrigatórios.' });
    }

    const basePrompt = `
      Create a short and inspiring message of ${type} in Portuguese (Brazil) for a gender: ${gender} ${recipient} on the occasion: ${category}. 
      Using this predefinitions ${styles.split(',').join(' ,')} options set by user to context message
      The message should:
        - Contain between 30 and 50 words.
        - Convey positivity, gratitude, hope, and encouragement.
        - Be culturally appropriate and aligned with Brazilian norms for the occasion.
        - Use a warm and uplifting tone, similar to: "Bom dia! Feliz é aquele que tem gratidão por tudo que conquistou, esperança para sonhar cada vez mais alto e força para lutar pelos seus objetivos! Mantenha a fé, a humildade e o amor acima de todas as coisas!"
    `

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: basePrompt
        }],
        max_tokens: 200
      })
    })

    const openaidata = await openAIResponse.json()
    const message = openaidata.choices[0].message.content

    const imageUrl = 'https://picsum.photos/600/500.webp';
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Erro ao baixar a imagem: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);


    function splitTextIntoLines(text, maxCharsPerLine) {
      const words = text.split(' ')
      const lines = []
      let currentLine = ''

      words.forEach((word) => {
        if ((currentLine + word).length > maxCharsPerLine) {
          lines.push(currentLine.trim())
          currentLine = word + ' '
        } else {
          currentLine += word + ' '
        }
      })

      if (currentLine.trim().length > 0) {
        lines.push(currentLine.trim())
      }

      return lines
    }

    const processedImage = await sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(`
            <svg width="600" height="500" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="600" height="500" fill="rgba(0, 0, 0, 0.5)" />
              <text x="50%" y="30%" font-size="24" fill="white" text-anchor="middle" style="font-family: Arial, sans-serif;">
                ${splitTextIntoLines(message, 40)
                  .map((line, index) => `<tspan x="50%" dy="${index === 0 ? 0 : 28}" text-anchor="middle">${line}</tspan>`)
                  .join('')}
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

    // Nome do arquivo com timestamp e hash
    const fileName = `${crypto.randomUUID()}.jpg`;

    // Upload para o Supabase
    const publicUrl = await uploadToSupabase(processedImage, fileName);

    const { data, error } = await supabase
    .from('messages')
    .insert([
      {
        message,
        image_url: publicUrl,
        category,
        recipient,
        gender,
        styles,
        type,
        created_at: new Date().toISOString(),
      },
    ]);

  if (error) {
    throw new Error(`Erro ao salvar na tabela messages: ${error.message}`);
  }


      
    res.status(200).json({ message, imageUrl: publicUrl, data });
} catch (error) {
    console.error('Erro ao processar a imagem:', error);
    res.status(500).json({ error: 'Erro interno ao gerar a imagem.', message: error.message });
  }
});

async function uploadToSupabase(imageBuffer, fileName) {
  const { data, error } = await supabase.storage
    .from('mensagempara') // Substitua pelo nome do bucket
    .upload(`images/${fileName}`, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  
    console.log(data)
  if (error) {
    throw new Error(`Erro ao salvar no Supabase: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from('mensagempara')
    .getPublicUrl(`images/${fileName}`);

  return publicUrlData.publicUrl;
}

module.exports = router;
