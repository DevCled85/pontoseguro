import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Eye,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Building2,
  Maximize2,
} from 'lucide-react';
import { PontoRegistro } from '../types/ponto';
import { formatDateBr, formatDateLongBr, minutesToTimeString } from '../utils/timeCalculations';

interface PontoCardProps {
  registro: PontoRegistro;
  onViewPhoto: (registro: PontoRegistro) => void;
  onEdit: (registro: PontoRegistro) => void;
  onRequestDelete: (registro: PontoRegistro) => void;
  onOpenReportForDate: (registro: PontoRegistro) => void;
  isRhMode: boolean;
}

export const PontoCard: React.FC<PontoCardProps> = ({
  registro,
  onViewPhoto,
  onEdit,
  onRequestDelete,
  onOpenReportForDate,
  isRhMode,
}) => {
  const isDivergence = registro.statusRh === 'divergencia';
  const isApproved = registro.statusRh === 'aprovado';

  // Status visual config
  const statusConfig = {
    aprovado: {
      label: 'Conferido com o RH',
      icon: CheckCircle2,
      textColor: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200 dark:border-emerald-800/60',
    },
    divergencia: {
      label: 'Divergência com RH',
      icon: AlertTriangle,
      textColor: 'text-rose-700 dark:text-rose-400',
      bgColor: 'bg-rose-50 dark:bg-rose-950/40',
      borderColor: 'border-rose-200 dark:border-rose-800/60',
    },
    pendente: {
      label: 'Pendente de Conferência',
      icon: HelpCircle,
      textColor: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-100 dark:bg-slate-800/50',
      borderColor: 'border-slate-200 dark:border-slate-700',
    },
  }[registro.statusRh];

  const StatusIcon = statusConfig.icon;

  return (
    <article
      className={`group relative rounded-2xl border transition-all duration-200 ${
        isDivergence
          ? 'border-rose-300 dark:border-rose-900/60 bg-white dark:bg-slate-900 shadow-sm shadow-rose-950/5'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      <div className="p-5 sm:p-6">
        {/* Header: Date + Status Badge */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="capitalize">{formatDateLongBr(registro.data)}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatDateBr(registro.data)}</span>
              {registro.nsr && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-[11px] text-slate-400">NSR #{registro.nsr}</span>
                </>
              )}
            </div>

            {registro.empresa && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate max-w-xs">{registro.empresa}</span>
              </div>
            )}
          </div>

          {/* Status badge with text */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{statusConfig.label}</span>
          </div>
        </div>

        {/* Divergence warning callout if marked */}
        {isDivergence && registro.motivoDivergencia && (
          <div className="mt-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 p-3 text-xs text-rose-900 dark:text-rose-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div>
                <span className="font-semibold">Motivo da contestação com o RH: </span>
                <span>{registro.motivoDivergencia}</span>
              </div>
            </div>
          </div>
        )}

        {/* Core Times Grid & Canhoto Preview */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* The 4 Working Times (Col 1-8) */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* 1. Entrada */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  1ª Entrada
                </span>
                <span className="mt-0.5 block font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {registro.entrada || '--:--'}
                </span>
                <span className="text-[10px] text-slate-400">Início do dia</span>
              </div>

              {/* 2. Saída Almoço */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Saída Almoço
                </span>
                <span className="mt-0.5 block font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {registro.saidaAlmoco || '--:--'}
                </span>
                <span className="text-[10px] text-slate-400">Início pausa</span>
              </div>

              {/* 3. Volta Almoço */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Volta Almoço
                </span>
                <span className="mt-0.5 block font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {registro.retornoAlmoco || '--:--'}
                </span>
                <span className="text-[10px] text-slate-400">Retorno pausa</span>
              </div>

              {/* 4. Saída do Dia */}
              <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3">
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  2ª Saída Final
                </span>
                <span className="mt-0.5 block font-mono text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums">
                  {registro.saidaFinal || '--:--'}
                </span>
                <span className="text-[10px] text-slate-400">Fim do expediente</span>
              </div>
            </div>

            {/* Calculations Row */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-500 dark:text-slate-400">Jornada Efetiva:</span>
                <strong className="font-mono text-slate-900 dark:text-white font-semibold">
                  {minutesToTimeString(registro.totalMinutosTrabalhados)}
                </strong>
              </div>

              {registro.totalMinutosIntervalo > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Almoço:</span>{' '}
                    <span className="font-mono font-medium">
                      {minutesToTimeString(registro.totalMinutosIntervalo)}
                    </span>
                  </div>
                </>
              )}

              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Saldo:</span>{' '}
                <span
                  className={`font-mono font-bold ${
                    registro.saldoMinutos > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : registro.saldoMinutos < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {registro.saldoMinutos > 0 ? '+' : ''}
                  {minutesToTimeString(registro.saldoMinutos)}
                </span>
              </div>
            </div>
          </div>

          {/* Canhoto Photo Snapshot Box (Col 9-12) */}
          <div className="lg:col-span-4 flex items-center justify-center">
            {registro.fotoUrl ? (
              <button
                type="button"
                onClick={() => onViewPhoto(registro)}
                className="group/photo relative flex w-full max-w-[220px] items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 p-2 text-left hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20 transition-all cursor-pointer"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white shadow-inner">
                  <img
                    src={registro.fotoUrl}
                    alt={`Canhoto do dia ${registro.data}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover object-top transition-transform duration-200 group-hover/photo:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover/photo:bg-black/0 transition-colors" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <span>Comprovante</span>
                    <Maximize2 className="h-3 w-3 text-slate-400 group-hover/photo:text-emerald-500" />
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Toque para ampliar e auditar foto original
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex h-16 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-400">
                Sem foto anexada
              </div>
            )}
          </div>
        </div>

        {/* Optional observations */}
        {registro.observacoes && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic">
            "{registro.observacoes}"
          </p>
        )}

        {/* Footer Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => onViewPhoto(registro)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Eye className="h-3.5 w-3.5 text-slate-500" />
              <span>Ver Canhoto</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenReportForDate(registro)}
              title="Gerar declaração com imagem para apresentar ao RH"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Dossiê p/ RH</span>
            </button>
          </div>

          {/* Edit & Delete (Safe in normal mode, hidden in RH view mode) */}
          {!isRhMode && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(registro)}
                title="Editar horários ou anotações"
                aria-label="Editar"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onRequestDelete(registro)}
                title="Excluir comprovante"
                aria-label="Excluir"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
