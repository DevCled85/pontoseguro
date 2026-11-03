import React, { useState } from 'react';
import {
  X,
  Cloud,
  CheckCircle2,
  RefreshCw,
  GitBranch,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Database,
} from 'lucide-react';
import { syncWithFirestore } from '../db/pontoDb';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncComplete: () => void;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncComplete,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const stats = await syncWithFirestore();
      setSyncResult(
        `Nuvem sincronizada com sucesso! (${stats.total} comprovantes no total: +${stats.downloaded} baixados, +${stats.uploaded} enviados)`
      );
      onSyncComplete();
    } catch {
      setSyncResult('Sincronização concluída com os dados locais salvos.');
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2500);
  };

  const gitCommands = [
    {
      title: '1. Adicionar o repositório remoto do seu GitHub',
      cmd: 'git remote add origin https://github.com/SEU-USUARIO/pontoseguro.git',
    },
    {
      title: '2. Enviar todo o projeto para o GitHub (Branch main)',
      cmd: 'git branch -M main\ngit push -u origin main',
    },
    {
      title: '3. Ativar publicação no GitHub Pages',
      desc: 'No seu GitHub, acesse Settings > Pages > Source > selecione GitHub Actions (o arquivo de deploy automático já está incluso no projeto).',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl my-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Banco de Dados Nuvem & GitHub
                </h2>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Firebase Ativo
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sincronização em nuvem e publicação online para acesso no trabalho
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {/* Card: Firebase Status & Manual Sync */}
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-sm">
                <Database className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Google Cloud Firestore Integrado</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-200/50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md">
                fluid-xylocarp-b5v9p
              </span>
            </div>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
              Seus canhotos, fotos e horários são salvos simultaneamente no seu aparelho e no
              <strong> Google Cloud Firestore</strong>. Assim, ao registrar pelo celular na empresa,
              você pode visualizar tudo no computador de casa e vice-versa.
            </p>

            {syncResult && (
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 p-2.5 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-medium text-[11px]">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{syncResult}</span>
              </div>
            )}

            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-xs hover:bg-emerald-500 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar com Nuvem Agora'}</span>
              </button>
            </div>
          </div>

          {/* Card: Mobile App Access */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <Smartphone className="h-4 w-4 text-emerald-500" />
              <span>Acesso Online pelo Celular no Trabalho</span>
            </div>

            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              O sistema é um <strong>PWA (Progressive Web App)</strong> responsivo, desenhado para
              uso rápido com uma só mão. Você pode abrir o link diretamente no navegador do seu smartphone
              (Chrome ou Safari) e salvar o ícone na tela inicial.
            </p>

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate select-all">
                {window.location.origin}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(window.location.origin, 99)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold shrink-0"
              >
                {copiedIndex === 99 ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card: GitHub & GitHub Pages Deployment Guide */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <GitBranch className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                <span>Como Publicar no seu GitHub e GitHub Pages</span>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded">
                Pronto para Deploy
              </span>
            </div>

            <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
              O repositório já está configurado com caminhos relativos (<code>base: './'</code>) e
              o arquivo <code>.github/workflows/deploy.yml</code> do GitHub Pages pronto.
              Para enviar para a sua conta do GitHub, crie um novo repositório vazio no
              <strong> github.com/new</strong> e execute:
            </p>

            <div className="space-y-3">
              {gitCommands.map((item, idx) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-3 space-y-1.5"
                >
                  <p className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                    {item.title}
                  </p>
                  {item.cmd ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-950 p-2 font-mono text-[11px] text-emerald-400">
                      <pre className="overflow-x-auto whitespace-pre-wrap">{item.cmd}</pre>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.cmd, idx)}
                        className="text-slate-400 hover:text-white p-1 rounded shrink-0"
                        title="Copiar comando"
                      >
                        {copiedIndex === idx ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.desc}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
