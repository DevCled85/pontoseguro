export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

export function minutesToTimeString(totalMinutes: number): string {
  const isNegative = totalMinutes < 0;
  const absMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const prefix = isNegative ? '-' : '';
  return `${prefix}${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

export function calculateJornada(
  entrada: string,
  saidaAlmoco: string,
  retornoAlmoco: string,
  saidaFinal: string,
  jornadaPadraoMinutos = 480
): {
  totalMinutosTrabalhados: number;
  totalMinutosIntervalo: number;
  saldoMinutos: number;
  periodo1Minutos: number;
  periodo2Minutos: number;
} {
  const e1 = timeStringToMinutes(entrada);
  const s1 = timeStringToMinutes(saidaAlmoco);
  const e2 = timeStringToMinutes(retornoAlmoco);
  const s2 = timeStringToMinutes(saidaFinal);

  let periodo1Minutos = 0;
  if (entrada && saidaAlmoco && s1 >= e1) {
    periodo1Minutos = s1 - e1;
  }

  let totalMinutosIntervalo = 0;
  if (saidaAlmoco && retornoAlmoco && e2 >= s1) {
    totalMinutosIntervalo = e2 - s1;
  }

  let periodo2Minutos = 0;
  if (retornoAlmoco && saidaFinal && s2 >= e2) {
    periodo2Minutos = s2 - e2;
  } else if (!saidaAlmoco && !retornoAlmoco && entrada && saidaFinal && s2 >= e1) {
    // Direct shift without lunch recorded
    periodo1Minutos = s2 - e1;
    periodo2Minutos = 0;
  }

  const totalMinutosTrabalhados = periodo1Minutos + periodo2Minutos;
  const saldoMinutos = totalMinutosTrabalhados > 0 ? totalMinutosTrabalhados - jornadaPadraoMinutos : 0;

  return {
    totalMinutosTrabalhados,
    totalMinutosIntervalo,
    saldoMinutos,
    periodo1Minutos,
    periodo2Minutos,
  };
}

export function formatDateBr(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

export function formatDateLongBr(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
