/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ScanCanhotoResult {
  data?: string;
  entrada?: string;
  saidaAlmoco?: string;
  retornoAlmoco?: string;
  saidaFinal?: string;
  nsr?: string;
  empresa?: string;
  confianca: 'ALTA' | 'MEDIA' | 'BAIXA';
  textoDetectado?: string;
}

export const STORAGE_KEY_GEMINI = 'pontoseguro_gemini_api_key';

export function getClientGeminiApiKey(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_GEMINI);
    if (saved && saved.trim()) return saved.trim();
    const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
    if (envKey && envKey.trim()) return envKey.trim();
  } catch {
    // Ignore localStorage errors
  }
  return '';
}

export function saveClientGeminiApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(STORAGE_KEY_GEMINI, key.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_GEMINI);
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Scans a printed paper receipt (canhoto de ponto) using Google Gemini.
 * It first tries the server route (/api/scan-canhoto). If running in static mode
 * (such as GitHub Pages where /api/* returns 404), it falls back directly to the client-configured
 * Gemini key via Google's official REST API endpoint.
 */
export async function scanCanhotoImage(
  dataUrlToScan: string,
  mimeType = 'image/jpeg'
): Promise<ScanCanhotoResult> {
  const cleanBase64 = dataUrlToScan.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  // 1. Try server backend route (/api/scan-canhoto)
  let serverFailedWith404 = false;
  try {
    const response = await fetch('/api/scan-canhoto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: dataUrlToScan,
        mimeType,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        return result.data as ScanCanhotoResult;
      }
    } else if (response.status === 404) {
      serverFailedWith404 = true;
    }
  } catch {
    serverFailedWith404 = true;
  }

  // 2. Client-side fallback if running on GitHub Pages (static host without Express backend)
  const clientKey = getClientGeminiApiKey();

  if (!clientKey) {
    if (serverFailedWith404) {
      throw new Error(
        'Você está no GitHub Pages (hospedagem estática sem backend). Para ativar a IA, vá em Configurações (ícone de engrenagem) e informe sua chave gratuita do Google Gemini!'
      );
    }
    throw new Error('Servidor de IA indisponível. Preencha os horários manualmente.');
  }

  // Direct call to Google Gemini REST API
  const promptText = `Você é um especialista em ler comprovantes impressos de relógio de ponto eletrônico brasileiro (REP, Portaria 1510/671 do MTE, bobinas térmicas de ponto, canhotos impressos de batida de ponto).
Analise a foto deste canhoto térmico. Identifique com precisão:
1. Data registrada (formato AAAA-MM-DD se legível).
2. Horários de marcação:
   - entrada: Horário de entrada da manhã (HH:mm ou vazio).
   - saidaAlmoco: Horário de saída de almoço (HH:mm ou vazio).
   - retornoAlmoco: Horário de volta do almoço (HH:mm ou vazio).
   - saidaFinal: Horário de saída final do expediente (HH:mm ou vazio).
3. nsr: Número Sequencial do Registro impresso no canhoto.
4. empresa: Nome da empresa ou CNPJ.
5. confianca: ALTA, MEDIA ou BAIXA.
6. textoDetectado: Linhas de texto legíveis.
Responda EXCLUSIVAMENTE em formato JSON com esses campos.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
    clientKey
  )}`;

  const body = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: cleanBase64,
            },
          },
          { text: promptText },
        ],
      },
    ],
    generationConfig: {
      response_mime_type: 'application/json',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    const message =
      (errorJson as { error?: { message?: string } })?.error?.message ||
      `Erro na API Gemini (${response.status})`;
    throw new Error(`Falha na IA direta: ${message}`);
  }

  const json = await response.json();
  const textOutput =
    json?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

  try {
    const parsed = JSON.parse(textOutput);
    return {
      data: parsed.data || '',
      entrada: parsed.entrada || '',
      saidaAlmoco: parsed.saidaAlmoco || '',
      retornoAlmoco: parsed.retornoAlmoco || '',
      saidaFinal: parsed.saidaFinal || '',
      nsr: parsed.nsr || '',
      empresa: parsed.empresa || '',
      confianca: parsed.confianca || 'MEDIA',
      textoDetectado: parsed.textoDetectado || textOutput,
    };
  } catch {
    return {
      confianca: 'BAIXA',
      textoDetectado: textOutput,
    };
  }
}
