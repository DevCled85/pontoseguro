import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Support base64 images up to 30MB
app.use(express.json({ limit: '30mb' }));

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    aiConfigured: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Endpoint to scan time-clock slip (canhoto de ponto) with Gemini AI
app.post('/api/scan-canhoto', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'Nenhuma imagem enviada para análise.' });
      return;
    }

    if (!apiKey) {
      res.status(503).json({
        error: 'Chave do Gemini não configurada no servidor. Insira os dados manualmente.',
      });
      return;
    }

    // Clean base64 string if data URL prefix exists
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    };

    const promptText = `Você é um especialista em ler e auditar comprovantes impressos de relógio de ponto eletrônico brasileiro (REP, Portaria 1510/671 do MTE, bobinas térmicas de ponto, canhotos impressos de batida de ponto de funcionários).
Analise detalhadamente a foto deste canhoto. Canhotos costumam ter impressão térmica (frequentemente fraca ou desbotada).
Identifique com precisão:
1. Data registrada (formato AAAA-MM-DD se legível).
2. Horários de marcação:
   - Entrada 1 (Início do expediente matutino)
   - Saída 1 (Saída para almoço/intervalo)
   - Entrada 2 (Retorno do almoço/intervalo)
   - Saída 2 (Saída final do expediente)
   Se o comprovante for de uma batida única recente (ex: apenas a batida do meio-dia), coloque esse horário no campo correspondente mais provável e mantenha os outros vazios ("").
3. Número do NSR (Número Sequencial do Registro, comum em comprovantes REP).
4. Nome ou CNPJ da empresa/empregador se legível.
5. Grau de confiança na leitura (ALTA, MEDIA ou BAIXA).
6. Resumo das linhas de texto identificadas para conferência do trabalhador e do RH.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          imagePart,
          { text: promptText },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            data: {
              type: Type.STRING,
              description: 'Data identificada no formato YYYY-MM-DD ou vazio.',
            },
            entrada: {
              type: Type.STRING,
              description: 'Horário de entrada no formato HH:mm (ex: 08:00) ou vazio.',
            },
            saidaAlmoco: {
              type: Type.STRING,
              description: 'Horário de saída de almoço no formato HH:mm (ex: 12:00) ou vazio.',
            },
            retornoAlmoco: {
              type: Type.STRING,
              description: 'Horário de retorno do almoço no formato HH:mm (ex: 13:00) ou vazio.',
            },
            saidaFinal: {
              type: Type.STRING,
              description: 'Horário de saída final do dia no formato HH:mm (ex: 17:30) ou vazio.',
            },
            nsr: {
              type: Type.STRING,
              description: 'Número sequencial do registro (NSR) impresso no canhoto ou vazio.',
            },
            empresa: {
              type: Type.STRING,
              description: 'Razão social, nome da empresa ou CNPJ impresso ou vazio.',
            },
            confianca: {
              type: Type.STRING,
              description: 'ALTA, MEDIA ou BAIXA.',
            },
            textoDetectado: {
              type: Type.STRING,
              description: 'Trecho textual lido no canhoto para conferência visual.',
            },
          },
          required: ['confianca'],
        },
      },
    });

    const outputText = response.text || '{}';
    let parsedData = {};
    try {
      parsedData = JSON.parse(outputText);
    } catch {
      parsedData = {
        data: '',
        entrada: '',
        saidaAlmoco: '',
        retornoAlmoco: '',
        saidaFinal: '',
        confianca: 'BAIXA',
        textoDetectado: outputText,
      };
    }

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Erro na extração com Gemini:', error);
    res.status(500).json({
      error: 'Não foi possível ler o canhoto automaticamente. Você pode preencher os horários manualmente.',
      details: error.message,
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PontoSeguro] Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});
