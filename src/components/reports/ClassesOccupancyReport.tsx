import React, { useState, useMemo } from 'react';
import {
  Layers,
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Shield,
} from 'lucide-react';
import { SoccerClass, Athlete } from '../../types';
import { Badge } from '../common/Badge';
import { exportReportToPDF, exportReportToCSV } from '../../utils/reportExportUtils';
import { FileText, FileSpreadsheet } from 'lucide-react';

interface ClassesOccupancyReportProps {
  classes: SoccerClass[];
  athletes: Athlete[];
  selectedClassId: string;
}

export const ClassesOccupancyReport: React.FC<ClassesOccupancyReportProps> = ({
  classes = [],
  athletes = [],
  selectedClassId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Unique categories from classes
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      if (c.category) set.add(c.category.trim());
    });
    return Array.from(set).sort();
  }, [classes]);

  // Classes detailed metrics
  const classRows = useMemo(() => {
    return (classes || [])
      .filter((cls) => {
        if (selectedClassId !== 'ALL' && cls.id !== selectedClassId) return false;
        if (categoryFilter !== 'ALL' && cls.category !== categoryFilter) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          const nameMatch = cls.name.toLowerCase().includes(q);
          const coachMatch = (cls.coach_name || '').toLowerCase().includes(q);
          const catMatch = (cls.category || '').toLowerCase().includes(q);
          if (!nameMatch && !coachMatch && !catMatch) return false;
        }
        return true;
      })
      .map((cls) => {
        const classAthletes = (athletes || []).filter(
          (a) => (a.current_class_id === cls.id || a.class_id === cls.id) && a.status === 'ATIVO'
        );
        const capacity = cls.capacity_recommended || 30;
        const activeCount = classAthletes.length;
        const availableSlots = Math.max(0, capacity - activeCount);
        const occupancyRate = capacity > 0 ? (activeCount / capacity) * 100 : 0;

        return {
          id: cls.id,
          name: cls.name,
          category: cls.category || 'Geral',
          coach: cls.coach_name || 'Comissão Técnica',
          scheduleDays: (cls.schedule_days || []).join(', ') || 'A definir',
          scheduleTime: cls.schedule_time || 'A definir',
          location: cls.location || 'CT Caxangá',
          capacity,
          activeCount,
          availableSlots,
          occupancyRate,
          active: cls.active !== false,
        };
      })
      .sort((a, b) => b.occupancyRate - a.occupancyRate);
  }, [classes, athletes, selectedClassId, categoryFilter, searchTerm]);

  // Consolidated Metrics
  const totalClasses = classRows.length;
  const totalCapacity = classRows.reduce((acc, c) => acc + c.capacity, 0);
  const totalEnrolled = classRows.reduce((acc, c) => acc + c.activeCount, 0);
  const totalSlots = Math.max(0, totalCapacity - totalEnrolled);
  const overallOccupancy = totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0;
  const fullClasses = classRows.filter((c) => c.occupancyRate >= 95).length;

  const handleExportPDF = () => {
    const targetClass = classes.find((c) => c.id === selectedClassId);

    const columns = ['Turma', 'Categoria', 'Professor', 'Dias / Horário', 'Capacidade', 'Matriculados', 'Vagas Livres', 'Ocupação (%)'];
    const rows = classRows.map((c) => [
      c.name,
      c.category,
      c.coach,
      `${c.scheduleDays} - ${c.scheduleTime}`,
      c.capacity,
      c.activeCount,
      c.availableSlots,
      `${c.occupancyRate.toFixed(0)}%`,
    ]);

    exportReportToPDF({
      title: 'Relatório Gerencial de Ocupação & Capacidade de Turmas',
      subtitle: 'Centro de Formação Centauro • Gestão Integrada',
      filtersApplied: [
        { label: 'Turma', value: targetClass ? targetClass.name : 'Todas as Turmas' },
        { label: 'Categoria', value: categoryFilter },
      ],
      summaryMetrics: [
        { label: 'Turmas', value: `${totalClasses}` },
        { label: 'Capacidade Total', value: `${totalCapacity}` },
        { label: 'Matriculados', value: `${totalEnrolled}` },
        { label: 'Vagas Livres', value: `${totalSlots}` },
        { label: 'Taxa Ocupação', value: `${overallOccupancy.toFixed(0)}%` },
      ],
      columns,
      rows,
      filename: `relatorio-ocupacao-turmas-${new Date().toISOString().split('T')[0]}`,
      orientation: 'landscape',
    });
  };

  const handleExportCSV = () => {
    const columns = [
      'ID Turma',
      'Nome da Turma',
      'Categoria',
      'Professor',
      'Dias',
      'Horário',
      'Capacidade Recomendada',
      'Alunos Matriculados',
      'Vagas Disponíveis',
      'Taxa de Ocupação (%)',
      'Local',
    ];

    const rows = classRows.map((c) => [
      c.id,
      c.name,
      c.category,
      c.coach,
      c.scheduleDays,
      c.scheduleTime,
      c.capacity,
      c.activeCount,
      c.availableSlots,
      c.occupancyRate.toFixed(1),
      c.location,
    ]);

    exportReportToCSV(
      `relatorio-ocupacao-turmas-${new Date().toISOString().split('T')[0]}`,
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
            <Layers size={18} className="text-blue-600" />
            <span>Capacidade e Taxa de Ocupação das Turmas</span>
          </h3>
          <p className="text-xs text-slate-500">
            Monitoramento de vagas livres, lotação recomendada, horários e distribuição por categorias.
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Turmas Monitoradas
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{totalClasses}</span>
            <span className="text-xs font-bold text-slate-500">
              {availableCategories.length} categorias
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Turmas ativas no CT Caxangá</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Capacidade Total
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-blue-700">{totalCapacity}</span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              {totalEnrolled} ocupadas
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Vagas máximas recomendadas</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Vagas Disponíveis
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">{totalSlots}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Prontas para matricular
            </span>
          </div>
          <p className="text-[11px] text-slate-400">{fullClasses} turmas com lotação esgotada</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Taxa Média de Ocupação
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-purple-700">
              {overallOccupancy.toFixed(0)}%
            </span>
            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              Meta: 80%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                overallOccupancy >= 80 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, overallOccupancy)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar turma ou professor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none bg-white font-semibold cursor-pointer"
            >
              <option value="ALL">Todas as Categorias</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold bg-slate-50/50">
                <th className="py-2.5 px-3">Turma</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Professor</th>
                <th className="py-2.5 px-3">Horário & Dias</th>
                <th className="py-2.5 px-3 text-center">Capacidade</th>
                <th className="py-2.5 px-3 text-center">Alunos Ativos</th>
                <th className="py-2.5 px-3 text-center">Vagas Livres</th>
                <th className="py-2.5 px-3">Taxa de Lotação</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Nenhuma turma encontrada.
                  </td>
                </tr>
              ) : (
                classRows.map((cls) => (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{cls.name}</td>
                    <td className="py-3 px-3 font-semibold text-blue-700">{cls.category}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{cls.coach}</td>
                    <td className="py-3 px-3 text-slate-600">
                      <div>{cls.scheduleTime}</div>
                      <div className="text-[11px] text-slate-400">{cls.scheduleDays}</div>
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-600">{cls.capacity}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">{cls.activeCount}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-black text-xs ${
                          cls.availableSlots === 0 ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {cls.availableSlots}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              cls.occupancyRate >= 95
                                ? 'bg-rose-500'
                                : cls.occupancyRate >= 75
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, cls.occupancyRate)}%` }}
                          />
                        </div>
                        <span className="font-bold text-[11px] text-slate-700">
                          {cls.occupancyRate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          cls.occupancyRate >= 95
                            ? 'danger'
                            : cls.occupancyRate >= 75
                            ? 'success'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {cls.occupancyRate >= 95
                          ? 'Lotada'
                          : cls.occupancyRate >= 75
                          ? 'Boa Ocupação'
                          : 'Vagas Abertas'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
