export function getAthletesTemplateCSV(): string {
  return 'Nome Completo,Data de Nascimento,Responsavel,Telefone,Turma,Condicao Financeira\nJoão Silva,2012-05-15,Maria Silva,(81) 98888-1234,Sub-11,PAGANTE_SEM_DESCONTO';
}

export function getLeadsTemplateCSV(): string {
  return 'Nome do Aluno,Data Nascimento,Responsavel,WhatsApp,Turma Pretendida,Origem\nPedro Santos,2013-08-20,Marcos Santos,(81) 99999-5678,Sub-11,WHATSAPP';
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
