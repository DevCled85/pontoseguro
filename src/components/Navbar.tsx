import React from 'react';
import { Plus, Lock, ShieldAlert, FileText, Settings, Sun, Moon, Cloud } from 'lucide-react';

interface NavbarProps {
  onOpenNewModal: () => void;
  onLock: () => void;
  onOpenSettings: () => void;
  onOpenRhReport: () => void;
  onOpenCloudSync: () => void;
  isRhMode: boolean;
  onToggleRhMode: () => void;
  viewMode: 'lista' | 'calendario';
  onChangeViewMode: (mode: 'lista' | 'calendario') => void;
  currentFilter: 'todos' | 'divergencias' | 'aprovados' | 'pendentes';
  onChangeFilter: (filter: 'todos' | 'divergencias' | 'aprovados' | 'pendentes') => void;
  divergenciasCount: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewModal,
  onLock,
  onOpenSettings,
  onOpenRhReport,
  onOpenCloudSync,
  isRhMode,
  onToggleRhMode,
  viewMode,
  onChangeViewMode,
  currentFilter,
  onChangeFilter,
  divergenciasCount,
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6">
        {/* Zone 1: Wordmark display face */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onChangeViewMode('lista');
              onChangeFilter('todos');
            }}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
          >
            PontoSeguro
          </a>

          {isRhMode && (
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Modo Apresentação RH
            </span>
          )}
        </div>

        {/* Zone 2: Navigation Links / View Switcher */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <button
            type="button"
            onClick={() => onChangeViewMode('lista')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              viewMode === 'lista'
                ? 'font-semibold text-slate-900 dark:text-white underline underline-offset-8 decoration-emerald-500 decoration-2'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Lista de Canhotos
          </button>

          <button
            type="button"
            onClick={() => onChangeViewMode('calendario')}
            className={`whitespace-nowrap shrink-0 transition-colors ${
              viewMode === 'calendario'
                ? 'font-semibold text-slate-900 dark:text-white underline underline-offset-8 decoration-emerald-500 decoration-2'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Calendário Mensal
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeViewMode('lista');
              onChangeFilter('divergencias');
            }}
            className={`flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
              currentFilter === 'divergencias' && viewMode === 'lista'
                ? 'font-semibold text-rose-600 dark:text-rose-400 underline underline-offset-8 decoration-rose-500 decoration-2'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Divergências com RH</span>
            {divergenciasCount > 0 && (
              <span className="rounded-full bg-rose-500/15 px-1.5 py-0.2 text-[11px] font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {divergenciasCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenRhReport}
            className="flex items-center gap-1.5 whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span>Dossiê para o Gerente</span>
          </button>
        </nav>

        {/* Zone 3: Actions & Quick Utilities */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Cloud Sync Status & GitHub Button */}
          <button
            type="button"
            onClick={onOpenCloudSync}
            title="Banco de Dados Firebase Firestore Ativo e Conectado"
            className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg text-xs font-semibold whitespace-nowrap bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Cloud className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Firebase Nuvem</span>
          </button>

          {/* RH Mode Toggle */}
          <button
            type="button"
            onClick={onToggleRhMode}
            title={
              isRhMode
                ? 'Sair do Modo RH (reativar edição)'
                : 'Ativar Modo RH para mostrar ao gerente (oculta exclusões)'
            }
            className={`flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              isRhMode
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 ring-2 ring-amber-400/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {isRhMode ? 'Sair Modo RH' : 'Modo RH'}
            </span>
          </button>

          {/* Theme switch */}
          <button
            type="button"
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
            aria-label="Alternar tema"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Settings modal (hidden in strict RH mode) */}
          {!isRhMode && (
            <button
              type="button"
              onClick={onOpenSettings}
              title="Configurações e Backup"
              aria-label="Configurações"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}

          {/* Lock App */}
          <button
            type="button"
            onClick={onLock}
            title="Bloquear aplicativo com PIN"
            aria-label="Bloquear"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Lock className="h-4 w-4" />
          </button>

          {/* Primary CTA (Disabled or Hidden in RH mode) */}
          {!isRhMode && (
            <button
              type="button"
              onClick={onOpenNewModal}
              className="flex items-center gap-1.5 h-9 px-3.5 sm:px-4 rounded-lg bg-emerald-600 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 active:scale-95 transition-all whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Canhoto</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
