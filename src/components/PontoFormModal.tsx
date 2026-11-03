import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Calendar,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { PontoRegistro, StatusRh } from '../types/ponto';
import {
  calculateJornada,
  getTodayDateString,
  getYesterdayDateString,
  minutesToTimeString,
  formatDateBr,
} from '../utils/timeCalculations';
import { compressAndReadFile } from '../utils/imageUtils';
import { scanCanhotoImage, ScanCanhotoResult } from '../services/aiScanner';

interface PontoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (registro: PontoRegistro) => Promise<void>;
  initialData?: PontoRegistro | null;
  preselectedDate?: string;
  defaultEmpresa?: string;
  jornadaPadraoMinutos?: number;
  existingRecords?: PontoRegistro[];
}

type SlotType = 'entrada' | 'saidaAlmoco' | 'retornoAlmoco' | 'saidaFinal';

export const PontoFormModal: React.FC<PontoFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  preselectedDate,
  defaultEmpresa = 'Vidronox',
  jornadaPadraoMinutos = 480,
  existingRecords = [],
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
  const [isSabado, setIsSabado] = useState(false);

  // Photo state
  const [fotoUrl, setFotoUrl] = useState('');
  const [fotoNome, setFotoNome] = useState('');
  const [fotoTamanhoOriginal, setFotoTamanhoOriginal] = useState<number | null>(null);

  // AI & OCR Scanning state (100% keyless via client-side Tesseract)
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ percent: number; text: string } | null>(null);
  const [scanResultNotice, setScanResultNotice] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotType>('entrada');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Detect whether selected date is Saturday
  useEffect(() => {
    if (data) {
      const parts = data.split('-').map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        setIsSabado(d.getDay() === 6);
      }
    }
  }, [data]);

  // Find existing record for this date (if user is adding 2nd, 3rd or 4th slip of the day)
  const existingRecordForDate = useMemo(() => {
    if (!data) return null;
    return existingRecords.find((r) => r.data === data && (!initialData || r.id !== initialData.id)) || null;
  }, [data, existingRecords, initialData]);

  // When opening or editing
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
      setIsSabado(Boolean(initialData.isSabado));
      setScanProgress(null);
      setScanResultNotice(null);
    } else {
      const targetDate = preselectedDate || getTodayDateString();
      setData(targetDate);
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
      setScanProgress(null);
      setScanResultNotice(null);

      // If there's an existing record for this date already, prefill it!
      const match = existingRecords.find((r) => r.data === targetDate);
      if (match) {
        setEntrada(match.entrada || '');
        setSaidaAlmoco(match.saidaAlmoco || '');
        setRetornoAlmoco(match.retornoAlmoco || '');
        setSaidaFinal(match.saidaFinal || '');
        setNsr(match.nsr || '');
        setEmpresa(match.empresa || defaultEmpresa);
        if (match.fotoUrl) setFotoUrl(match.fotoUrl);
      }
    }
    setFormError('');
  }, [initialData, preselectedDate, defaultEmpresa, isOpen]);

  if (!isOpen) return null;

  // Real-time calculation of daily hours
  const effectiveJornadaMinutos = isSabado ? 240 : jornadaPadraoMinutos;
  const { totalMinutosTrabalhados, totalMinutosIntervalo, saldoMinutos } = calculateJornada(
    entrada,
    saidaAlmoco,
    retornoAlmoco,
    saidaFinal,
    effectiveJornadaMinutos
  );

  // Triggered when camera captures or gallery file is chosen
  const handleFileSelected = async (file: File) => {
    try {
      setFormError('');
      const compressed = await compressAndReadFile(file, 1024, 0.72);
      setFotoUrl(compressed.dataUrl);
      setFotoNome(file.name || 'comprovante_canhoto.jpg');
      setFotoTamanhoOriginal(compressed.originalSize);

      // Start automatic keyless OCR recognition immediately!
      await performKeylessScan(compressed.dataUrl);
    } catch (err: unknown) {
      const e = err as Error;
      setFormError('Erro ao carregar foto: ' + e.message);
    }
  };

  // 100% Client-side keyless OCR recognition
  const performKeylessScan = async (dataUrlToScan: string) => {
    if (!dataUrlToScan) return;

    setIsScanning(true);
    setFormError('');
    setScanProgress({ percent: 10, text: 'Iniciando leitura óptica do canhoto...' });
    setScanResultNotice(null);

    try {
      const extracted = await scanCanhotoImage(
        dataUrlToScan,
        'image/jpeg',
        (pct, text) => {
          setScanProgress({ percent: pct, text });
        }
      );

      // 1. Update date if detected on receipt (e.g. 26/10/2026 -> 2026-10-26)
      let targetDate = data;
      if (extracted.data && /^\d{4}-\d{2}-\d{2}$/.test(extracted.data)) {
        targetDate = extracted.data;
        setData(targetDate);

        // Check if detected date is Saturday
        const parts = targetDate.split('-').map(Number);
        const isSat = new Date(parts[0], parts[1] - 1, parts[2]).getDay() === 6;
        setIsSabado(isSat);

        // Check if there are already batidas registered for this date in DB to merge
        const existingForDetected = existingRecords.find((r) => r.data === targetDate);
        if (existingForDetected) {
          if (existingForDetected.entrada && !entrada) setEntrada(existingForDetected.entrada);
          if (existingForDetected.saidaAlmoco && !saidaAlmoco) setSaidaAlmoco(existingForDetected.saidaAlmoco);
          if (existingForDetected.retornoAlmoco && !retornoAlmoco) setRetornoAlmoco(existingForDetected.retornoAlmoco);
          if (existingForDetected.saidaFinal && !saidaFinal) setSaidaFinal(existingForDetected.saidaFinal);
        }
      }

      // 2. Assign the detected punch time to the suggested or next empty slot
      if (extracted.horaDetectada) {
        const hora = extracted.horaDetectada;
        let slot = extracted.slotSugerido;

        // If existing record already has that slot filled, choose the next empty slot
        if (slot === 'entrada' && entrada && entrada !== hora) {
          slot = isSabado ? 'saidaFinal' : 'saidaAlmoco';
        } else if (slot === 'saidaAlmoco' && saidaAlmoco && saidaAlmoco !== hora) {
          slot = 'retornoAlmoco';
        } else if (slot === 'retornoAlmoco' && retornoAlmoco && retornoAlmoco !== hora) {
          slot = 'saidaFinal';
        }

        setSelectedSlot(slot);

        // Apply time to the chosen slot
        if (slot === 'entrada') setEntrada(hora);
        else if (slot === 'saidaAlmoco') setSaidaAlmoco(hora);
        else if (slot === 'retornoAlmoco') setRetornoAlmoco(hora);
        else if (slot === 'saidaFinal') setSaidaFinal(hora);

        setScanResultNotice(
          `Canhoto lido: Data ${formatDateBr(targetDate)} · Horário ${hora} · NSR ${extracted.nsr || 'REP'}`
        );
      } else {
        setScanResultNotice('Canhoto processado. Verifique os horários nos campos abaixo.');
      }

      if (extracted.nsr) setNsr(extracted.nsr);
      if (extracted.empresa) setEmpresa(extracted.empresa);
    } catch (err: unknown) {
      const e = err as Error;
      setScanResultNotice(null);
      setFormError('Leitura automática: ' + e.message + '. Você pode preencher os horários manualmente.');
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  };

  // Change slot for the current time
  const handleSlotSelect = (slot: SlotType, timeValue: string) => {
    setSelectedSlot(slot);
    if (timeValue) {
      if (slot === 'entrada') setEntrada(timeValue);
      else if (slot === 'saidaAlmoco') setSaidaAlmoco(timeValue);
      else if (slot === 'retornoAlmoco') setRetornoAlmoco(timeValue);
      else if (slot === 'saidaFinal') setSaidaFinal(timeValue);
    }
  };

  const handleFillStandardHours = () => {
    if (isSabado) {
      setEntrada('08:00');
      setSaidaFinal('12:00');
      setScanResultNotice('Horário de sábado preenchido (08:00 às 12:00 - 4h de jornada).');
    } else {
      setEntrada('08:00');
      setSaidaAlmoco('12:00');
      setRetornoAlmoco('13:00');
      setSaidaFinal('17:00');
      setScanResultNotice('Horários padrão preenchidos (8h de jornada). Ajuste se necessário.');
    }
  };

  const handleFillCurrentTime = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    if (!entrada) {
      setEntrada(timeStr);
      setSelectedSlot('entrada');
      setScanResultNotice(`1ª Entrada preenchida com a hora atual: ${timeStr}`);
    } else if (!saidaAlmoco && !isSabado) {
      setSaidaAlmoco(timeStr);
      setSelectedSlot('saidaAlmoco');
      setScanResultNotice(`2ª Saída de almoço preenchida: ${timeStr}`);
    } else if (!retornoAlmoco && !isSabado) {
      setRetornoAlmoco(timeStr);
      setSelectedSlot('retornoAlmoco');
      setScanResultNotice(`3ª Volta do almoço preenchida: ${timeStr}`);
    } else {
      setSaidaFinal(timeStr);
      setSelectedSlot('saidaFinal');
      setScanResultNotice(`Saída final preenchida: ${timeStr}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) {
      setFormError('Informe a data do registro de ponto.');
      return;
    }

    if (!entrada && !saidaAlmoco && !retornoAlmoco && !saidaFinal) {
      setFormError('Preencha ao menos uma batida do dia (ex: Entrada 08:00).');
      return;
    }

    setIsSaving(true);
    try {
      // If we are merging into an existing date record or initialData
      const targetId =
        initialData?.id ||
        existingRecordForDate?.id ||
        `ponto_${data}_${Math.random().toString(36).substring(2, 7)}`;

      const nowIso = new Date().toISOString();

      // Create or update record
      const registro: PontoRegistro = {
        id: targetId,
        data,
        entrada: entrada.trim(),
        saidaAlmoco: isSabado ? '' : saidaAlmoco.trim(),
        retornoAlmoco: isSabado ? '' : retornoAlmoco.trim(),
        saidaFinal: saidaFinal.trim(),
        totalMinutosTrabalhados,
        totalMinutosIntervalo,
        saldoMinutos,
        fotoUrl: fotoUrl || initialData?.fotoUrl || existingRecordForDate?.fotoUrl || '',
        fotoNome: fotoNome || 'canhoto.jpg',
        nsr: nsr.trim(),
        empresa: empresa.trim() || 'Vidronox',
        statusRh,
        motivoDivergencia: statusRh === 'divergencia' ? motivoDivergencia.trim() : '',
        observacoes: observacoes.trim(),
        isSabado,
        criadoEm: initialData?.criadoEm || existingRecordForDate?.criadoEm || nowIso,
        atualizadoEm: nowIso,
      };

      await onSave(registro);
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setFormError('Erro ao salvar no banco de dados Firebase: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Count punches registered for this day
  const batidasCount = [entrada, saidaAlmoco, retornoAlmoco, saidaFinal].filter(Boolean).length;
  const maxBatidas = isSabado ? 2 : 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl my-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {initialData ? 'Editar Registro de Ponto' : 'Registrar Canhoto de Ponto'}
              </h2>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                {batidasCount} de {maxBatidas} batidas
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fotografe seu canhoto da <strong>Vidronox</strong> · Leitura automática direta sem pedir chave
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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

          {/* Section: Canhoto Photo Capture with Keyless OCR */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Foto do Canhoto Impresso (Comprovante da Batida)
              </label>
              {fotoUrl && (
                <button
                  type="button"
                  onClick={() => performKeylessScan(fotoUrl)}
                  disabled={isScanning}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{isScanning ? 'Lendo...' : 'Re-escanear'}</span>
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

            {/* Scanning Progress Bar */}
            {isScanning && scanProgress && (
              <div className="mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{scanProgress.text}</span>
                  </span>
                  <span className="tabular-nums font-mono">{scanProgress.percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${scanProgress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {fotoUrl ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
                <div className="relative h-44 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white shadow-sm">
                  <img
                    src={fotoUrl}
                    alt="Canhoto"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover object-top"
                  />
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Comprovante capturado e anexado</span>
                  </div>

                  {scanResultNotice && (
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-2.5 text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                      <div>
                        <span className="font-medium">{scanResultNotice}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      <span>Fotografar Outro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Galeria</span>
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
                    Abre a câmera do celular para leitura automática
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
                    Selecione a foto tirada do comprovante
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Section: Date, Saturday Switch and NSR */}
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  NSR / Registro do Relógio
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isSabado}
                    onChange={(e) => setIsSabado(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Sábado (2 batidas)</span>
                </label>
              </div>
              <input
                type="text"
                value={nsr}
                onChange={(e) => setNsr(e.target.value)}
                placeholder="Ex: 000016119"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section: 4 Working Times (Or 2 on Saturday) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  2. Horários de Batida de {formatDateBr(data)}
                </label>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  {isSabado ? 'Sábado: 2 batidas pela manhã' : 'Segunda a Sexta: 4 batidas (manhã e tarde)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFillStandardHours}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  title="Preencher horários padrão"
                >
                  {isSabado ? '08h às 12h' : '08h às 17h'}
                </button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <button
                  type="button"
                  onClick={handleFillCurrentTime}
                  className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  title="Preencher próximo campo com a hora atual"
                >
                  Hora Atual
                </button>
              </div>
            </div>

            {/* Time Slot Inputs Grid */}
            <div className={`grid gap-2.5 ${isSabado ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
              {/* Entrada */}
              <div
                className={`rounded-2xl border p-2.5 transition-all ${
                  selectedSlot === 'entrada'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  1ª Entrada (Manhã)
                </label>
                <input
                  type="time"
                  value={entrada}
                  onChange={(e) => {
                    setEntrada(e.target.value);
                    setSelectedSlot('entrada');
                  }}
                  className="mt-1 w-full bg-transparent text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              {/* Saída Almoço (omitted on Saturday) */}
              {!isSabado && (
                <div
                  className={`rounded-2xl border p-2.5 transition-all ${
                    selectedSlot === 'saidaAlmoco'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    2ª Saída (Almoço)
                  </label>
                  <input
                    type="time"
                    value={saidaAlmoco}
                    onChange={(e) => {
                      setSaidaAlmoco(e.target.value);
                      setSelectedSlot('saidaAlmoco');
                    }}
                    className="mt-1 w-full bg-transparent text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              )}

              {/* Volta Almoço (omitted on Saturday) */}
              {!isSabado && (
                <div
                  className={`rounded-2xl border p-2.5 transition-all ${
                    selectedSlot === 'retornoAlmoco'
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    3ª Volta (Almoço)
                  </label>
                  <input
                    type="time"
                    value={retornoAlmoco}
                    onChange={(e) => {
                      setRetornoAlmoco(e.target.value);
                      setSelectedSlot('retornoAlmoco');
                    }}
                    className="mt-1 w-full bg-transparent text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              )}

              {/* Saída Final */}
              <div
                className={`rounded-2xl border p-2.5 transition-all ${
                  selectedSlot === 'saidaFinal'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {isSabado ? '2ª Saída Final (Sábado)' : '4ª Saída (Fim Expediente)'}
                </label>
                <input
                  type="time"
                  value={saidaFinal}
                  onChange={(e) => {
                    setSaidaFinal(e.target.value);
                    setSelectedSlot('saidaFinal');
                  }}
                  className="mt-1 w-full bg-transparent text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Calculated Hours Live Summary */}
            <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-slate-600 dark:text-slate-300">
                  Horas trabalhadas: <strong>{minutesToTimeString(totalMinutosTrabalhados)}</strong>
                </span>
                {!isSabado && totalMinutosIntervalo > 0 && (
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    (Almoço: {minutesToTimeString(totalMinutosIntervalo)})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 font-semibold">
                <span className="text-slate-500 text-[11px]">Saldo do dia:</span>
                <span
                  className={
                    saldoMinutos > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : saldoMinutos < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-500'
                  }
                >
                  {saldoMinutos > 0
                    ? `+${minutesToTimeString(saldoMinutos)} extra`
                    : saldoMinutos < 0
                    ? `-${minutesToTimeString(Math.abs(saldoMinutos))} déficit`
                    : '0h 00m'}
                </span>
              </div>
            </div>
          </div>

          {/* Section: Status RH */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Conferência com o Espelho de Ponto da Empresa
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatusRh('pendente')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  statusRh === 'pendente'
                    ? 'border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                Pendente
              </button>

              <button
                type="button"
                onClick={() => setStatusRh('aprovado')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  statusRh === 'aprovado'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                Bateu com RH
              </button>

              <button
                type="button"
                onClick={() => setStatusRh('divergencia')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  statusRh === 'divergencia'
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                }`}
              >
                Divergência
              </button>
            </div>
          </div>

          {statusRh === 'divergencia' && (
            <div>
              <label className="text-xs font-semibold text-rose-600 dark:text-rose-400 block mb-1">
                Motivo da Divergência (o que o RH errou?)
              </label>
              <textarea
                rows={2}
                value={motivoDivergencia}
                onChange={(e) => setMotivoDivergencia(e.target.value)}
                placeholder="Ex: Espelho marcou saída às 17h, mas o canhoto comprova saída às 18h (+1h de extra)."
                className="w-full rounded-xl border border-rose-300 dark:border-rose-900 bg-white dark:bg-slate-800 p-3 text-xs text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving || isScanning}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvando no Firebase...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Salvar Canhoto no Banco de Dados</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
