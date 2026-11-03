import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Clock,
  Building2,
  AlertTriangle,
  RotateCw,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Key,
} from 'lucide-react';
import { PontoRegistro, StatusRh } from '../types/ponto';
import {
  calculateJornada,
  getTodayDateString,
  getYesterdayDateString,
  minutesToTimeString,
} from '../utils/timeCalculations';
import { compressAndReadFile } from '../utils/imageUtils';
import {
  scanCanhotoImage,
  hasGeminiApiKey,
  getClientGeminiApiKey,
  saveClientGeminiApiKey,
} from '../services/aiScanner';

interface PontoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (registro: PontoRegistro) => Promise<void>;
  initialData?: PontoRegistro | null;
  preselectedDate?: string;
  defaultEmpresa?: string;
  jornadaPadraoMinutos?: number;
}

export const PontoFormModal: React.FC<PontoFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  preselectedDate,
  defaultEmpresa = '',
  jornadaPadraoMinutos = 480,
}) => {
  const [data, setData] = useState(preselectedDate || getTodayDateString());
  const [entrada, setEntrada] = useState('');
  const [saidaAlmoco, setSaidaAlmoco] = useState('');
  const [retornoAlmoco, setRetornoAlmoco] = useState('');
  const [saidaFinal, setSaidaFinal] = useState('');
  const [nsr, setNsr] = useState('');
  const [empresa, setEmpresa] = useState(defaultEmpresa);
  const [statusRh, setStatusRh] = useState<StatusRh>('pendente');
  const [motivoDivergencia, setMotivoDivergencia] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Photo state
  const [fotoUrl, setFotoUrl] = useState('');
  const [fotoNome, setFotoNome] = useState('');
  const [fotoTamanhoOriginal, setFotoTamanhoOriginal] = useState<number | null>(null);

  // AI Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanConfidence, setScanConfidence] = useState<'ALTA' | 'MEDIA' | 'BAIXA' | null>(null);

  // Gemini API Key inline configuration for GitHub Pages
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [keySavedMessage, setKeySavedMessage] = useState('');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Populate data when editing
  useEffect(() => {
    if (initialData) {
      setData(initialData.data);
      setEntrada(initialData.entrada || '');
      setSaidaAlmoco(initialData.saidaAlmoco || '');
      setRetornoAlmoco(initialData.retornoAlmoco || '');
      setSaidaFinal(initialData.saidaFinal || '');
      setNsr(initialData.nsr || '');
      setEmpresa(initialData.empresa || defaultEmpresa);
      setStatusRh(initialData.statusRh);
      setMotivoDivergencia(initialData.motivoDivergencia || '');
      setObservacoes(initialData.observacoes || '');
      setFotoUrl(initialData.fotoUrl || '');
      setFotoNome(initialData.fotoNome || '');
      setScanMessage(null);
      setScanConfidence(null);
      setShowApiKeyPrompt(false);
    } else {
      setData(preselectedDate || getTodayDateString());
      setEntrada('');
      setSaidaAlmoco('');
      setRetornoAlmoco('');
      setSaidaFinal('');
      setNsr('');
      setEmpresa(defaultEmpresa);
      setStatusRh('pendente');
      setMotivoDivergencia('');
      setObservacoes('');
      setFotoUrl('');
      setFotoNome('');
      setScanMessage(null);
      setScanConfidence(null);
      setShowApiKeyPrompt(false);
    }
    setFormError('');
  }, [initialData, preselectedDate, defaultEmpresa, isOpen]);

  if (!isOpen) return null;

  // Real-time calculation of daily hours
  const { totalMinutosTrabalhados, totalMinutosIntervalo, saldoMinutos } = calculateJornada(
    entrada,
    saidaAlmoco,
    retornoAlmoco,
    saidaFinal,
    jornadaPadraoMinutos
  );

  const handleFileSelected = async (file: File) => {
    try {
      setFormError('');
      const compressed = await compressAndReadFile(file, 1024, 0.72);
      setFotoUrl(compressed.dataUrl);
      setFotoNome(file.name || 'canhoto_foto.jpg');
      setFotoTamanhoOriginal(compressed.originalSize);
      setScanMessage('Foto anexada com sucesso! Você pode salvar diretamente ou clicar em "Ler com IA" para extrair os horários.');

      // If user already configured Gemini API key or backend is available, scan automatically
      const isGitHubPages = window.location.hostname.includes('github.io');
      if (!isGitHubPages || hasGeminiApiKey()) {
        if (!entrada && !saidaFinal) {
          scanImageWithAi(compressed.dataUrl);
        }
      }
    } catch (err: unknown) {
      const e = err as Error;
      setFormError('Erro ao carregar foto: ' + e.message);
    }
  };

  const handleSaveKeyAndScan = async () => {
    if (!customKeyInput.trim()) {
      setFormError('Por favor, cole sua chave do Google Gemini.');
      return;
    }
    saveClientGeminiApiKey(customKeyInput.trim());
    setKeySavedMessage('Chave salva com sucesso!');
    setShowApiKeyPrompt(false);
    if (fotoUrl) {
      await scanImageWithAi(fotoUrl, customKeyInput.trim());
    }
  };

  const scanImageWithAi = async (dataUrlToScan: string, keyOverride?: string) => {
    if (!dataUrlToScan) {
      setFormError('Tire ou selecione uma foto do canhoto antes de escanear.');
      return;
    }

    const isGitHubPages = window.location.hostname.includes('github.io');
    const effectiveKey = keyOverride || getClientGeminiApiKey();

    if (isGitHubPages && !effectiveKey) {
      setShowApiKeyPrompt(true);
      return;
    }

    setIsScanning(true);
    setScanMessage('Analisando caracteres do canhoto térmico com IA...');
    setScanConfidence(null);
    setFormError('');

    try {
      const extracted = await scanCanhotoImage(dataUrlToScan, 'image/jpeg', effectiveKey);
      let filledCount = 0;

      if (extracted.data && /^\d{4}-\d{2}-\d{2}$/.test(extracted.data)) {
        setData(extracted.data);
      }
      if (extracted.entrada) {
        setEntrada(extracted.entrada);
        filledCount++;
      }
      if (extracted.saidaAlmoco) {
        setSaidaAlmoco(extracted.saidaAlmoco);
        filledCount++;
      }
      if (extracted.retornoAlmoco) {
        setRetornoAlmoco(extracted.retornoAlmoco);
        filledCount++;
      }
      if (extracted.saidaFinal) {
        setSaidaFinal(extracted.saidaFinal);
        filledCount++;
      }
      if (extracted.nsr) {
        setNsr(extracted.nsr);
      }
      if (extracted.empresa && !empresa) {
        setEmpresa(extracted.empresa);
      }

      setScanConfidence(extracted.confianca || 'MEDIA');
      setScanMessage(
        filledCount > 0
          ? `IA identificou ${filledCount} horário(s) no canhoto. Verifique e confirme abaixo.`
          : 'Canhoto analisado. Confira os horários nos campos abaixo.'
      );
    } catch (err: unknown) {
      const e = err as Error;
      setScanMessage(null);
      if (e.message && e.message.includes('MISSING_KEY')) {
        setShowApiKeyPrompt(true);
      } else {
        setFormError('Leitura automática: ' + e.message + '. Você pode preencher os horários manualmente.');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleFillStandardHours = () => {
    setEntrada('08:00');
    setSaidaAlmoco('12:00');
    setRetornoAlmoco('13:00');
    setSaidaFinal('17:00');
    setScanMessage('Horários padrão preenchidos (8h de jornada). Ajuste se necessário.');
  };

  const handleFillCurrentTime = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    if (!entrada) {
      setEntrada(timeStr);
      setScanMessage(`Entrada preenchida com hora atual: ${timeStr}`);
    } else if (!saidaAlmoco) {
      setSaidaAlmoco(timeStr);
      setScanMessage(`Saída almoço preenchida com hora atual: ${timeStr}`);
    } else if (!retornoAlmoco) {
      setRetornoAlmoco(timeStr);
      setScanMessage(`Volta almoço preenchida com hora atual: ${timeStr}`);
    } else {
      setSaidaFinal(timeStr);
      setScanMessage(`Saída final preenchida com hora atual: ${timeStr}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) {
      setFormError('Informe a data do registro de ponto.');
      return;
    }

    if (!entrada && !saidaFinal) {
      setFormError('Preencha ao menos um horário de marcação (ex: Entrada ou Saída).');
      return;
    }

    // Photo is recommended but not blocking
    setIsSaving(true);
    try {
      const id = initialData ? initialData.id : `ponto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();

      const registro: PontoRegistro = {
        id,
        data,
        entrada: entrada.trim(),
        saidaAlmoco: saidaAlmoco.trim(),
        retornoAlmoco: retornoAlmoco.trim(),
        saidaFinal: saidaFinal.trim(),
        totalMinutosTrabalhados,
        totalMinutosIntervalo,
        saldoMinutos,
        fotoUrl,
        fotoNome: fotoNome || 'comprovante.jpg',
        nsr: nsr.trim(),
        empresa: empresa.trim(),
        statusRh,
        motivoDivergencia: statusRh === 'divergencia' ? motivoDivergencia.trim() : '',
        observacoes: observacoes.trim(),
        criadoEm: initialData ? initialData.criadoEm : nowIso,
        atualizadoEm: nowIso,
      };

      await onSave(registro);
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setFormError('Erro ao salvar no banco de dados: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {initialData ? 'Editar Canhoto de Ponto' : 'Novo Comprovante de Ponto'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fotografe o canhoto impresso e registre suas batidas para auditoria
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {formError && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section: Canhoto Photo Capture */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Foto do Canhoto / Comprovante Físico
              </label>
              {fotoUrl && (
                <button
                  type="button"
                  onClick={() => scanImageWithAi(fotoUrl)}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isScanning ? 'Lendo...' : 'Re-escanear com IA'}</span>
                </button>
              )}
            </div>

            {/* Hidden inputs for camera capture vs file gallery */}
            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                e.target.value = '';
              }}
            />
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                e.target.value = '';
              }}
            />

            {/* Inline Gemini API Key Setup for GitHub Pages */}
            {showApiKeyPrompt && (
              <div className="mt-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs space-y-2.5">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Ativar Leitor Inteligente de Canhoto por IA
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">
                      No GitHub Pages (site online), informe uma vez sua chave gratuita do Google Gemini para ler fotos de canhotos automaticamente.
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    value={customKeyInput}
                    onChange={(e) => setCustomKeyInput(e.target.value)}
                    placeholder="Cole aqui sua chave Gemini (AIzaSy...)"
                    className="flex-1 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveKeyAndScan}
                    disabled={isScanning}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{isScanning ? 'Lendo...' : 'Salvar e Ler Foto'}</span>
                  </button>
                </div>

                {keySavedMessage && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {keySavedMessage}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-500/20 text-[11px]">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 dark:text-emerald-300 font-semibold underline inline-flex items-center gap-1"
                  >
                    <span>Criar chave gratuita no Google AI Studio</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFillStandardHours}
                      className="text-slate-600 dark:text-slate-300 hover:text-emerald-600 hover:underline cursor-pointer"
                    >
                      Preencher 08h-17h
                    </button>
                    <span className="text-slate-300 dark:text-slate-600">·</span>
                    <button
                      type="button"
                      onClick={() => setShowApiKeyPrompt(false)}
                      className="text-slate-500 dark:text-slate-400 hover:underline cursor-pointer"
                    >
                      Preencher Manualmente
                    </button>
                  </div>
                </div>
              </div>
            )}

            {fotoUrl ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 mt-3">
                <div className="relative h-44 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white shadow-sm">
                  <img
                    src={fotoUrl}
                    alt="Canhoto"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover object-top"
                  />
                  {isScanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white backdrop-blur-xs p-2 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-400 mb-1" />
                      <span className="text-[10px] font-medium leading-tight">Lendo comprovante...</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  <div className="text-slate-700 dark:text-slate-300 font-medium">
                    Canhoto capturado com sucesso
                  </div>

                  {scanMessage && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-2 text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                      <div>
                        <span>{scanMessage}</span>
                        {scanConfidence && (
                          <span className="block mt-0.5 text-[10px] opacity-80">
                            Confiança da leitura: {scanConfidence}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => scanImageWithAi(fotoUrl)}
                      disabled={isScanning}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{isScanning ? 'Lendo...' : 'Ler com IA (Opcional)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>Tirar Outra</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Galeria</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowApiKeyPrompt((prev) => !prev)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/10 text-xs font-medium transition-colors cursor-pointer"
                      title="Configurar chave do Google Gemini para IA"
                    >
                      <Key className="h-3.5 w-3.5" />
                      <span>Chave IA</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Camera Button */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-500 text-emerald-800 dark:text-emerald-300 transition-all cursor-pointer active:scale-98"
                >
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Camera className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold">Fotografar Canhoto Agora</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                    Abre a câmera do celular ou webcam
                  </span>
                </button>

                {/* Upload Button */}
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-400 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 transition-all cursor-pointer active:scale-98"
                >
                  <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <Upload className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold">Enviar Foto da Galeria</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                    Selecione um arquivo de foto ou print
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Section: Date and NSR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Data do Ponto *
                </label>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setData(getTodayDateString())}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Hoje
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">·</span>
                  <button
                    type="button"
                    onClick={() => setData(getYesterdayDateString())}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Ontem
                  </button>
                </div>
              </div>
              <input
                type="date"
                required
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                NSR / Comprovante REP (opcional)
              </label>
              <input
                type="text"
                value={nsr}
                onChange={(e) => setNsr(e.target.value)}
                placeholder="Ex: 00039481"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section: 4 Working Times with Quick Fill helpers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                2. Horários da Jornada (HH:mm)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFillStandardHours}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  title="Preencher 08:00 - 12:00 - 13:00 - 17:00"
                >
                  08h às 17h
                </button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <button
                  type="button"
                  onClick={handleFillCurrentTime}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  title="Preencher com o horário atual"
                >
                  Hora Atual
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Entrada */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  1ª Entrada
                </label>
                <input
                  type="time"
                  value={entrada}
                  onChange={(e) => setEntrada(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-base font-bold font-mono text-slate-900 dark:text-white text-center focus:border-emerald-500 focus:outline-none"
                />
                <span className="mt-1 block text-[10px] text-slate-400 text-center">Início do dia</span>
              </div>

              {/* Saída Almoço */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Saída Almoço
                </label>
                <input
                  type="time"
                  value={saidaAlmoco}
                  onChange={(e) => setSaidaAlmoco(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-base font-bold font-mono text-slate-900 dark:text-white text-center focus:border-emerald-500 focus:outline-none"
                />
                <span className="mt-1 block text-[10px] text-slate-400 text-center">Início refeição</span>
              </div>

              {/* Volta Almoço */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  Volta Almoço
                </label>
                <input
                  type="time"
                  value={retornoAlmoco}
                  onChange={(e) => setRetornoAlmoco(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-base font-bold font-mono text-slate-900 dark:text-white text-center focus:border-emerald-500 focus:outline-none"
                />
                <span className="mt-1 block text-[10px] text-slate-400 text-center">Fim refeição</span>
              </div>

              {/* Saída Final */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2.5">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  2ª Saída Final
                </label>
                <input
                  type="time"
                  value={saidaFinal}
                  onChange={(e) => setSaidaFinal(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-base font-bold font-mono text-slate-900 dark:text-white text-center focus:border-emerald-500 focus:outline-none"
                />
                <span className="mt-1 block text-[10px] text-slate-400 text-center">Fim do trabalho</span>
              </div>
            </div>

            {/* Live Calculation Strip */}
            <div className="mt-3 flex flex-wrap items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/40 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Horas Trabalhadas:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                  {minutesToTimeString(totalMinutosTrabalhados)}
                </span>
              </div>

              {totalMinutosIntervalo > 0 && (
                <div className="text-slate-500 dark:text-slate-400">
                  Almoço: <span className="font-mono font-medium">{minutesToTimeString(totalMinutosIntervalo)}</span>
                </div>
              )}

              <div>
                <span>Saldo vs Escala ({minutesToTimeString(jornadaPadraoMinutos)}): </span>
                <span
                  className={`font-mono font-bold ${
                    saldoMinutos > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : saldoMinutos < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {saldoMinutos > 0 ? '+' : ''}
                  {minutesToTimeString(saldoMinutos)}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Status regarding RH */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              3. Status com o RH
            </label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatusRh('aprovado')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                  statusRh === 'aprovado'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Conferido e Ok</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusRh('divergencia')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                  statusRh === 'divergencia'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 ring-2 ring-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Divergência / Erro RH</span>
              </button>

              <button
                type="button"
                onClick={() => setStatusRh('pendente')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                  statusRh === 'pendente'
                    ? 'border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ring-2 ring-slate-400/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <RotateCw className="h-4 w-4 text-slate-400 shrink-0" />
                <span>Pendente de Checagem</span>
              </button>
            </div>

            {/* Motivo de divergência se selecionado */}
            {statusRh === 'divergencia' && (
              <div className="mt-3">
                <label className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                  Descreva o erro do RH (para mostrar ao gerente) *
                </label>
                <textarea
                  rows={2}
                  required
                  value={motivoDivergencia}
                  onChange={(e) => setMotivoDivergencia(e.target.value)}
                  placeholder="Ex: O espelho do RH não computou a batida das 18:15 e descontou horas indevidamente."
                  className="mt-1 w-full rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 p-3 text-xs text-rose-950 dark:text-rose-100 placeholder:text-rose-400/70 focus:border-rose-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Section: Observações gerais e Empresa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Empresa / Empregador
              </label>
              <input
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Ex: Razão Social ou Nome Fantasia"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Observações Pessoais
              </label>
              <input
                type="text"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Saí 15 min mais tarde para finalizar relatório"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{initialData ? 'Atualizar Canhoto' : 'Salvar no Banco de Dados'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
