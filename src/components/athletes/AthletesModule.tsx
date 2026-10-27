import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Athlete } from '../../types';
import {
  Users,
  Plus,
  Search,
  Calendar,
  Layers,
  Edit2,
  Eye,
  CreditCard,
  Award,
  X,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import { AthleteAvatar } from '../common/AthleteAvatar';
import { AthleteDetailPage } from './AthleteDetailPage';
import { AthleteFormPage } from './AthleteFormPage';
import { formatDateBR, formatPhone, formatCurrency, normalizeSearchText } from '../../utils/formatters';

export const AthletesModule: React.FC = () => {
  const {
    athletes = [],
    classes = [],
    responsibles = [],
    selectedAthleteId,
    setSelectedAthleteId,
  } = useApp();

  type ViewMode = 'list' | 'new' | 'detail' | 'edit';
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [athleteToEdit, setAthleteToEdit] = useState<Athlete | null>(null);
  const [initialFormTab, setInitialFormTab] = useState<'bloco1' | 'bloco2' | 'bloco3' | 'bloco4' | 'bloco5'>('bloco1');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVO' | 'INATIVO' | 'DESLIGADO'>('ALL');

  // Sync with global selectedAthleteId (e.g. from GlobalSearchModal or other modules)
  useEffect(() => {
    if (selectedAthleteId) {
      setViewMode('detail');
    }
  }, [selectedAthleteId]);

  // Navigate to Detail Page
  const handleOpenDetail = (athleteId: string) => {
    setSelectedAthleteId(athleteId);
    setViewMode('detail');
  };

  // Navigate to New Athlete Page
  const handleOpenNew = () => {
    setAthleteToEdit(null);
    setSelectedAthleteId(null);
    setInitialFormTab('bloco1');
    setViewMode('new');
  };

  // Navigate to Edit Page
  const handleOpenEdit = (
    athlete: Athlete,
    tab: 'bloco1' | 'bloco2' | 'bloco3' | 'bloco4' | 'bloco5' = 'bloco1'
  ) => {
    setAthleteToEdit(athlete);
    setInitialFormTab(tab);
    setViewMode('edit');
  };

  // Return to List
  const handleBackToList = () => {
    setSelectedAthleteId(null);
    setAthleteToEdit(null);
    setInitialFormTab('bloco1');
    setViewMode('list');
  };

  // After form success
  const handleFormSuccess = (savedAthlete: Athlete) => {
    if (savedAthlete && savedAthlete.id) {
      setSelectedAthleteId(savedAthlete.id);
      setViewMode('detail');
    } else {
      handleBackToList();
    }
  };

  // Filter and sort athletes alphabetically (Declared before any early returns to respect React Hook rules)
  const filteredAthletes = useMemo(() => {
    const qRaw = searchTerm.trim();
    const qNormalized = normalizeSearchText(qRaw);
    const qDigits = qRaw.replace(/\D/g, '');

    return (athletes || [])
      .filter((a) => {
        // Status filter
        if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;

        // Class filter
        if (selectedClass) {
          if (selectedClass === 'SEM_TURMA') {
            if (a.current_class_id || a.class_id) return false;
          } else {
            const matchesId = a.current_class_id === selectedClass || a.class_id === selectedClass;
            const targetClass = (classes || []).find((c) => c.id === selectedClass);
            const matchesName =
              targetClass &&
              a.class_name &&
              normalizeSearchText(a.class_name) === normalizeSearchText(targetClass.name);
            if (!matchesId && !matchesName) return false;
          }
        }

        // Search query
        if (qNormalized) {
          // 1. Athlete Name (accent insensitive)
          const nameNormalized = normalizeSearchText(a.name);
          const matchName = nameNormalized.includes(qNormalized);

          // 2. Nickname / Apelido
          const nickNormalized = normalizeSearchText(a.nickname);
          const matchNick = nickNormalized.includes(qNormalized);

          // 3. CPF (match formatted or clean digits ONLY if user entered digits)
          let matchCpf = false;
          if (qDigits.length > 0) {
            const cpfDigits = (a.cpf || '').replace(/\D/g, '');
            matchCpf = cpfDigits.includes(qDigits) || (a.cpf || '').includes(qRaw);
          }

          // 4. Responsible Name & Phone (checks both direct fields and linked responsible)
          const resp = (responsibles || []).find((r) => r.id === a.responsible_id);
          const directRespName = normalizeSearchText(a.responsible_name);
          const linkedRespName = normalizeSearchText(resp?.name);
          const matchRespName = directRespName.includes(qNormalized) || linkedRespName.includes(qNormalized);

          // 5. Phone / WhatsApp (match if user entered digits)
          let matchPhone = false;
          if (qDigits.length >= 2) {
            const respDirectDigits = (a.responsible_phone || '').replace(/\D/g, '');
            const respLinkedDigits = (resp?.phone || '').replace(/\D/g, '');
            const athletePhoneDigits = (a.phone || '').replace(/\D/g, '');
            matchPhone =
              respDirectDigits.includes(qDigits) ||
              respLinkedDigits.includes(qDigits) ||
              athletePhoneDigits.includes(qDigits);
          }

          // 6. Class name & Category
          const athleteClass = (classes || []).find((c) => c.id === a.current_class_id || c.id === a.class_id);
          const classNameNormalized = normalizeSearchText(athleteClass?.name || a.class_name);
          const classCategoryNormalized = normalizeSearchText(athleteClass?.category);
          const matchClass = classNameNormalized.includes(qNormalized) || classCategoryNormalized.includes(qNormalized);

          // 7. Email
          const directEmail = (a.email || '').toLowerCase();
          const respEmail = (resp?.email || '').toLowerCase();
          const matchEmail = directEmail.includes(qRaw.toLowerCase()) || respEmail.includes(qRaw.toLowerCase());

          // 8. Condition (bolsista, pagante)
          const matchCondition =
            (qNormalized.includes('bolsa') || qNormalized.includes('bolsista')) && a.financial_condition === 'BOLSA_INTEGRAL';

          if (
            !matchName &&
            !matchNick &&
            !matchCpf &&
            !matchRespName &&
            !matchPhone &&
            !matchClass &&
            !matchEmail &&
            !matchCondition
          ) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
  }, [athletes, classes, responsibles, statusFilter, selectedClass, searchTerm]);

  const hasActiveFilters = Boolean(searchTerm.trim() || selectedClass || statusFilter !== 'ALL');

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedClass('');
    setStatusFilter('ALL');
  };

  // If in 'detail' page mode
  if (viewMode === 'detail' && selectedAthleteId) {
    return (
      <AthleteDetailPage
        athleteId={selectedAthleteId}
        onBack={handleBackToList}
        onEdit={(ath, tab) => handleOpenEdit(ath, tab)}
      />
    );
  }

  // If in 'new' or 'edit' page mode
  if (viewMode === 'new' || viewMode === 'edit') {
    return (
      <AthleteFormPage
        athleteToEdit={athleteToEdit}
        initialTab={initialFormTab}
        onBack={() => {
          if (athleteToEdit) {
            setViewMode('detail');
          } else {
            handleBackToList();
          }
        }}
        onSuccess={handleFormSuccess}
      />
    );
  }

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" size={26} />
            Gestão de Atletas & Alunos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Cadastro completo, fichas detalhadas, vinculação de turmas, responsáveis e controle de mensalidades.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenNew}
          leftIcon={<Plus size={16} />}
        >
          Novo Atleta
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Atletas Ativos"
          value={(athletes || []).filter((a) => a.status === 'ATIVO').length}
          icon={Users}
        />
        <StatCard
          title="Bolsistas / Isenções"
          value={(athletes || []).filter((a) => a.financial_condition === 'BOLSA_INTEGRAL').length}
          icon={CreditCard}
        />
        <StatCard
          title="Total de Alunos Cadastrados"
          value={(athletes || []).length}
          icon={Users}
        />
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto flex-1 max-w-md">
            <div className="relative w-full">
              <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome do aluno, responsável, CPF ou turma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition-all bg-white"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer rounded-full hover:bg-slate-100"
                  title="Limpar busca"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="text-xs border border-slate-300 rounded-xl px-3 py-2 outline-none cursor-pointer bg-white font-medium"
            >
              <option value="">Todas as Turmas</option>
              <option value="SEM_TURMA">Sem Turma Vinculada</option>
              {(classes || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.category})
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-semibold">
              {(
                [
                  { id: 'ALL', label: 'Todos' },
                  { id: 'ATIVO', label: 'Ativos' },
                  { id: 'INATIVO', label: 'Inativos' },
                  { id: 'DESLIGADO', label: 'Desligados' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Clear All Filters Button */}
            {hasActiveFilters && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleClearFilters}
                className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                leftIcon={<RotateCcw size={13} />}
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Filter results info */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
            <span>
              Exibindo <strong>{filteredAthletes.length}</strong> de <strong>{(athletes || []).length}</strong> atletas
              {searchTerm && <span> para "{searchTerm}"</span>}
            </span>
            <button
              onClick={handleClearFilters}
              className="text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Resetar filtros
            </button>
          </div>
        )}

        {/* Athletes Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold bg-slate-50/50">
                <th className="py-3 px-3">Atleta</th>
                <th className="py-3 px-3">Turma Oficial</th>
                <th className="py-3 px-3">Nascimento</th>
                <th className="py-3 px-3">Responsável</th>
                <th className="py-3 px-3">Condição Financeira</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAthletes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search size={28} className="text-slate-300" />
                      <p className="font-semibold text-slate-600">Nenhum atleta encontrado</p>
                      <p className="text-xs text-slate-400 max-w-sm">
                        {hasActiveFilters
                          ? 'Nenhum atleta corresponde aos termos de busca e filtros selecionados.'
                          : 'Nenhum atleta cadastrado no sistema.'}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleClearFilters}
                          leftIcon={<RotateCcw size={13} />}
                          className="mt-2"
                        >
                          Limpar Busca e Filtros
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAthletes.map((athlete) => {
                  // Resolve class
                  const athleteClass = (classes || []).find(
                    (c) => c.id === athlete.current_class_id || c.id === athlete.class_id
                  );
                  // Resolve responsible
                  const resp = (responsibles || []).find((r) => r.id === athlete.responsible_id);
                  const respName = resp?.name || athlete.responsible_name || 'Não informado';
                  const respPhone = resp?.phone || athlete.responsible_phone || '';

                  return (
                    <tr
                      key={athlete.id}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetail(athlete.id)}
                    >
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <AthleteAvatar
                            photoUrl={athlete.photo_url}
                            name={athlete.name}
                            size="sm"
                          />
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors block">
                              {athlete.name}
                            </span>
                            {athlete.cpf && (
                              <span className="text-[10px] text-slate-400 font-normal">
                                CPF: {athlete.cpf}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {athleteClass ? (
                          <div>
                            <span className="text-blue-800 font-semibold block">
                              {athleteClass.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {athleteClass.category} • {athleteClass.schedule_time}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium italic">
                            {athlete.class_name || 'Sem turma'}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <span>{formatDateBR(athlete.birth_date)}</span>
                      </td>

                      <td className="py-3 px-3 text-slate-600">
                        <p className="font-medium text-slate-800">{respName}</p>
                        {respPhone && (
                          <p className="text-[11px] text-slate-400">{formatPhone(respPhone)}</p>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-slate-900">
                            {formatCurrency(athlete.custom_monthly_fee ?? (athlete as any).monthly_fee ?? 180)}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {athlete.financial_condition === 'BOLSA_INTEGRAL'
                              ? 'Bolsa Integral'
                              : athlete.financial_condition === 'PAGANTE_COM_DESCONTO'
                              ? 'Com Desconto'
                              : 'Pagante Integral'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            athlete.status === 'ATIVO'
                              ? 'success'
                              : athlete.status === 'DESLIGADO'
                              ? 'danger'
                              : 'gray'
                          }
                          size="sm"
                        >
                          {athlete.status}
                        </Badge>
                      </td>

                      <td
                        className="py-3 px-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<Eye size={13} />}
                            onClick={() => handleOpenDetail(athlete.id)}
                          >
                            Ver Ficha
                          </Button>
                          <Button
                            size="sm"
                            variant="white"
                            className="border border-slate-200"
                            leftIcon={<Edit2 size={13} />}
                            onClick={() => handleOpenEdit(athlete)}
                          >
                            Editar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
