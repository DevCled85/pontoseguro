import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Camera,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Calendar as CalendarIcon,
  Clock,
} from 'lucide-react';
import { PontoRegistro } from '../types/ponto';
import { getTodayDateString, minutesToTimeString } from '../utils/timeCalculations';

interface MonthlyCalendarProps {
  registros: PontoRegistro[];
  onSelectDayRecord: (registro: PontoRegistro) => void;
  onSelectEmptyDay: (dateString: string) => void;
  isRhMode: boolean;
}

export const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  registros,
  onSelectDayRecord,
  onSelectEmptyDay,
  isRhMode,
}) => {
  // Current displayed year and month
  const todayStr = getTodayDateString();
  const [currentDate, setCurrentDate] = useState(() => {
    const [y, m] = todayStr.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleTodayMonth = () => {
    const [y, m] = todayStr.split('-').map(Number);
    setCurrentDate(new Date(y, m - 1, 1));
  };

  // Map registros by date "YYYY-MM-DD"
  const recordsByDate = useMemo(() => {
    const map = new Map<string, PontoRegistro>();
    for (const r of registros) {
      if (r.data) {
        map.set(r.data, r);
      }
    }
    return map;
  }, [registros]);

  // Calendar matrix calculations
  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long' });
  const capitalizedMonthName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 for Sunday
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Generate calendar cells (6 weeks = 42 cells)
  const calendarCells = useMemo(() => {
    const cells = [];

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dayNum,
        dateStr,
        isCurrentMonth: false,
        record: recordsByDate.get(dateStr),
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dayNum: d,
        dateStr,
        isCurrentMonth: true,
        record: recordsByDate.get(dateStr),
      });
    }

    // 3. Next month leading days to complete grid
    const remaining = 42 - cells.length;
    for (let nextD = 1; nextD <= remaining; nextD++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`;
      cells.push({
        dayNum: nextD,
        dateStr,
        isCurrentMonth: false,
        record: recordsByDate.get(dateStr),
      });
    }

    return cells;
  }, [year, month, firstDayIndex, daysInMonth, daysInPrevMonth, recordsByDate]);

  // Monthly stats
  const currentMonthRegistros = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return registros.filter((r) => r.data && r.data.startsWith(prefix));
  }, [registros, year, month]);

  const monthTotalMinutos = currentMonthRegistros.reduce((acc, r) => acc + (r.totalMinutosTrabalhados || 0), 0);
  const monthDivergencias = currentMonthRegistros.filter((r) => r.statusRh === 'divergencia').length;

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-colors">
      {/* Calendar Header with Month Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 p-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {capitalizedMonthName} de {year}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentMonthRegistros.length} comprovantes no mês · {minutesToTimeString(monthTotalMinutos)} trabalhadas
            </p>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleTodayMonth}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Mês Atual
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Mês anterior"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Próximo mês"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday Names Header */}
      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-center text-xs font-bold text-slate-500 dark:text-slate-400 py-2.5">
        <span>Dom</span>
        <span>Seg</span>
        <span>Ter</span>
        <span>Qua</span>
        <span>Qui</span>
        <span>Sex</span>
        <span>Sáb</span>
      </div>

      {/* Calendar Day Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/80 bg-slate-100/40 dark:bg-slate-900/60">
        {calendarCells.map((cell, idx) => {
          const isToday = cell.dateStr === todayStr;
          const hasRecord = Boolean(cell.record);
          const isDivergence = cell.record?.statusRh === 'divergencia';
          const isApproved = cell.record?.statusRh === 'aprovado';

          return (
            <div
              key={idx}
              onClick={() => {
                if (hasRecord && cell.record) {
                  onSelectDayRecord(cell.record);
                } else if (!isRhMode) {
                  onSelectEmptyDay(cell.dateStr);
                }
              }}
              className={`group relative min-h-[92px] sm:min-h-[110px] p-1.5 sm:p-2 transition-all cursor-pointer ${
                !cell.isCurrentMonth
                  ? 'bg-slate-50/50 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600'
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-emerald-50/30 dark:hover:bg-slate-800/80'
              } ${isToday ? 'ring-2 ring-inset ring-emerald-500' : ''}`}
            >
              {/* Day Number Row */}
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                    isToday
                      ? 'bg-emerald-600 text-white font-black shadow-xs'
                      : hasRecord
                      ? 'font-bold text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {cell.dayNum}
                </span>

                {/* Has Canhoto Photo indicator */}
                {hasRecord && cell.record?.fotoUrl && (
                  <span
                    title="Canhoto original anexado"
                    className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    <Camera className="h-3 w-3" />
                  </span>
                )}
              </div>

              {/* Day Content: Record preview or Add trigger */}
              <div className="mt-1.5">
                {hasRecord && cell.record ? (
                  <div
                    className={`rounded-xl p-1.5 text-left border transition-all ${
                      isDivergence
                        ? 'border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                        : isApproved
                        ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1 font-mono text-[10px] sm:text-xs font-bold leading-tight truncate">
                      {isDivergence ? (
                        <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                      ) : isApproved ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                      ) : (
                        <Clock className="h-3 w-3 text-emerald-600 shrink-0" />
                      )}
                      <span>
                        {cell.record.totalMinutosTrabalhados > 0
                          ? minutesToTimeString(cell.record.totalMinutosTrabalhados)
                          : cell.record.entrada
                          ? `Batida ${cell.record.entrada}`
                          : 'Ponto Registrado'}
                      </span>
                    </div>

                    <div className="mt-0.5 text-[9px] sm:text-[10px] text-slate-600 dark:text-slate-300 font-mono truncate">
                      {[cell.record.entrada, cell.record.saidaAlmoco, cell.record.retornoAlmoco, cell.record.saidaFinal]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>

                    {isDivergence && (
                      <span className="mt-0.5 block text-[8px] sm:text-[9px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-tight">
                        Erro RH
                      </span>
                    )}
                  </div>
                ) : (
                  /* Empty state on day: subtle + button on hover/touch */
                  !isRhMode && (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center justify-center pt-2 sm:pt-3 transition-opacity">
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        <Plus className="h-3 w-3" />
                        <span className="hidden sm:inline">Ponto</span>
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Calendar Bottom Legend & Info */}
      <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span>Conferido com o RH</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span>Divergência / Erro RH ({monthDivergencias})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            <span>Pendente</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          💡 Clique em qualquer dia para ver detalhes ou cadastrar novo canhoto
        </div>
      </div>
    </div>
  );
};
