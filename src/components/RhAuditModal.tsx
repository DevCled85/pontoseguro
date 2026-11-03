import React, { useState } from 'react';
import { X, Printer, ShieldCheck, Download, AlertTriangle, Building2, User } from 'lucide-react';
import { PontoRegistro, UserSecurityConfig } from '../types/ponto';
import { formatDateBr, formatDateLongBr, minutesToTimeString } from '../utils/timeCalculations';

interface RhAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  registro: PontoRegistro | null;
  allRegistros: PontoRegistro[];
  config: UserSecurityConfig | null;
}

export const RhAuditModal: React.FC<RhAuditModalProps> = ({
  isOpen,
  onClose,
  registro,
  allRegistros,
  config,
}) => {
  const [selectedRecordId, setSelectedRecordId] = useState<string>(
    registro ? registro.id : allRegistros[0]?.id || ''
  );

  const currentRecord =
    allRegistros.find((r) => r.id === (registro ? registro.id : selectedRecordId)) ||
    allRegistros[0] ||
    registro;

  if (!isOpen || !currentRecord) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl my-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all">
        {/* Modal Top Bar (hidden on print) */}
        <div className="no-print flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Dossiê Comprobatório para Gerência de RH
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Documento formal com foto e horários para retificação de espelho de ponto
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-emerald-600 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-emerald-500 active:scale-95 transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Record selector if opening general report (hidden on print) */}
        {!registro && allRegistros.length > 1 && (
          <div className="no-print px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Selecione o dia do canhoto:
            </span>
            <select
              value={selectedRecordId}
              onChange={(e) => setSelectedRecordId(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium focus:border-emerald-500 focus:outline-none"
            >
              {allRegistros.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {formatDateBr(reg.data)} - {reg.statusRh === 'divergencia' ? '⚠️ Divergência RH' : 'Ok'} (
                  {reg.entrada || '--:--'} às {reg.saidaFinal || '--:--'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Formal Printable Document Content */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 font-sans max-h-[75vh] overflow-y-auto">
          {/* Formal Letterhead */}
          <div className="border-b-2 border-slate-900 dark:border-slate-600 pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400">
                  Instrumento de Auditoria e Prova Trabalhista
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">
                  COMPROVANTE DE EFETIVIDADE DA JORNADA DE TRABALHO
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Conforme Art. 74 § 2º da Consolidação das Leis do Trabalho (CLT) e Portaria MTE nº 671/2021
                </p>
              </div>

              <div className="text-right text-xs text-slate-500 dark:text-slate-400 shrink-0">
                <div>Data de Emissão: {formatDateBr(new Date().toISOString().split('T')[0])}</div>
                <div className="font-mono text-[11px]">Sistema PontoSeguro</div>
              </div>
            </div>
          </div>

          {/* Party Identification Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-4 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-semibold">
                DADOS DO COLABORADOR:
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                {config?.userName || 'Cledson do Nascimento Pereira'}
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Escala Padrão Diária: {minutesToTimeString(config?.jornadaPadraoMinutos || 480)}
              </p>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-semibold">
                EMPRESA / EMPREGADOR:
              </span>
              <p className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                {currentRecord.empresa || config?.empresaPadrao || 'Vidronox'}
              </p>
              <p className="text-slate-600 dark:text-slate-400 font-mono">
                NSR Relógio REP: {currentRecord.nsr || 'Não especificado'}
              </p>
            </div>
          </div>

          {/* Divergence Notice Callout */}
          {currentRecord.statusRh === 'divergencia' && (
            <div className="rounded-xl border-2 border-rose-400 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-950 dark:text-rose-200">
              <div className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400 text-sm mb-1">
                <AlertTriangle className="h-5 w-5" />
                <span>SOLICITAÇÃO DE RETIFICAÇÃO DE DIVERGÊNCIA NO ESPELHO DE PONTO</span>
              </div>
              <p className="leading-relaxed mt-1 text-slate-800 dark:text-slate-200">
                {currentRecord.motivoDivergencia ||
                  'Identificou-se divergência entre o apontamento do espelho eletrônico do RH e o canhoto físico emitido pelo Registrador Eletrônico de Ponto.'}
              </p>
            </div>
          )}

          {/* Verified Time Clock Summary Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
              Horários Físicos Impressos no Canhoto do Dia {formatDateBr(currentRecord.data)} (
              <span className="capitalize">{formatDateLongBr(currentRecord.data)}</span>)
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">1ª Entrada</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Saída Almoço</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Volta Almoço</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">2ª Saída Final</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Total Efetivo</th>
                    <th className="p-3 border-b border-slate-200 dark:border-slate-700">Saldo do Dia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-sm">
                  <tr className="bg-white dark:bg-slate-900">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {currentRecord.entrada || '--:--'}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {currentRecord.saidaAlmoco || '--:--'}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {currentRecord.retornoAlmoco || '--:--'}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {currentRecord.saidaFinal || '--:--'}
                    </td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {minutesToTimeString(currentRecord.totalMinutosTrabalhados)}
                    </td>
                    <td
                      className={`p-3 font-bold ${
                        currentRecord.saldoMinutos >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {currentRecord.saldoMinutos > 0 ? '+' : ''}
                      {minutesToTimeString(currentRecord.saldoMinutos)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Evidence: High-Res Physical Receipt Photo Attached */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-2">
              Anexo Probatório: Imagem do Canhoto Impresso Emitido pelo REP
            </h3>

            {currentRecord.fotoUrl ? (
              <div className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4">
                <div className="max-w-[260px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white p-1 shadow-md">
                  <img
                    src={currentRecord.fotoUrl}
                    alt="Canhoto original anexado"
                    referrerPolicy="no-referrer"
                    className="max-h-72 w-auto object-contain mx-auto rounded"
                  />
                </div>

                <div className="flex-1 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">
                    Autenticidade do Comprovante Físico
                  </p>
                  <p>
                    O comprovante acima foi emitido diretamente pelo Relógio Eletrônico de Ponto
                    (REP) na portaria/local de trabalho no exato momento da marcação.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400">
                    <li>Data da marcação: {formatDateBr(currentRecord.data)}</li>
                    <li>Registro arquivado no banco de dados local com timestamp seguro</li>
                    {currentRecord.nsr && <li>Nº Sequencial de Registro (NSR): {currentRecord.nsr}</li>}
                  </ul>
                  {currentRecord.observacoes && (
                    <div className="pt-2 italic text-slate-500">
                      Obs: "{currentRecord.observacoes}"
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-400">
                Nenhum arquivo de imagem anexado a este registro.
              </div>
            )}
          </div>

          {/* Signatures & Formal Receipt Section for HR */}
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs">
            <div className="space-y-4">
              <div className="h-10 border-b border-slate-400 dark:border-slate-600" />
              <div className="text-center">
                <p className="font-bold text-slate-900 dark:text-white">
                  {config?.userName || 'Cledson do Nascimento Pereira'}
                </p>
                <p className="text-slate-500 text-[11px]">Assinatura do Colaborador</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="h-10 border-b border-slate-400 dark:border-slate-600" />
              <div className="text-center">
                <p className="font-bold text-slate-900 dark:text-white">
                  Gestão de Recursos Humanos / DP
                </p>
                <p className="text-slate-500 text-[11px]">
                  Ciente do Gerente de RH em: _____/_____/_________
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
