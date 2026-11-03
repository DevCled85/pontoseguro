import React from 'react';
import {
  X,
  Eye,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Clock,
  Building2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Camera,
} from 'lucide-react';
import { PontoRegistro } from '../types/ponto';
import { formatDateBr, formatDateLongBr, minutesToTimeString } from '../utils/timeCalculations';

interface DayDetailsModalProps {
  registro: PontoRegistro | null;
  isOpen: boolean;
  onClose: () => void;
  onViewPhoto: (registro: PontoRegistro) => void;
  onEdit: (registro: PontoRegistro) => void;
  onRequestDelete: (registro: PontoRegistro) => void;
  onOpenReport: (registro: PontoRegistro) => void;
  isRhMode: boolean;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
  registro,
  isOpen,
  onClose,
  onViewPhoto,
  onEdit,
  onRequestDelete,
  onOpenReport,
  isRhMode,
}) => {
  if (!isOpen || !registro) return null;

  const isDivergence = registro.statusRh === 'divergencia';
  const isApproved = registro.statusRh === 'aprovado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Registro do Dia
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {formatDateBr(registro.data)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
              {formatDateLongBr(registro.data)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status Alert */}
          {isDivergence ? (
            <div className="rounded-2xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-950 dark:text-rose-200">
              <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-400 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span>Divergência / Erro no Espelho do RH</span>
              </div>
              <p className="leading-relaxed">
                {registro.motivoDivergencia ||
                  'Horários registrados no canhoto físico diferem do controle do RH.'}
              </p>
            </div>
          ) : isApproved ? (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Conferido e validado com o espelho do RH.</span>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />
              <span>Pendente de conferência no fechamento da folha.</span>
            </div>
          )}

          {/* 4 Working Times */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Batidas de Ponto Registradas:
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">1ª Entrada</span>
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums">
                  {registro.entrada || '--:--'}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">Saída Almoço</span>
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums">
                  {registro.saidaAlmoco || '--:--'}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">Volta Almoço</span>
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums">
                  {registro.retornoAlmoco || '--:--'}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 text-center">
                <span className="text-[10px] text-slate-400 block">2ª Saída</span>
                <span className="font-mono text-base font-bold text-slate-900 dark:text-white tabular-nums">
                  {registro.saidaFinal || '--:--'}
                </span>
              </div>
            </div>
          </div>

          {/* Summary Strip */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Jornada Trabalhada:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {minutesToTimeString(registro.totalMinutosTrabalhados)}
              </span>
            </div>
            {registro.totalMinutosIntervalo > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Pausa Almoço:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {minutesToTimeString(registro.totalMinutosIntervalo)}
                </span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">Saldo:</span>
              <span
                className={`font-mono font-bold ${
                  registro.saldoMinutos > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : registro.saldoMinutos < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {registro.saldoMinutos > 0 ? '+' : ''}
                {minutesToTimeString(registro.saldoMinutos)}
              </span>
            </div>
          </div>

          {/* Canhoto Snapshot */}
          {registro.fotoUrl ? (
            <div
              onClick={() => {
                onClose();
                onViewPhoto(registro);
              }}
              className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-500 cursor-pointer transition-all"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900">
                <img
                  src={registro.fotoUrl}
                  alt="Canhoto"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Foto do Comprovante Físico</span>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Clique para ampliar, girar e auditar comprovante térmico
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
              Nenhuma foto de canhoto anexada
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-2">
              {registro.fotoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewPhoto(registro);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span>Ver Foto Original</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenReport(registro);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-emerald-600 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Dossiê p/ RH</span>
              </button>
            </div>

            {!isRhMode && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(registro);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Editar Horários</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequestDelete(registro);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Excluir Registro</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
