import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { PontoRegistro } from '../types/ponto';
import { formatDateBr, formatDateLongBr } from '../utils/timeCalculations';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  registro: PontoRegistro | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  registro,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!isOpen || !registro) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl transition-all">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30">
            <Trash2 className="h-7 w-7" />
          </div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Excluir Registro de Ponto?
          </h3>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tem certeza que deseja apagar o registro e a foto do canhoto de{' '}
            <strong className="text-slate-700 dark:text-slate-200">
              {formatDateBr(registro.data)}
            </strong>{' '}
            ({formatDateLongBr(registro.data)})?
          </p>

          <div className="mt-4 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Horários:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {registro.entrada || '--:--'} às {registro.saidaFinal || '--:--'}
              </span>
            </div>
            {registro.fotoUrl && (
              <div className="flex justify-between py-1 text-rose-600 dark:text-rose-400 font-medium">
                <span>Foto do comprovante:</span>
                <span>Será apagada permanentemente</span>
              </div>
            )}
          </div>

          <div className="mt-6 flex w-full items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="w-1/2 h-11 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => onConfirm(registro.id)}
              disabled={isDeleting}
              className="w-1/2 h-11 rounded-xl bg-rose-600 text-xs font-semibold text-white shadow-md hover:bg-rose-500 active:scale-95 transition-all disabled:opacity-50"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
