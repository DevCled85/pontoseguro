/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  Lock,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  Camera,
  Layers,
  CalendarDays,
  List,
  CheckCircle2,
  X,
} from 'lucide-react';
import { PontoRegistro, UserSecurityConfig } from './types/ponto';
import {
  getAllRegistros,
  getSecurityConfig,
  saveRegistro,
  deleteRegistro,
  seedInitialDataIfEmpty,
  syncWithFirestore,
  listenToCloudUpdates,
} from './db/pontoDb';
import { Navbar } from './components/Navbar';
import { PontoCard } from './components/PontoCard';
import { PontoFormModal } from './components/PontoFormModal';
import { PhotoViewerModal } from './components/PhotoViewerModal';
import { RhAuditModal } from './components/RhAuditModal';
import { SettingsModal } from './components/SettingsModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { LockScreen } from './components/LockScreen';
import { SummaryStats } from './components/SummaryStats';
import { MonthlyCalendar } from './components/MonthlyCalendar';
import { DayDetailsModal } from './components/DayDetailsModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { formatDateBr } from './utils/timeCalculations';

export default function App() {
  const [registros, setRegistros] = useState<PontoRegistro[]>([]);
  const [securityConfig, setSecurityConfig] = useState<UserSecurityConfig | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // View mode: 'lista' or 'calendario'
  const [viewMode, setViewMode] = useState<'lista' | 'calendario'>('calendario');

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return (
      localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  // Filter & Search states
  const [currentFilter, setCurrentFilter] = useState<'todos' | 'divergencias' | 'aprovados' | 'pendentes'>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('todos');

  // Presentation & Audit states
  const [isRhMode, setIsRhMode] = useState<boolean>(false);

  // Modals & Target records
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PontoRegistro | null>(null);
  const [preselectedDate, setPreselectedDate] = useState<string>('');
  const [viewingPhotoRecord, setViewingPhotoRecord] = useState<PontoRegistro | null>(null);
  const [selectedDayRecord, setSelectedDayRecord] = useState<PontoRegistro | null>(null);
  const [isRhReportOpen, setIsRhReportOpen] = useState(false);
  const [reportTargetRecord, setReportTargetRecord] = useState<PontoRegistro | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false);

  // Deletion modal state
  const [deletingRecord, setDeletingRecord] = useState<PontoRegistro | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Dark mode effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Load database on mount and sync with Firebase Firestore
  const loadData = useCallback(async (shouldSyncCloud = true) => {
    setIsLoading(true);
    try {
      await seedInitialDataIfEmpty();
      if (shouldSyncCloud) {
        syncWithFirestore()
          .then((stats) => {
            if (stats.downloaded > 0 || stats.uploaded > 0) {
              getAllRegistros().then(setRegistros);
            }
          })
          .catch((e) => console.warn('Sync background:', e));
      }
      const [list, config] = await Promise.all([getAllRegistros(), getSecurityConfig()]);
      setRegistros(list);
      setSecurityConfig(config);
      if (!config?.hasPin) {
        setIsLocked(true);
      }
    } catch (err) {
      console.error('Erro ao carregar banco de dados:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Subscribe to real-time updates from Firebase Cloud
  useEffect(() => {
    const unsubscribe = listenToCloudUpdates(() => {
      getAllRegistros().then((list) => {
        setRegistros(list);
      });
    });
    return () => unsubscribe();
  }, []);

  // Auto-lock timer
  useEffect(() => {
    if (isLocked || !securityConfig || securityConfig.autoLockMinutes <= 0) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsLocked(true);
      }, securityConfig.autoLockMinutes * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [isLocked, securityConfig]);

  // Save ponto handler
  const handleSaveRegistro = async (novoRegistro: PontoRegistro) => {
    await saveRegistro(novoRegistro);
    await loadData();
    showToast(`Comprovante de ${formatDateBr(novoRegistro.data)} salvo no banco de dados!`);
  };

  // Confirm delete handler (replaces window.confirm completely)
  const handleConfirmDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteRegistro(id);
      await loadData();
      setDeletingRecord(null);
      setSelectedDayRecord(null);
      showToast('Registro e foto do canhoto excluídos com sucesso.');
    } catch (err) {
      console.error('Erro ao excluir:', err);
      showToast('Erro ao excluir o registro.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditRecord = (rec: PontoRegistro) => {
    setEditingRecord(rec);
    setPreselectedDate(rec.data);
    setIsFormModalOpen(true);
  };

  const handleViewPhoto = (rec: PontoRegistro) => {
    setViewingPhotoRecord(rec);
  };

  const handleOpenReport = (rec?: PontoRegistro) => {
    setReportTargetRecord(rec || null);
    setIsRhReportOpen(true);
  };

  // When clicking on an empty calendar day: open new registration prefilled with that date!
  const handleSelectEmptyDay = (dateStr: string) => {
    setEditingRecord(null);
    setPreselectedDate(dateStr);
    setIsFormModalOpen(true);
  };

  // When clicking on a registered day in calendar: open day details modal!
  const handleSelectDayRecord = (rec: PontoRegistro) => {
    setSelectedDayRecord(rec);
  };

  // Compute available months for filter
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    for (const r of registros) {
      if (r.data && r.data.length >= 7) {
        const ym = r.data.substring(0, 7);
        monthsSet.add(ym);
      }
    }
    return Array.from(monthsSet).sort().reverse();
  }, [registros]);

  // Filtered records
  const filteredRegistros = useMemo(() => {
    return registros.filter((r) => {
      if (currentFilter === 'divergencias' && r.statusRh !== 'divergencia') return false;
      if (currentFilter === 'aprovados' && r.statusRh !== 'aprovado') return false;
      if (currentFilter === 'pendentes' && r.statusRh !== 'pendente') return false;

      if (selectedMonth !== 'todos' && !r.data.startsWith(selectedMonth)) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const dataBr = formatDateBr(r.data).toLowerCase();
        const dateIso = r.data.toLowerCase();
        const nsr = (r.nsr || '').toLowerCase();
        const motivo = (r.motivoDivergencia || '').toLowerCase();
        const empresa = (r.empresa || '').toLowerCase();
        const obs = (r.observacoes || '').toLowerCase();

        const match =
          dataBr.includes(term) ||
          dateIso.includes(term) ||
          nsr.includes(term) ||
          motivo.includes(term) ||
          empresa.includes(term) ||
          obs.includes(term);

        if (!match) return false;
      }

      return true;
    });
  }, [registros, currentFilter, selectedMonth, searchTerm]);

  const divergenciasCount = useMemo(() => {
    return registros.filter((r) => r.statusRh === 'divergencia').length;
  }, [registros]);

  // If locked, render secure PIN lock screen
  if (isLocked) {
    return (
      <LockScreen
        config={securityConfig}
        onUnlock={() => setIsLocked(false)}
        onConfigUpdated={(newConfig) => setSecurityConfig(newConfig)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors pb-20 sm:pb-8">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-18 right-4 z-50 flex items-center gap-2 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-xl ring-1 ring-black/5 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Navbar following Top Bar Contract */}
      <Navbar
        onOpenNewModal={() => {
          setEditingRecord(null);
          setPreselectedDate('');
          setIsFormModalOpen(true);
        }}
        onLock={() => setIsLocked(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCloudSync={() => setIsCloudSyncOpen(true)}
        onOpenRhReport={() => handleOpenReport()}
        isRhMode={isRhMode}
        onToggleRhMode={() => setIsRhMode(!isRhMode)}
        viewMode={viewMode}
        onChangeViewMode={(mode) => setViewMode(mode)}
        currentFilter={currentFilter}
        onChangeFilter={(f) => {
          setCurrentFilter(f);
          setViewMode('lista');
        }}
        divergenciasCount={divergenciasCount}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />

      {/* Main Viewport Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 pt-6 pb-12 space-y-6">
        {/* RH Mode Presentation Banner */}
        {isRhMode && (
          <div className="rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs text-amber-900 dark:text-amber-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-sm">Modo de Apresentação ao Gerente de RH Ativado</p>
                <p className="text-amber-700 dark:text-amber-300">
                  Ações de exclusão e edição foram bloqueadas para proteger a integridade dos dados durante a auditoria.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenReport()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 text-white font-semibold text-xs shadow-xs hover:bg-amber-500"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Emitir Dossiê em PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setIsRhMode(false)}
                className="px-3 py-1.5 rounded-lg border border-amber-400 dark:border-amber-700 font-semibold text-xs text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
              >
                Encerrar Modo RH
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Top Summaries & Search Bar with View Mode Switcher */}
        <SummaryStats
          registros={registros}
          viewMode={viewMode}
          onChangeViewMode={(mode) => setViewMode(mode)}
          selectedFilter={currentFilter}
          onChangeFilter={(f) => {
            setCurrentFilter(f);
            setViewMode('lista');
          }}
          searchTerm={searchTerm}
          onChangeSearch={(t) => setSearchTerm(t)}
          selectedMonth={selectedMonth}
          onChangeMonth={(m) => setSelectedMonth(m)}
          availableMonths={availableMonths}
        />

        {/* View Switch: Monthly Calendar vs List */}
        {viewMode === 'calendario' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Calendário Mensal de Apontamento
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Clique no dia trabalhado para inspecionar o canhoto ou no dia vazio para registrar um novo ponto
                </p>
              </div>

              {!isRhMode && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRecord(null);
                    setPreselectedDate('');
                    setIsFormModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500"
                >
                  <Plus className="h-4 w-4" />
                  <span>Novo Ponto</span>
                </button>
              )}
            </div>

            {/* Interactive Monthly Calendar */}
            <MonthlyCalendar
              registros={registros}
              onSelectDayRecord={handleSelectDayRecord}
              onSelectEmptyDay={handleSelectEmptyDay}
              isRhMode={isRhMode}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Records Header */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {currentFilter === 'divergencias'
                    ? 'Canhotos com Divergência no RH'
                    : currentFilter === 'aprovados'
                    ? 'Canhotos Conferidos e Aprovados'
                    : currentFilter === 'pendentes'
                    ? 'Canhotos Pendentes de Fechamento'
                    : 'Histórico de Comprovantes de Ponto'}
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                  ({filteredRegistros.length})
                </span>
              </div>

              {!isRhMode && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingRecord(null);
                    setPreselectedDate('');
                    setIsFormModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar Ponto</span>
                </button>
              )}
            </div>

            {/* List of Ponto Cards */}
            {filteredRegistros.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredRegistros.map((registro) => (
                  <PontoCard
                    key={registro.id}
                    registro={registro}
                    onViewPhoto={handleViewPhoto}
                    onEdit={handleEditRecord}
                    onRequestDelete={(rec) => setDeletingRecord(rec)}
                    onOpenReportForDate={(rec) => handleOpenReport(rec)}
                    isRhMode={isRhMode}
                  />
                ))}
              </div>
            ) : (
              /* Empty State */
              <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 p-8 sm:p-12 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Camera className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {searchTerm || currentFilter !== 'todos'
                    ? 'Nenhum canhoto encontrado para este filtro'
                    : 'Nenhum comprovante de ponto cadastrado'}
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
                  {searchTerm || currentFilter !== 'todos'
                    ? 'Tente alterar os termos da busca ou mudar o filtro selecionado.'
                    : 'Fotografe o canhoto de papel emitido pelo relógio da sua empresa para garantir a prova dos seus horários.'}
                </p>

                <div className="mt-5 flex items-center justify-center gap-3">
                  {searchTerm || currentFilter !== 'todos' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setCurrentFilter('todos');
                        setSelectedMonth('todos');
                      }}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      Limpar Filtros
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRecord(null);
                        setPreselectedDate('');
                        setIsFormModalOpen(true);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-xs sm:text-sm font-semibold text-white shadow-md hover:bg-emerald-500 transition-all cursor-pointer"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Fotografar Primeiro Canhoto</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (Mobile Touch Ergonomics §3 Pattern 1) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95 backdrop-blur-md grid grid-cols-5 items-center h-16 px-1">
        <button
          type="button"
          onClick={() => setViewMode('calendario')}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            viewMode === 'calendario'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <CalendarDays className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Calendário</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode('lista');
            setCurrentFilter('todos');
          }}
          className={`flex flex-col items-center justify-center py-1 transition-colors ${
            viewMode === 'lista' && currentFilter === 'todos'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <List className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Lista</span>
        </button>

        {!isRhMode ? (
          <button
            type="button"
            onClick={() => {
              setEditingRecord(null);
              setPreselectedDate('');
              setIsFormModalOpen(true);
            }}
            className="flex flex-col items-center justify-center py-1 text-emerald-600 dark:text-emerald-400"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/30">
              <Camera className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-bold mt-0.5 text-slate-800 dark:text-slate-200">
              + Canhoto
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleOpenReport()}
            className="flex flex-col items-center justify-center py-1 text-amber-600 dark:text-amber-400 font-semibold"
          >
            <FileSpreadsheet className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Dossiê</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setViewMode('lista');
            setCurrentFilter('divergencias');
          }}
          className={`relative flex flex-col items-center justify-center py-1 transition-colors ${
            currentFilter === 'divergencias' && viewMode === 'lista'
              ? 'text-rose-600 dark:text-rose-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Erros RH</span>
          {divergenciasCount > 0 && (
            <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-rose-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setIsLocked(true)}
          className="flex flex-col items-center justify-center py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <Lock className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Bloquear</span>
        </button>
      </nav>

      {/* Modals */}
      <PontoFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingRecord(null);
          setPreselectedDate('');
        }}
        onSave={handleSaveRegistro}
        initialData={editingRecord}
        preselectedDate={preselectedDate}
        defaultEmpresa={securityConfig?.empresaPadrao || 'Vidronox'}
        jornadaPadraoMinutos={securityConfig?.jornadaPadraoMinutos || 480}
      />

      <DayDetailsModal
        isOpen={Boolean(selectedDayRecord)}
        registro={selectedDayRecord}
        onClose={() => setSelectedDayRecord(null)}
        onViewPhoto={handleViewPhoto}
        onEdit={handleEditRecord}
        onRequestDelete={(rec) => setDeletingRecord(rec)}
        onOpenReport={(rec) => handleOpenReport(rec)}
        isRhMode={isRhMode}
      />

      <DeleteConfirmModal
        isOpen={Boolean(deletingRecord)}
        registro={deletingRecord}
        onClose={() => setDeletingRecord(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      <PhotoViewerModal
        registro={viewingPhotoRecord}
        onClose={() => setViewingPhotoRecord(null)}
        onOpenReport={(rec) => handleOpenReport(rec)}
      />

      <RhAuditModal
        isOpen={isRhReportOpen}
        onClose={() => {
          setIsRhReportOpen(false);
          setReportTargetRecord(null);
        }}
        registro={reportTargetRecord}
        allRegistros={registros}
        config={securityConfig}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={securityConfig}
        onConfigUpdated={(newConf) => setSecurityConfig(newConf)}
        onDataReload={loadData}
      />

      <CloudSyncModal
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        onSyncComplete={loadData}
      />
    </div>
  );
}
