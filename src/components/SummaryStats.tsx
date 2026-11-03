import { Clock, AlertTriangle, CheckCircle2, Calendar, Search, Filter, CalendarDays, List } from 'lucide-react';
import { PontoRegistro } from '../types/ponto';
import { minutesToTimeString } from '../utils/timeCalculations';

interface SummaryStatsProps {
  registros: PontoRegistro[];
  viewMode: 'lista' | 'calendario';
  onChangeViewMode: (mode: 'lista' | 'calendario') => void;
  selectedFilter: 'todos' | 'divergencias' | 'aprovados' | 'pendentes';
  onChangeFilter: (filter: 'todos' | 'divergencias' | 'aprovados' | 'pendentes') => void;
  searchTerm: string;
  onChangeSearch: (term: string) => void;
  selectedMonth: string;
  onChangeMonth: (month: string) => void;
  availableMonths: string[];
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({
  registros,
  viewMode,
  onChangeViewMode,
  selectedFilter,
  onChangeFilter,
  searchTerm,
  onChangeSearch,
  selectedMonth,
  onChangeMonth,
  availableMonths,
}) => {
  // Compute totals
  const totalMinutos = registros.reduce((acc, r) => acc + (r.totalMinutosTrabalhados || 0), 0);
  const totalSaldo = registros.reduce((acc, r) => acc + (r.saldoMinutos || 0), 0);
  const totalDivergencias = registros.filter((r) => r.statusRh === 'divergencia').length;
  const totalAprovados = registros.filter((r) => r.statusRh === 'aprovado').length;

  return (
    <div className="space-y-4">
      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Canhotos */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Canhotos Registrados
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {registros.length}
            </span>
            <span className="text-xs text-slate-500">comprovantes</span>
          </div>
          <span className="mt-1 block text-[11px] text-slate-400">
            {totalAprovados} validados pelo RH
          </span>
        </div>

        {/* Total Working Hours */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Jornada Efetiva Cumprida
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {minutesToTimeString(totalMinutos)}
            </span>
          </div>
          <span className="mt-1 block text-[11px] text-slate-400">soma das batidas registradas</span>
        </div>

        {/* Saldo de Horas (Extra/Débito) */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
            Saldo Acumulado
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`font-mono text-2xl font-bold tabular-nums ${
                totalSaldo > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : totalSaldo < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {totalSaldo > 0 ? '+' : ''}
              {minutesToTimeString(totalSaldo)}
            </span>
          </div>
          <span className="mt-1 block text-[11px] text-slate-400">
            {totalSaldo >= 0 ? 'Horas extras a receber/compensar' : 'Horas em débito'}
          </span>
        </div>

        {/* Divergências com RH */}
        <div
          onClick={() => onChangeFilter('divergencias')}
          className={`rounded-2xl border p-4 shadow-xs cursor-pointer transition-all ${
            totalDivergencias > 0
              ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 hover:border-rose-400'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
              Divergências com RH
            </span>
            {totalDivergencias > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`font-mono text-2xl font-bold tabular-nums ${
                totalDivergencias > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {totalDivergencias}
            </span>
            <span className="text-xs text-slate-500">
              {totalDivergencias === 1 ? 'dia com erro' : 'dias com erro'}
            </span>
          </div>
          <span className="mt-1 block text-[11px] text-rose-600 dark:text-rose-400 font-medium">
            {totalDivergencias > 0 ? 'Clique para auditar e contestar' : 'Nenhuma contestação ativa'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="Pesquisar por data (ex: 29/10), NSR, motivo ou empresa..."
            className="w-full rounded-xl border-none bg-slate-100/80 dark:bg-slate-800/60 pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Month Selector & Filter Segment */}
        <div className="flex items-center gap-2">
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => onChangeMonth(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="todos">Todos os Meses</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Interactive filter tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => onChangeFilter('todos')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedFilter === 'todos'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => onChangeFilter('divergencias')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedFilter === 'divergencias'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Divergências
            </button>
            <button
              type="button"
              onClick={() => onChangeFilter('aprovados')}
              className={`hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedFilter === 'aprovados'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Conferidos
            </button>
            <button
              type="button"
              onClick={() => onChangeFilter('pendentes')}
              className={`hidden sm:inline-block px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedFilter === 'pendentes'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Pendentes
            </button>
          </div>

          {/* View mode toggle: Lista vs Calendário */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => onChangeViewMode('lista')}
              title="Visualização em Lista"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                viewMode === 'lista'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeViewMode('calendario')}
              title="Visualização em Calendário"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                viewMode === 'calendario'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Calendário</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
