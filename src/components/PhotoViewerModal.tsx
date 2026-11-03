import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sliders,
  Download,
  Printer,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { PontoRegistro } from '../types/ponto';
import { formatDateBr, formatDateLongBr, minutesToTimeString } from '../utils/timeCalculations';

interface PhotoViewerModalProps {
  registro: PontoRegistro | null;
  onClose: () => void;
  onOpenReport: (registro: PontoRegistro) => void;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  registro,
  onClose,
  onOpenReport,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [highContrastFilter, setHighContrastFilter] = useState(false);

  if (!registro) return null;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.75));
  };

  const handleDownload = () => {
    if (!registro.fotoUrl) return;
    const a = document.createElement('a');
    a.href = registro.fotoUrl;
    a.download = `canhoto_${registro.data}_${registro.nsr || 'comprovante'}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-6 backdrop-blur-md">
      <div className="relative flex flex-col lg:flex-row h-full max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Left: Interactive Image Canvas */}
        <div className="relative flex-1 flex flex-col bg-slate-950 overflow-hidden min-h-[350px]">
          {/* Canvas Floating Toolbar */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-lg backdrop-blur-md pointer-events-auto">
              <button
                type="button"
                onClick={handleZoomIn}
                title="Aproximar zoom"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                title="Afastar zoom"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleRotate}
                title="Girar imagem 90°"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setHighContrastFilter(!highContrastFilter)}
                title="Realce para papel térmico desbotado"
                className={`flex items-center gap-1 h-8 px-2.5 rounded-xl text-xs font-medium transition-colors ${
                  highContrastFilter
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Realçar Texto Térmico</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="lg:hidden flex h-9 w-9 items-center justify-center rounded-full bg-slate-800/90 text-white pointer-events-auto shadow-md"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Image Display Area with Pan & Zoom */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
            {registro.fotoUrl ? (
              <div
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-out',
                  filter: highContrastFilter
                    ? 'contrast(180%) brightness(95%) grayscale(100%)'
                    : 'none',
                }}
                className="max-h-full max-w-full flex items-center justify-center origin-center cursor-grab active:cursor-grabbing"
              >
                <img
                  src={registro.fotoUrl}
                  alt={`Comprovante de ponto de ${formatDateBr(registro.data)}`}
                  referrerPolicy="no-referrer"
                  className="max-h-[70vh] w-auto rounded-lg shadow-2xl object-contain ring-1 ring-white/10"
                />
              </div>
            ) : (
              <div className="text-center text-slate-500 text-sm">
                Nenhuma foto anexada a este registro.
              </div>
            )}
          </div>

          {/* Bottom Bar Info */}
          <div className="p-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Zoom: {Math.round(zoom * 100)}% · Rotação: {rotation}°
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Documento comprobatório legal (CLT Portaria 671)
            </span>
          </div>
        </div>

        {/* Right: RH Audit Panel & Metadata */}
        <div className="w-full lg:w-96 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-900 p-6 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Auditoria de Ponto
                </span>
                <h3 className="text-lg font-bold text-white">
                  {formatDateBr(registro.data)}
                </h3>
                <p className="text-xs text-slate-400 capitalize">
                  {formatDateLongBr(registro.data)}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="hidden lg:flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Status Callout */}
            <div className="mt-4">
              {registro.statusRh === 'divergencia' ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
                  <div className="flex items-center gap-1.5 font-bold text-rose-400 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Divergência Contestada com o RH</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">
                    {registro.motivoDivergencia ||
                      'Horários registrados no canhoto diferem do espelho emitido pelo RH.'}
                  </p>
                </div>
              ) : registro.statusRh === 'aprovado' ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Espelho de ponto conferido e validado com o canhoto.</span>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-300">
                  Aguardando conferência no fechamento do espelho de ponto.
                </div>
              )}
            </div>

            {/* 4 Working Times Listed Clearly for HR Inspector */}
            <div className="mt-5 space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Horários Comprovados pelo Canhoto:
              </span>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">1ª Entrada</span>
                  <span className="text-lg font-mono font-bold text-white tabular-nums">
                    {registro.entrada || '--:--'}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Saída Almoço</span>
                  <span className="text-lg font-mono font-bold text-white tabular-nums">
                    {registro.saidaAlmoco || '--:--'}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Volta Almoço</span>
                  <span className="text-lg font-mono font-bold text-white tabular-nums">
                    {registro.retornoAlmoco || '--:--'}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-800/80 p-3 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">2ª Saída Final</span>
                  <span className="text-lg font-mono font-bold text-white tabular-nums">
                    {registro.saidaFinal || '--:--'}
                  </span>
                </div>
              </div>
            </div>

            {/* Calculations & Employer Details */}
            <div className="mt-5 space-y-2 rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800/80 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Jornada Efetiva:</span>
                <span className="font-mono font-bold text-white">
                  {minutesToTimeString(registro.totalMinutosTrabalhados)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Pausa Almoço:</span>
                <span className="font-mono text-slate-200">
                  {minutesToTimeString(registro.totalMinutosIntervalo)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Saldo do Dia:</span>
                <span
                  className={`font-mono font-bold ${
                    registro.saldoMinutos > 0
                      ? 'text-emerald-400'
                      : registro.saldoMinutos < 0
                      ? 'text-rose-400'
                      : 'text-slate-300'
                  }`}
                >
                  {registro.saldoMinutos > 0 ? '+' : ''}
                  {minutesToTimeString(registro.saldoMinutos)}
                </span>
              </div>
              {registro.nsr && (
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">NSR Relógio REP:</span>
                  <span className="font-mono text-slate-200 font-semibold">{registro.nsr}</span>
                </div>
              )}
              {registro.empresa && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Empregador:</span>
                  <span className="text-slate-200 truncate max-w-[170px]">{registro.empresa}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 space-y-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenReport(registro);
              }}
              className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-600 text-xs sm:text-sm font-semibold text-white shadow-lg hover:bg-emerald-500 transition-colors"
            >
              <Printer className="h-4 w-4" />
              <span>Gerar Dossiê Formal para RH</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-slate-700 bg-slate-800 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Baixar Foto do Comprovante</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
