export type StatusRh = 'pendente' | 'divergencia' | 'aprovado';

export interface PontoRegistro {
  id: string;
  data: string; // YYYY-MM-DD
  entrada: string; // HH:mm
  saidaAlmoco: string; // HH:mm
  retornoAlmoco: string; // HH:mm
  saidaFinal: string; // HH:mm
  totalMinutosTrabalhados: number;
  totalMinutosIntervalo: number;
  saldoMinutos: number; // Positive = extra, negative = deficit
  fotoUrl: string; // Base64 data URL
  fotoNome?: string;
  nsr?: string; // Número Sequencial de Registro do REP
  empresa?: string;
  statusRh: StatusRh;
  motivoDivergencia?: string;
  observacoes?: string;
  isSabado?: boolean;
  fotosBatidas?: {
    tipo: 'entrada' | 'saidaAlmoco' | 'retornoAlmoco' | 'saidaFinal';
    hora: string;
    nsr?: string;
    fotoUrl: string;
    criadoEm: string;
  }[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface UserSecurityConfig {
  hasPin: boolean;
  pinHash: string;
  securityQuestion?: string;
  securityAnswerHash?: string;
  autoLockMinutes: number; // 0 for disabled
  lastActiveTimestamp: number;
  userName: string;
  jornadaPadraoMinutos: number; // default 480 (8 hours)
  empresaPadrao: string;
}

export interface AiScanResult {
  data?: string;
  entrada?: string;
  saidaAlmoco?: string;
  retornoAlmoco?: string;
  saidaFinal?: string;
  nsr?: string;
  empresa?: string;
  confianca?: 'ALTA' | 'MEDIA' | 'BAIXA';
  textoDetectado?: string;
}
