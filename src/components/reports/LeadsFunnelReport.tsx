import React, { useState } from 'react';
import {
  UserPlus,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Calendar,
  Layers,
  Search,
  Filter,
  UserCheck,
} from 'lucide-react';
import { TrialLead, TrialClass, SoccerClass } from '../../types';
import { DateRange, isDateInRange } from '../../utils/reportUtils';
import { formatDateBR } from '../../utils/formatters';
import { exportReportToPDF, exportReportToCSV } from '../../utils/reportExportUtils';
import { FileSpreadsheet, FileText } from 'lucide-react';

interface LeadsFunnelReportProps {
  leads: TrialLead[];
  trialClasses: TrialClass[];
  classes: SoccerClass[];
  dateRange: DateRange;
  selectedClassId: string;
}

export const LeadsFunnelReport: React.FC<LeadsFunnelReportProps> = ({
  leads = [],
  trialClasses = [],
  classes = [],
  dateRange,
  selectedClassId,
}) => {
  const [leadSearch, setLeadSearch] = useState('');

  // Filter leads created in period
  const periodLeads = (leads || []).filter((lead) => {
    const inRange = isDateInRange(lead.created_at, dateRange.startDate, dateRange.endDate);
    if (!inRange) return false;
    if (selectedClassId !== 'ALL' && lead.preferred_class_id !== selectedClassId) return false;
    return true;
  });

  // Filter trial classes in period
  const periodTrialClasses = (trialClasses || []).filter((tc) => {
    const inRange = isDateInRange(tc.date, dateRange.startDate, dateRange.endDate);
    if (!inRange) return false;
    if (selectedClassId !== 'ALL' && tc.class_id !== selectedClassId) return false;
    return true;
  });

  // Funnel stage counts - Funil Unificado: 4 Colunas Principais
  const totalLeads = periodLeads.length;
  const stageNovoContato = periodLeads.filter(
    (l) => l.stage === 'NOVO' || l.stage === 'CONTATO_REALIZADO' || l.stage === 'NOVO_INTERESSADO'
  ).length;
  const stageAulaAgendada = periodLeads.filter(
    (l) =>
      l.stage === 'AULA_AGENDADA' ||
      l.stage === 'AULA_REALIZADA' ||
      l.stage === 'EM_DECISAO' ||
      l.stage === 'AGUARDANDO_DECISAO'
  ).length;
  const stageMatriculado = periodLeads.filter((l) => l.stage === 'MATRICULADO').length;
  const stageNaoConvertido = periodLeads.filter(
    (l) => l.stage === 'NAO_CONVERTIDO' || l.stage === 'ENCERRADO'
  ).length;

  // Conversion rate: (Matriculados ÷ Total Interessados) * 100
  const conversionRate = totalLeads > 0 ? Math.round((stageMatriculado / totalLeads) * 100) : 0;

  // Trial class status counts
  const trialsScheduled = periodTrialClasses.filter((tc) => tc.status === 'AGENDADA').length;
  const trialsDone = periodTrialClasses.filter((tc) => tc.status === 'REALIZADA').length;
  const trialsRescheduled = periodTrialClasses.filter((tc) => tc.status === 'REMARCADA').length;
  const trialsCancelled = periodTrialClasses.filter((tc) => tc.status === 'CANCELADA').length;
  const trialsNoShow = periodTrialClasses.filter((tc) => tc.status === 'NAO_COMPARECEU').length;

  // Search filtered leads table
  const displayedLeads = periodLeads.filter((l) => {
    if (leadSearch) {
      const q = leadSearch.toLowerCase();
      const matchName = l.athlete_name.toLowerCase().includes(q);
      const matchResp = (l.responsible_name || '').toLowerCase().includes(q);
      return matchName || matchResp;
    }
    return true;
  });

  const handleExportPDF = () => {
    const periodLabel = `${formatDateBR(dateRange.startDate)} a ${formatDateBR(dateRange.endDate)}`;
    const targetClass = classes.find((c) => c.id === selectedClassId);

    const columns = ['Data', 'Atleta / Interessado', 'Responsável', 'Telefone', 'Turma de Interesse', 'Etapa'];
    const rows = displayedLeads.map((l) => {
      const prefClass = classes.find((c) => c.id === l.preferred_class_id);
      const stageLabel =
        l.stage === 'MATRICULADO'
          ? 'Matriculado'
          : l.stage === 'NAO_CONVERTIDO' || l.stage === 'ENCERRADO'
          ? 'Não Convertido'
          : l.stage === 'AULA_AGENDADA' || l.stage === 'AULA_REALIZADA' || l.stage === 'EM_DECISAO'
          ? 'Aula / Decisão'
          : 'Novo Contato';

      return [
        l.created_at ? formatDateBR(l.created_at) : '-',
        l.athlete_name,
        l.responsible_name || '-',
        l.responsible_phone || '-',
        prefClass?.name || 'Geral',
        stageLabel,
      ];
    });

    exportReportToPDF({
      title: 'Relatório Gerencial de Captação & Funil de Interessados',
      subtitle: 'Centro de Formação Centauro • Gestão Integrada',
      periodLabel,
      filtersApplied: [
        { label: 'Turma', value: targetClass ? targetClass.name : 'Todas as Turmas' },
      ],
      summaryMetrics: [
        { label: 'Total Leads', value: `${totalLeads}` },
        { label: 'Matriculados', value: `${stageMatriculado}` },
        { label: 'Taxa Conversão', value: `${conversionRate.toFixed(1)}%` },
        { label: 'Aulas Realizadas', value: `${trialsDone}` },
        { label: 'Não Convertidos', value: `${stageNaoConvertido}` },
      ],
      columns,
      rows,
      filename: `relatorio-funil-interessados-${dateRange.startDate}-${dateRange.endDate}`,
      orientation: 'landscape',
    });
  };

  const handleExportCSV = () => {
    const columns = [
      'ID Lead',
      'Data de Cadastro',
      'Nome do Aluno',
      'Responsável',
      'Telefone',
      'Turma de Interesse',
      'Etapa do Funil',
      'Observações',
    ];

    const rows = displayedLeads.map((l) => {
      const prefClass = classes.find((c) => c.id === l.preferred_class_id);
      return [
        l.id,
        l.created_at ? formatDateBR(l.created_at) : '',
        l.athlete_name,
        l.responsible_name || '',
        l.responsible_phone || '',
        prefClass?.name || '',
        l.stage,
        l.notes || '',
      ];
    });

    exportReportToCSV(
      `relatorio-funil-interessados-${dateRange.startDate}-${dateRange.endDate}`,
      columns,
      rows
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar / Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600" />
            <span>Métricas do Funil de Captação e Interessados</span>
          </h3>
          <p className="text-xs text-slate-500">
            Jornada de aquisição de novos atletas: contatos, agendamentos, presenças em aulas experimentais e matrículas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Exportar documento PDF formatado"
          >
            <FileText size={15} className="text-rose-600" />
            <span>Exportar PDF</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer"
            title="Exportar planilha Excel/CSV"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>Planilha Excel</span>
          </button>
        </div>
      </div>

      {/* 1. Visão Geral e Taxa de Conversão */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserPlus size={16} className="text-blue-600" />
              Funil de Captação e Conversão em Matrícula
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhamento da jornada de captação desde o primeiro contato até a matrícula oficial.
            </p>
          </div>
          <div className="text-[11px] text-slate-400">
            Fonte: Módulo Captação e Aulas Experimentais
          </div>
        </div>

        {/* Big Conversion Metric */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-xl">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
              Total de Interessados (Leads)
            </span>
            <span className="text-3xl font-black text-blue-950 mt-1 block">
              {totalLeads}
            </span>
            <span className="text-[10px] text-blue-600 mt-0.5 block">
              Cadastrados no período
            </span>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-xl">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Matrículas Concluídas
            </span>
            <span className="text-3xl font-black text-emerald-800 mt-1 block">
              {stageMatriculado}
            </span>
            <span className="text-[10px] text-emerald-600 mt-0.5 block">
              Convertidos em atletas oficiais
            </span>
          </div>

          <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-xl">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
              Taxa de Conversão Geral
            </span>
            <span className="text-3xl font-black text-purple-900 mt-1 block">
              {conversionRate}%
            </span>
            <span className="text-[10px] text-purple-600 mt-0.5 block">
              (Matriculados ÷ Total Interessados) × 100
            </span>
          </div>
        </div>

        {/* Funnel Visual Pipeline - 4 Colunas Unificadas */}
        <div className="pt-3">
          <span className="text-xs font-bold text-slate-700 block mb-3">
            Distribuição pelas Etapas do Funil Unificado
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Novo Contato</span>
              <span className="text-xl font-black text-slate-900 block">{stageNovoContato}</span>
            </div>

            <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-center space-y-1">
              <span className="text-[10px] font-bold text-amber-700 uppercase block">2. Aula Agendada</span>
              <span className="text-xl font-black text-amber-800 block">{stageAulaAgendada}</span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">3. Matriculado</span>
              <span className="text-xl font-black text-emerald-700 block">{stageMatriculado}</span>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-1">
              <span className="text-[10px] font-bold text-rose-800 uppercase block">4. Arquivado / Não Convertidos</span>
              <span className="text-xl font-black text-rose-600 block">{stageNaoConvertido}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Relatório de Aulas Experimentais */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-600" />
              Execução de Aulas Experimentais ({periodTrialClasses.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Status das experiências práticas agendadas com os interessados no período.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl text-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Agendadas</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">{trialsScheduled}</span>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl text-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">Realizadas</span>
            <span className="text-lg font-black text-emerald-700 mt-1 block">{trialsDone}</span>
          </div>

          <div className="p-3 bg-blue-50 rounded-xl text-center">
            <span className="text-[10px] font-bold text-blue-700 uppercase block">Remarcadas</span>
            <span className="text-lg font-black text-blue-700 mt-1 block">{trialsRescheduled}</span>
          </div>

          <div className="p-3 bg-slate-100 rounded-xl text-center">
            <span className="text-[10px] font-bold text-slate-600 uppercase block">Canceladas</span>
            <span className="text-lg font-black text-slate-700 mt-1 block">{trialsCancelled}</span>
          </div>

          <div className="p-3 bg-rose-50 rounded-xl text-center">
            <span className="text-[10px] font-bold text-rose-700 uppercase block">Não Compareceu</span>
            <span className="text-lg font-black text-rose-700 mt-1 block">{trialsNoShow}</span>
          </div>
        </div>
      </div>

      {/* 3. Tabela de Interessados no Período */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck size={16} className="text-blue-600" />
              Interessados Registrados no Período ({displayedLeads.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Detalhamento de cada oportunidade de captação e turma de interesse.
            </p>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
              placeholder="Buscar interessado..."
              className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        {displayedLeads.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Nenhum interessado registrado no período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-bold text-[11px]">
                  <th className="py-3 px-4">Interessado (Atleta)</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Turma Preferencial</th>
                  <th className="py-3 px-4">Data Contato</th>
                  <th className="py-3 px-4 text-center">Etapa Atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(displayedLeads || []).slice(0, 100).map((lead) => {
                  const prefClass = classes.find((c) => c.id === lead.preferred_class_id);

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{lead.athlete_name}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {lead.responsible_name}
                        {lead.responsible_phone && (
                          <span className="block text-[10px] text-slate-400 font-mono">
                            {lead.responsible_phone}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {prefClass?.name || 'Não definida'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {formatDateBR(lead.created_at)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            lead.stage === 'MATRICULADO'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : lead.stage === 'NAO_CONVERTIDO' || lead.stage === 'ENCERRADO'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : lead.stage === 'AULA_AGENDADA' || lead.stage === 'AULA_REALIZADA' || lead.stage === 'EM_DECISAO' || lead.stage === 'AGUARDANDO_DECISAO'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {lead.stage === 'MATRICULADO'
                            ? 'Matriculado'
                            : lead.stage === 'NAO_CONVERTIDO' || lead.stage === 'ENCERRADO'
                            ? 'Arquivado / Não Convertido'
                            : lead.stage === 'AULA_AGENDADA' || lead.stage === 'AULA_REALIZADA' || lead.stage === 'EM_DECISAO' || lead.stage === 'AGUARDANDO_DECISAO'
                            ? 'Aula Agendada'
                            : 'Novo Contato'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
