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

export function hasGeminiApiKey(): boolean {
  return Boolean(getClientGeminiApiKey());
}

/**
 * Scans a printed paper receipt (canhoto de ponto) using Google Gemini.
 * It first tries the server route (/api/scan-canhoto). If running in static mode
 * (such as GitHub Pages where /api/* returns 404), it falls back directly to the client-configured
 * Gemini key via Google's official REST API endpoint with model fallback.
 */
export async function scanCanhotoImage(
  dataUrlToScan: string,
  mimeType = 'image/jpeg',
  overrideKey?: string
): Promise<ScanCanhotoResult> {
  const cleanBase64 = dataUrlToScan.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  // 1. Try server backend route (/api/scan-canhoto) if not on static GitHub Pages
  const isGitHubPages = window.location.hostname.includes('github.io');
  if (!isGitHubPages) {
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
      }
    } catch {
      // Backend not available, continue to client-side Gemini call
    }
  }

  // 2. Client-side Gemini REST API call (essential for GitHub Pages)
  const clientKey = (overrideKey && overrideKey.trim()) || getClientGeminiApiKey();

  if (!clientKey) {
    throw new Error(
      'MISSING_KEY: Chave do Google Gemini não configurada. Insira sua chave gratuita para ativar a leitura com IA.'
    );
  }

  const promptText = `Você é um especialista em ler comprovantes impressos de relógio de ponto eletrônico brasileiro (REP, Portaria 1510/671 do MTE, bobinas térmicas de ponto, canhotos impressos de batida de ponto).
Analise a foto deste canhoto térmico. Identifique com precisão:
1. data: Data registrada (formato AAAA-MM-DD se legível).
2. Horários de marcação:
   - entrada: Horário de entrada da manhã (formato HH:mm, ex: "08:00" ou vazio se não houver).
   - saidaAlmoco: Horário de saída de almoço (formato HH:mm, ex: "12:00" ou vazio se não houver).
   - retornoAlmoco: Horário de volta do almoço (formato HH:mm, ex: "13:00" ou vazio se não houver).
   - saidaFinal: Horário de saída final do expediente (formato HH:mm, ex: "17:30" ou vazio se não houver).
3. nsr: Número Sequencial do Registro impresso no canhoto.
4. empresa: Nome da empresa ou CNPJ.
5. confianca: ALTA, MEDIA ou BAIXA.
6. textoDetectado: Linhas de texto legíveis.
Responda EXCLUSIVAMENTE em formato JSON com esses campos. Não use blocos de código markdown desnecessários.`;

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

  // Try models in order: gemini-2.5-flash, then gemini-2.0-flash, then gemini-1.5-flash
  const candidateModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = '';

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        clientKey
      )}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
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
      } else {
        const errJson = await response.json().catch(() => ({}));
        const errMsg =
          (errJson as { error?: { message?: string } })?.error?.message ||
          `HTTP ${response.status}`;
        lastError = errMsg;
        // If 404 (model not found), proceed to next candidate model
        if (response.status === 404) {
          continue;
        } else {
          throw new Error(errMsg);
        }
      }
    } catch (err: unknown) {
      const e = err as Error;
      if (e.message && !e.message.includes('404')) {
        throw e;
      }
      lastError = e.message;
    }
  }

  throw new Error(`Falha ao conectar na IA Gemini: ${lastError || 'Não foi possível ler a imagem'}`);
}
