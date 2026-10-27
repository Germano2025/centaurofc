import { Athlete, MonthlyFee } from '../types';

export function calculateAthleteFeeDetails(athlete: Athlete, defaultBase: number = 180) {
  let base = defaultBase;
  const rawBase = athlete.custom_monthly_fee ?? (athlete as any).monthly_fee;
  if (rawBase !== undefined && rawBase !== null && rawBase !== '') {
    const parsed = typeof rawBase === 'number' 
      ? rawBase 
      : parseFloat(String(rawBase).replace('R$', '').trim().replace(/\./g, '').replace(',', '.'));
    if (!isNaN(parsed) && parsed >= 0) {
      base = parsed;
    }
  }

  if (athlete.financial_condition === 'BOLSA_INTEGRAL') {
    return {
      baseAmount: base,
      discount: base,
      discountAmount: base,
      finalAmount: 0,
      discountLabel: 'Bolsa Integral (100%)',
    };
  }

  if (athlete.financial_condition === 'PAGANTE_COM_DESCONTO') {
    let disc = 0;
    let label = 'Desconto Aplicado';
    if (athlete.discount_type === 'PERCENTUAL' && athlete.discount_value) {
      disc = (base * athlete.discount_value) / 100;
      label = `Desconto de ${athlete.discount_value}%`;
    } else if (athlete.discount_value) {
      disc = athlete.discount_value;
      label = `Desconto de R$ ${athlete.discount_value.toFixed(2)}`;
    }
    return {
      baseAmount: base,
      discount: disc,
      discountAmount: disc,
      finalAmount: Math.max(0, base - disc),
      discountLabel: label,
    };
  }

  return {
    baseAmount: base,
    discount: 0,
    discountAmount: 0,
    finalAmount: base,
    discountLabel: 'Sem desconto',
  };
}

export function formatCompetence(dateString?: string): string {
  if (!dateString) return '';
  const [year, month] = dateString.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const mIndex = parseInt(month, 10) - 1;
  return `${months[mIndex] || month}/${year}`;
}

export function getExtraRevenueCategoryLabel(cat?: string): string {
  switch (cat) {
    case 'UNIFORME': return 'Uniforme / Material';
    case 'MATRICULA': return 'Taxa de Matrícula';
    case 'CAMPEONATO': return 'Inscrição de Torneio';
    default: return cat || 'Outra Receita';
  }
}

export function getPaymentMethodLabel(method?: string): string {
  switch (method) {
    case 'PIX': return 'Pix';
    case 'CARTAO_CREDITO': return 'Cartão de Crédito';
    case 'DINHEIRO': return 'Dinheiro em Espécie';
    case 'BOLETO': return 'Boleto Bancário';
    default: return method || 'Não especificado';
  }
}
