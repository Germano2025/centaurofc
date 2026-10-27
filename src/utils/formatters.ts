import { TrialLead } from '../types';

export function formatDateBR(dateString?: string | null): string {
  if (!dateString) return 'Não informada';
  try {
    const clean = dateString.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  } catch {
    return dateString || '';
  }
}

export function formatCurrency(value?: number | string | null): string {
  if (value === undefined || value === null) return 'R$ 0,00';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return 'R$ 0,00';
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatCPF(cpf?: string | null): string {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '').slice(0, 11);
  return clean
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatCEP(cep?: string | null): string {
  if (!cep) return '';
  const clean = cep.replace(/\D/g, '').slice(0, 8);
  return clean.replace(/(\d{5})(\d)/, '$1-$2');
}

export function formatPhone(phone?: string | null): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '').slice(0, 11);
  if (clean.length > 10) {
    return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  } else if (clean.length > 6) {
    return clean.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
  } else if (clean.length > 2) {
    return clean.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
  }
  return clean;
}

export function cleanDigits(str?: string | null): string {
  if (!str) return '';
  return str.replace(/\D/g, '');
}

export function getLeadSubmissionDate(lead: TrialLead): string {
  if (lead.entry_date) return formatDateBR(lead.entry_date);
  if (lead.created_at) return formatDateBR(lead.created_at);
  return 'Recente';
}

export function getLeadRawSubmissionDate(lead: TrialLead): string {
  return lead.created_at || lead.entry_date || '';
}

export function formatTimeAgo(dateString?: string): string {
  if (!dateString) return '';
  try {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `Há ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Há ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Há ${days}d`;
  } catch {
    return '';
  }
}

export function formatNonConversionReason(reason?: string): string {
  switch (reason) {
    case 'DESISTENCIA':
      return 'Desistência do Responsável';
    case 'SEM_INTERESSE':
      return 'Sem Interesse / Não Respondeu';
    case 'VALOR':
      return 'Valor / Financeiro';
    case 'HORARIO':
      return 'Choque de Horários';
    case 'OUTRA_ESCOLINHA':
      return 'Optou por outra escolinha';
    default:
      return reason || 'Não informado';
  }
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function normalizeSearchText(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function formatRelativeTime(dateInput?: string | Date): string {
  if (!dateInput) return '';
  try {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 45) return 'Agora mesmo';
    if (diffMin < 60) return `há ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
    if (diffHour < 24) return `há ${diffHour} ${diffHour === 1 ? 'hora' : 'horas'}`;
    if (diffDay === 1) {
      const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `Ontem às ${timeStr}`;
    }
    if (diffDay < 7) return `há ${diffDay} dias`;

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
