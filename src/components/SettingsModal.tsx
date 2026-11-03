import React, { useState, useRef } from 'react';
import {
  X,
  Shield,
  KeyRound,
  Download,
  Upload,
  User,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { UserSecurityConfig } from '../types/ponto';
import { exportFullData, importFullData, hashPin, saveSecurityConfig, seedInitialDataIfEmpty } from '../db/pontoDb';
import { getClientGeminiApiKey, saveClientGeminiApiKey } from '../services/aiScanner';
import { Sparkles, Key } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: UserSecurityConfig | null;
  onConfigUpdated: (newConfig: UserSecurityConfig) => void;
  onDataReload: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigUpdated,
  onDataReload,
}) => {
  const [userName, setUserName] = useState(config?.userName || 'Cledson do Nascimento Pereira');
  const [empresaPadrao, setEmpresaPadrao] = useState(
    config?.empresaPadrao || 'Vidronox'
  );
  const [jornadaMinutos, setJornadaMinutos] = useState(config?.jornadaPadraoMinutos || 480);
  const [autoLockMinutes, setAutoLockMinutes] = useState(config?.autoLockMinutes ?? 15);
  const [geminiApiKey, setGeminiApiKey] = useState(getClientGeminiApiKey());

  // Change PIN fields
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  // Status feedback
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError('');
    setFeedbackSuccess('');

    try {
      const updated: UserSecurityConfig = {
        hasPin: config?.hasPin ?? true,
        pinHash: config?.pinHash || '',
        autoLockMinutes: Number(autoLockMinutes),
        lastActiveTimestamp: Date.now(),
        userName: userName.trim(),
        jornadaPadraoMinutos: Number(jornadaMinutos),
        empresaPadrao: empresaPadrao.trim(),
      };

      await saveSecurityConfig(updated);
      saveClientGeminiApiKey(geminiApiKey);
      onConfigUpdated(updated);
      setFeedbackSuccess('Preferências salvas com sucesso!');
    } catch (err: unknown) {
      const e = err as Error;
      setFeedbackError('Erro ao salvar preferências: ' + e.message);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError('');
    setFeedbackSuccess('');

    if (newPin.length < 4) {
      setFeedbackError('O novo PIN deve ter no mínimo 4 dígitos.');
      return;
    }

    if (newPin !== confirmNewPin) {
      setFeedbackError('Os novos PINs não coincidem.');
      return;
    }

    if (config?.pinHash) {
      const currentH = await hashPin(currentPin);
      if (currentH !== config.pinHash) {
        setFeedbackError('PIN atual incorreto.');
        return;
      }
    }

    try {
      const newHash = await hashPin(newPin);

      const updated: UserSecurityConfig = {
        hasPin: true,
        pinHash: newHash,
        autoLockMinutes: Number(autoLockMinutes),
        lastActiveTimestamp: Date.now(),
        userName: userName.trim(),
        jornadaPadraoMinutos: Number(jornadaMinutos),
        empresaPadrao: empresaPadrao.trim(),
      };

      await saveSecurityConfig(updated);
      onConfigUpdated(updated);
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
      setFeedbackSuccess('PIN alterado com sucesso!');
    } catch (err: unknown) {
      const e = err as Error;
      setFeedbackError('Erro ao atualizar PIN: ' + e.message);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const json = await exportFullData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_pontoseguro_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFeedbackSuccess('Backup exportado com sucesso!');
    } catch (err: unknown) {
      const e = err as Error;
      setFeedbackError('Falha ao exportar backup: ' + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const importedCount = await importFullData(text);
      onDataReload();
      setFeedbackSuccess(`${importedCount} registros restaurados com sucesso!`);
    } catch (err: unknown) {
      const e = err as Error;
      setFeedbackError('Falha ao importar backup: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl my-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Configurações & Segurança
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gerencie sua senha de acesso, escala de trabalho e backup
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
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {feedbackSuccess && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{feedbackSuccess}</span>
            </div>
          )}

          {feedbackError && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{feedbackError}</span>
            </div>
          )}

          {/* Section: Worker Info & Daily Work Schedule */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Dados do Titular & Escala de Trabalho
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome do Trabalhador
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Empresa / Empregador Padrão
                </label>
                <input
                  type="text"
                  value={empresaPadrao}
                  onChange={(e) => setEmpresaPadrao(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Jornada Diária Contratual
                </label>
                <select
                  value={jornadaMinutos}
                  onChange={(e) => setJornadaMinutos(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value={480}>8 horas diárias (480 min - Padrão CLT 44h/semana)</option>
                  <option value={528}>8h 48min (528 min - Compensação de Sábado)</option>
                  <option value={360}>6 horas diárias (360 min - Teleatendimento / Estágio)</option>
                  <option value={720}>12 horas (720 min - Escala 12x36)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bloqueio Automático por Inatividade
                </label>
                <select
                  value={autoLockMinutes}
                  onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value={5}>5 minutos</option>
                  <option value={15}>15 minutos (Recomendado)</option>
                  <option value={30}>30 minutos</option>
                  <option value={0}>Nunca bloquear automaticamente</option>
                </select>
              </div>
            </div>

            {/* Chave Gemini para GitHub Pages */}
            <div className="rounded-2xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/50 dark:bg-violet-950/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-violet-900 dark:text-violet-300">
                  <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span>Chave de IA Google Gemini (Para uso no GitHub Pages)</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300">
                  Opcional
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Necessária apenas caso você hospede o app no <strong>GitHub Pages estático</strong> sem servidor próprio. Se você usar a nuvem do Google ou Vercel/Render, o app já usa a chave automática do servidor.
              </p>
              <div className="relative">
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="Cole sua chave gratuita aqui (AIzaSy...)"
                  className="w-full rounded-xl border border-violet-200 dark:border-violet-800 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-violet-500 focus:outline-none"
                />
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Gere uma chave gratuita em: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-violet-600 dark:text-violet-400 underline font-semibold">aistudio.google.com/app/apikey</a></span>
                {geminiApiKey && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">Chave salva</span>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              Salvar Preferências
            </button>
          </form>

          {/* Section: Change Access PIN */}
          <form onSubmit={handleChangePin} className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Alterar PIN de Segurança
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  PIN Atual
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder="••••"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Novo PIN (4-6 dígitos)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="••••"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Confirmar Novo PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value)}
                  placeholder="••••"
                  className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors"
            >
              Atualizar Senha / PIN
            </button>
          </form>

          {/* Section: Backup and Restore */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Banco de Dados & Backup
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Suas fotos e horários ficam salvos com segurança no armazenamento permanente do seu
              navegador (IndexedDB). Exporte backups regulares para guardar em pen drive ou nuvem.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Exportar Arquivo de Backup (.json)</span>
              </button>

              <input
                type="file"
                ref={importFileRef}
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleImportBackup(e.target.files[0]);
                }}
              />

              <button
                type="button"
                onClick={() => importFileRef.current?.click()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Restaurar Backup</span>
              </button>
            </div>
          </div>

          {/* Section: Informações sobre Armazenamento, Celular e GitHub Pages */}
          <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Onde Ficam Meus Dados & Como Usar no Celular
            </h3>

            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 space-y-2">
              <p className="font-bold text-emerald-900 dark:text-emerald-300">
                1. Onde os dados estão salvos agora?
              </p>
              <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                Os dados e as fotos dos canhotos são armazenados no <strong>Google Cloud Firestore (Firebase)</strong> na nuvem e também em cache seguro local (<strong>IndexedDB</strong>). Dessa forma, você pode cadastrar pelo celular no trabalho, e ao abrir no computador ou outro aparelho tudo já estará sincronizado e protegido pelo seu PIN 9655, com backup automático.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-2">
              <p className="font-bold text-slate-900 dark:text-white">
                2. Como acessar no celular no trabalho online:
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                Você já tem um link oficial gerado e online para abrir no celular agora:
              </p>
              <div className="rounded-xl bg-slate-900 p-2.5 font-mono text-[11px] text-emerald-400 break-all select-all">
                https://ais-pre-l5xjnxv2p35rcgide55tvc-11902426249.us-west2.run.app
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                <strong>Dica PWA:</strong> No celular, abra no Safari (iPhone) ou Chrome (Android) e toque em <em>"Adicionar à Tela de Início"</em> para instalar como um aplicativo nativo.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-2">
              <p className="font-bold text-slate-900 dark:text-white">
                3. Como enviar para o GitHub e colocar no GitHub Pages:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                <li>O código já foi configurado com <code>base: './'</code> para rodar em qualquer subpasta do GitHub Pages.</li>
                <li>Gere a pasta de publicação estática com <code>npm run build</code> (cria a pasta <code>dist/</code>).</li>
                <li>Suba o projeto para o seu repositório no GitHub.</li>
                <li>No GitHub do seu projeto, vá em <strong>Settings &gt; Pages</strong>, escolha a fonte como <strong>GitHub Actions</strong> ou aponte para a pasta <code>/dist</code>.</li>
                <li>No GitHub Pages puro (estático), todo o salvamento no IndexedDB, cálculos, filtros e fotos continuam funcionando 100% no celular.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
