/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import Tesseract from 'tesseract.js';

export interface ScanCanhotoResult {
  data: string; // YYYY-MM-DD
  horaDetectada: string; // HH:mm
  slotSugerido: 'entrada' | 'saidaAlmoco' | 'retornoAlmoco' | 'saidaFinal';
  entrada?: string;
  saidaAlmoco?: string;
  retornoAlmoco?: string;
  saidaFinal?: string;
  nsr?: string;
  empresa?: string;
  nome?: string;
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
 * Intelligent parser for Brazilian REP electronic time-clock receipts
 * (Portaria 1510/671 do MTE, bobinas térmicas de ponto, IdClass, Dimep, Control iD, Henry).
 */
export function parseReceiptText(text: string): {
  data: string;
  hora: string;
  nsr: string;
  empresa: string;
  nome: string;
  slotSugerido: 'entrada' | 'saidaAlmoco' | 'retornoAlmoco' | 'saidaFinal';
} {
  // 1. Data (DD/MM/AAAA)
  let data = '';
  const dateMatch =
    text.match(/DATA\s*[:\.\-]?\s*(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/i) ||
    text.match(/(\d{2})[\/\.\-](\d{2})[\/\.\-](\d{4})/);

  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      data = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // 2. Hora (HH:MM or HH.MM or O8:00)
  let hora = '';
  const timeMatch =
    text.match(/HORA\s*[:\.\-]?\s*([0-2OoeB]?[0-9B])[:\.\s]+([0-5Ooe]?[0-9B])/i) ||
    text.match(/(\b[0-2OoeB]?[0-9B])[:\.\s]+([0-5Ooe]?[0-9B])\b/);

  if (timeMatch) {
    const hh = timeMatch[1].replace(/[Ooe]/g, '0').replace(/B/g, '8').padStart(2, '0');
    const mm = timeMatch[2].replace(/[Ooe]/g, '0').replace(/B/g, '8').padStart(2, '0');
    const hNum = parseInt(hh, 10);
    const mNum = parseInt(mm, 10);
    if (hNum >= 0 && hNum <= 23 && mNum >= 0 && mNum <= 59) {
      hora = `${hh}:${mm}`;
    }
  }

  // 3. NSR (Número Sequencial do Registro)
  let nsr = '';
  const nsrMatch =
    text.match(/(?:NSR|SR)\s*[:\.\-]?\s*([0-9A-Za-z]{5,14})/i) ||
    text.match(/\b(\d{7,10})\b/);

  if (nsrMatch) {
    nsr = nsrMatch[1].replace(/A/g, '9').replace(/[Ooe]/g, '0');
  }

  // 4. Empresa
  let empresa = 'Vidronox';
  if (/VIDRONOX/i.test(text)) {
    empresa = 'Vidronox';
  }

  // 5. Nome do trabalhador
  let nome = 'Cledson do Nascimento Pereira';
  if (/CLEDSON/i.test(text)) {
    nome = 'Cledson do Nascimento Pereira';
  }

  // 6. Determine suggested slot based on hour and whether it's Saturday
  let slotSugerido: 'entrada' | 'saidaAlmoco' | 'retornoAlmoco' | 'saidaFinal' = 'entrada';
  let isSabado = false;
  if (data) {
    const parsedDate = new Date(`${data}T12:00:00`);
    if (parsedDate.getDay() === 6) {
      isSabado = true;
    }
  }

  if (hora) {
    const [h] = hora.split(':').map((n) => parseInt(n, 10));
    if (isSabado) {
      // Sábado: apenas 2 batidas pela manhã
      slotSugerido = h < 11 ? 'entrada' : 'saidaFinal';
    } else {
      // Segunda a Sexta: 4 batidas
      if (h < 10 || (h === 10 && parseInt(hora.split(':')[1], 10) < 30)) {
        slotSugerido = 'entrada';
      } else if (h < 12 || (h === 12 && parseInt(hora.split(':')[1], 10) <= 45)) {
        slotSugerido = 'saidaAlmoco';
      } else if (h < 14 || (h === 14 && parseInt(hora.split(':')[1], 10) <= 30)) {
        slotSugerido = 'retornoAlmoco';
      } else {
        slotSugerido = 'saidaFinal';
      }
    }
  }

  return { data, hora, nsr, empresa, nome, slotSugerido };
}

/**
 * Scans a printed paper receipt (canhoto de ponto).
 * Uses built-in client-side Tesseract OCR by default (requires ZERO API keys!).
 * Reports live progress percentages via onProgress callback.
 */
export async function scanCanhotoImage(
  dataUrlToScan: string,
  _mimeType = 'image/jpeg',
  onProgress?: (percent: number, statusText: string) => void
): Promise<ScanCanhotoResult> {
  if (onProgress) {
    onProgress(10, 'Iniciando leitor óptico...');
  }

  try {
    const result = await Tesseract.recognize(dataUrlToScan, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          const pct = Math.min(95, Math.max(15, Math.round(m.progress * 100)));
          onProgress(pct, `Lendo canhoto térmico... ${pct}%`);
        }
      },
    });

    const recognizedText = result.data.text || '';
    const parsed = parseReceiptText(recognizedText);

    if (onProgress) {
      onProgress(100, 'Leitura concluída com sucesso!');
    }

    const confianca: 'ALTA' | 'MEDIA' | 'BAIXA' =
      parsed.data && parsed.hora ? 'ALTA' : parsed.hora || parsed.data ? 'MEDIA' : 'BAIXA';

    const scanResult: ScanCanhotoResult = {
      data: parsed.data,
      horaDetectada: parsed.hora,
      slotSugerido: parsed.slotSugerido,
      entrada: parsed.slotSugerido === 'entrada' ? parsed.hora : '',
      saidaAlmoco: parsed.slotSugerido === 'saidaAlmoco' ? parsed.hora : '',
      retornoAlmoco: parsed.slotSugerido === 'retornoAlmoco' ? parsed.hora : '',
      saidaFinal: parsed.slotSugerido === 'saidaFinal' ? parsed.hora : '',
      nsr: parsed.nsr,
      empresa: parsed.empresa,
      nome: parsed.nome,
      confianca,
      textoDetectado: recognizedText,
    };

    return scanResult;
  } catch (err: unknown) {
    const e = err as Error;
    console.warn('Erro no OCR Tesseract:', e);
    // Fallback if worker fails
    return {
      data: new Date().toISOString().split('T')[0],
      horaDetectada: '',
      slotSugerido: 'entrada',
      confianca: 'BAIXA',
      textoDetectado: e.message,
    };
  }
}
