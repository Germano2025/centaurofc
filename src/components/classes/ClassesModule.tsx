import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { SoccerClass, Athlete } from '../../types';
import {
  Calendar,
  Plus,
  Users,
  Clock,
  MapPin,
  ArrowRight,
  Edit2,
  Trash2,
  UserMinus,
  Search,
  Eye,
  Power,
  AlertTriangle,
  Layers,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  X,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Input, Select } from '../common/Input';
import { AthleteAvatar } from '../common/AthleteAvatar';
import { formatPhone, formatDateBR, normalizeSearchText } from '../../utils/formatters';

export const ClassesModule: React.FC = () => {
  const {
    classes = [],
    athletes = [],
    setActiveModule,
    setSelectedAthleteId,
    addClass,
    updateClass,
    deleteClass,
    toggleClassStatus,
    cancelAthleteEnrollment,
    showToast,
  } = useApp();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // New Class Modal State
  const [isNewClassModalOpen, setIsNewClassModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newScheduleDays, setNewScheduleDays] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [newCapacity, setNewCapacity] = useState('');
  const [newCoachName, setNewCoachName] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const handleOpenNewClassModal = () => {
    setNewName('');
    setNewCategory('');
    setNewScheduleDays('');
    setNewScheduleTime('');
    setNewCapacity('');
    setNewCoachName('');
    setNewLocation('');
    setIsNewClassModalOpen(true);
  };

  // Edit Class Modal State
  const [classToEdit, setClassToEdit] = useState<SoccerClass | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('Sub-11');
  const [editScheduleDays, setEditScheduleDays] = useState('');
  const [editScheduleTime, setEditScheduleTime] = useState('');
  const [editCapacity, setEditCapacity] = useState('30');
  const [editCoachName, setEditCoachName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editActive, setEditActive] = useState(true);

  // Delete Class Modal State
  const [classToDelete, setClassToDelete] = useState<SoccerClass | null>(null);

  // Class Roster Modal State (View athletes in a specific class)
  const [selectedClassForRoster, setSelectedClassForRoster] = useState<SoccerClass | null>(null);

  // Cancel Athlete Enrollment Modal State
  const [athleteToCancel, setAthleteToCancel] = useState<{
    athlete: Athlete;
    className: string;
  } | null>(null);
  const [cancelReason, setCancelReason] = useState('Incompatibilidade de Horário / Rotina');
  const [cancelNotes, setCancelNotes] = useState('');
  const [isCanceling, setIsCanceling] = useState(false);

  // Filtered classes list
  const filteredClasses = useMemo(() => {
    const qRaw = searchTerm.trim();
    const qNorm = normalizeSearchText(qRaw);

    return (classes || []).filter((cls) => {
      // Status filter
      if (statusFilter === 'ACTIVE' && !cls.active) return false;
      if (statusFilter === 'INACTIVE' && cls.active) return false;

      // Search keyword
      if (qNorm) {
        const matchName = normalizeSearchText(cls.name).includes(qNorm);
        const matchCat = normalizeSearchText(cls.category).includes(qNorm);
        const matchCoach = normalizeSearchText(cls.coach_name).includes(qNorm);
        const matchLoc = normalizeSearchText(cls.location).includes(qNorm);
        const matchDays = (cls.schedule_days || []).some((d) => normalizeSearchText(d).includes(qNorm));
        const matchTime = normalizeSearchText(cls.schedule_time).includes(qNorm);

        if (!matchName && !matchCat && !matchCoach && !matchLoc && !matchDays && !matchTime) {
          return false;
        }
      }

      return true;
    });
  }, [classes, statusFilter, searchTerm]);

  const hasActiveFilters = Boolean(searchTerm.trim() || statusFilter !== 'ALL');

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
  };

  // Open Edit Class Modal
  const handleOpenEditClass = (cls: SoccerClass) => {
    setClassToEdit(cls);
    setEditName(cls.name || '');
    setEditCategory(cls.category || 'Sub-11');
    setEditScheduleDays((cls.schedule_days || []).join(' e '));
    setEditScheduleTime(cls.schedule_time || '');
    setEditCapacity(String(cls.capacity_recommended || 30));
    setEditCoachName(cls.coach_name || '');
    setEditLocation(cls.location || 'Centauro');
    setEditActive(cls.active ?? true);
  };

  // Submit New Class
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('O nome da turma é obrigatório.', 'error');
      return;
    }

    const resolvedDays = newScheduleDays.trim()
      ? newScheduleDays.split(/ e |, /).map((d) => d.trim()).filter(Boolean)
      : ['Terça e Quinta'];

    addClass({
      name: newName.trim(),
      category: newCategory.trim() || 'Geral',
      age_group: newCategory.trim() || 'Geral',
      schedule_days: resolvedDays,
      schedule_time: newScheduleTime.trim() || '16:00 às 17:30',
      capacity_recommended: Number(newCapacity) || 30,
      active: true,
      coach_name: newCoachName.trim() || undefined,
      location: newLocation.trim() || 'Centauro',
    });

    setIsNewClassModalOpen(false);
    setNewName('');
    setNewCategory('');
    setNewScheduleDays('');
    setNewScheduleTime('');
    setNewCapacity('');
    setNewCoachName('');
    setNewLocation('');
  };

  // Submit Edit Class
  const handleSaveEditClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classToEdit || !editName.trim()) {
      showToast('O nome da turma é obrigatório.', 'error');
      return;
    }

    updateClass(classToEdit.id, {
      name: editName.trim(),
      category: editCategory.trim() || 'Geral',
      age_group: editCategory.trim() || 'Geral',
      schedule_days: editScheduleDays.split(/ e |, /).map((d) => d.trim()),
      schedule_time: editScheduleTime.trim(),
      capacity_recommended: Number(editCapacity) || 30,
      coach_name: editCoachName.trim() || undefined,
      location: editLocation.trim() || 'Centauro',
      active: editActive,
    });

    setClassToEdit(null);
  };

  // Confirm Delete Class
  const handleConfirmDeleteClass = () => {
    if (!classToDelete) return;
    deleteClass(classToDelete.id, true);
    setClassToDelete(null);
    if (selectedClassForRoster?.id === classToDelete.id) {
      setSelectedClassForRoster(null);
    }
  };

  // Confirm Athlete Enrollment Cancellation
  const handleConfirmCancelEnrollment = () => {
    if (!athleteToCancel) return;
    setIsCanceling(true);
    try {
      cancelAthleteEnrollment(
        athleteToCancel.athlete.id,
        cancelNotes.trim() ? `${cancelReason} - ${cancelNotes.trim()}` : cancelReason,
        'Coordenação / Secretaria'
      );
      setAthleteToCancel(null);
      setCancelNotes('');
    } finally {
      setIsCanceling(false);
    }
  };

  // Navigate to athlete detail page
  const handleViewAthleteDetail = (athleteId: string) => {
    setSelectedAthleteId(athleteId);
    setActiveModule('atletas');
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="text-blue-600" size={26} />
            Turmas & Horários
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Gerenciamento completo das turmas, categorias, cancelamento de matrículas e ocupação no Centauro.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenNewClassModal}
          leftIcon={<Plus size={16} />}
        >
          Nova Turma
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por turma, professor, dia ou categoria..."
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

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-center">
            {(
              [
                { id: 'ALL', label: 'Todas' },
                { id: 'ACTIVE', label: 'Ativas' },
                { id: 'INACTIVE', label: 'Inativas' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

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
            Exibindo <strong>{filteredClasses.length}</strong> de <strong>{(classes || []).length}</strong> turmas
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

      {/* Classes Grid */}
      {filteredClasses.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
          <Calendar className="mx-auto text-slate-400" size={38} />
          <h3 className="text-sm font-bold text-slate-700">Nenhuma turma encontrada</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {hasActiveFilters
              ? 'Não há turmas correspondentes aos filtros aplicados.'
              : 'Nenhuma turma cadastrada no sistema.'}
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearFilters}
                leftIcon={<RotateCcw size={14} />}
              >
                Limpar Filtros
              </Button>
            )}
            <Button
              size="sm"
              variant="primary"
              onClick={handleOpenNewClassModal}
              leftIcon={<Plus size={15} />}
            >
              Cadastrar Turma
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((cls) => {
            const classAthletes = (athletes || []).filter(
              (a) => (a.current_class_id === cls.id || a.class_id === cls.id) && a.status === 'ATIVO'
            );
            const classAthletesCount = classAthletes.length;
            const capacityMax = cls.capacity_recommended || 30;
            const percent = Math.min(100, Math.round((classAthletesCount / capacityMax) * 100));

            return (
              <div
                key={cls.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">{cls.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="primary" size="sm">
                          {cls.category}
                        </Badge>
                        <Badge variant={cls.active ? 'success' : 'gray'} size="sm">
                          {cls.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>
                    </div>

                    {/* Quick Edit & Delete Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditClass(cls)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Editar Turma"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleClassStatus(cls.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          cls.active
                            ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={cls.active ? 'Inativar Turma' : 'Ativar Turma'}
                      >
                        <Power size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setClassToDelete(cls)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Excluir Turma"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="space-y-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-blue-600 shrink-0" />
                      <span className="font-semibold text-slate-800">
                        {(cls.schedule_days || []).join(' e ') || 'Dias a definir'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <span>{cls.schedule_time || 'Horário a definir'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{cls.location || 'Centauro'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">Prof: {cls.coach_name || 'Comissão Técnica'}</span>
                    </div>
                  </div>

                  {/* Capacity & Occupancy Bar */}
                  <div className="pt-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
                      <span>Ocupação da Turma</span>
                      <span className="font-bold text-slate-900">
                        {classAthletesCount} / {capacityMax} alunos ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percent >= 100
                            ? 'bg-rose-500'
                            : percent >= 80
                            ? 'bg-amber-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {capacityMax - classAthletesCount > 0
                      ? `${capacityMax - classAthletesCount} vagas disponíveis`
                      : 'Turma lotada'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => handleOpenEditClass(cls)}
                      leftIcon={<Edit2 size={13} />}
                    >
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      className="text-xs"
                      rightIcon={<ArrowRight size={13} />}
                      onClick={() => setSelectedClassForRoster(cls)}
                    >
                      Ver Alunos ({classAthletesCount})
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================ */}
      {/* MODAL 1: ALUNOS DA TURMA (ROSTER & CANCELAMENTO) */}
      {/* ================================================================ */}
      {selectedClassForRoster && (() => {
        const enrolledAthletes = (athletes || [])
          .filter(
            (a) =>
              (a.current_class_id === selectedClassForRoster.id ||
                a.class_id === selectedClassForRoster.id) &&
              a.status === 'ATIVO'
          )
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));

        return (
          <Modal
            isOpen={true}
            onClose={() => setSelectedClassForRoster(null)}
            title={`Alunos Matriculados: ${selectedClassForRoster.name}`}
            description={`${selectedClassForRoster.category} • ${selectedClassForRoster.schedule_time || ''} • ${(selectedClassForRoster.schedule_days || []).join(' e ')}`}
            size="lg"
          >
            <div className="space-y-4">
              {/* Header Info Banner */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">
                      {enrolledAthletes.length} atleta(s) ativo(s) nesta turma
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Capacidade recomendada: {selectedClassForRoster.capacity_recommended || 30} vagas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Edit2 size={13} />}
                    onClick={() => {
                      const c = selectedClassForRoster;
                      setSelectedClassForRoster(null);
                      handleOpenEditClass(c);
                    }}
                  >
                    Editar Turma
                  </Button>
                </div>
              </div>

              {/* Roster Athletes Table */}
              {enrolledAthletes.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center space-y-2">
                  <Users className="mx-auto text-slate-400" size={32} />
                  <p className="text-xs font-bold text-slate-700">Nenhum aluno matriculado nesta turma</p>
                  <p className="text-[11px] text-slate-400">
                    Você pode matricular atletas nesta turma através do módulo de Atletas ou Interessados.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Atleta</th>
                        <th className="py-2.5 px-3">Nascimento</th>
                        <th className="py-2.5 px-3">Responsável</th>
                        <th className="py-2.5 px-3">Condição</th>
                        <th className="py-2.5 px-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {enrolledAthletes.map((athlete) => {
                        const cleanPhone = (athlete.responsible_phone || athlete.phone || '').replace(/\D/g, '');

                        return (
                          <tr key={athlete.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <AthleteAvatar athlete={athlete} size="sm" />
                                <div>
                                  <p className="font-bold text-slate-900">{athlete.name}</p>
                                  <p className="text-[10px] text-slate-400">
                                    Matrícula: {formatDateBR(athlete.enrollment_date)}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {formatDateBR(athlete.birth_date)}
                            </td>
                            <td className="py-2.5 px-3">
                              <p className="font-medium text-slate-800">
                                {athlete.responsible_name || 'Não inf.'}
                              </p>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/55${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[11px] text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1 mt-0.5"
                                >
                                  <MessageCircle size={11} />
                                  {formatPhone(athlete.responsible_phone || athlete.phone || '')}
                                </a>
                              )}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge
                                variant={
                                  athlete.financial_condition === 'BOLSA_INTEGRAL'
                                    ? 'warning'
                                    : 'primary'
                                }
                                size="sm"
                              >
                                {athlete.financial_condition === 'BOLSA_INTEGRAL'
                                  ? 'Bolsista'
                                  : 'Pagante'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedClassForRoster(null);
                                    handleViewAthleteDetail(athlete.id);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                  title="Ver Ficha Completa do Aluno"
                                >
                                  <Eye size={14} />
                                </button>
                                <Button
                                  size="xs"
                                  variant="outline"
                                  leftIcon={<UserMinus size={12} />}
                                  onClick={() =>
                                    setAthleteToCancel({
                                      athlete,
                                      className: selectedClassForRoster.name,
                                    })
                                  }
                                  className="text-rose-600 border-rose-200 hover:bg-rose-50 text-[11px]"
                                  title="Cancelar matrícula e desvincular da turma"
                                >
                                  Cancelar Matrícula
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedClassForRoster(null)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ================================================================ */}
      {/* MODAL 2: CANCELAR MATRÍCULA DO ALUNO NA TURMA (SEM SAIR DO BANCO) */}
      {/* ================================================================ */}
      {athleteToCancel && (
        <Modal
          isOpen={true}
          onClose={() => !isCanceling && setAthleteToCancel(null)}
          title="Cancelar Matrícula do Aluno na Turma"
          description="O aluno será desvinculado da turma, mantendo todos os dados no banco de dados."
          size="md"
        >
          <div className="space-y-4">
            {/* Safety Alert: NOT deleted from DB */}
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900 text-xs">
              <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <p className="font-bold text-amber-950">
                  Desvinculação e Preservação de Dados
                </p>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  O aluno <strong>{athleteToCancel.athlete.name}</strong> terá sua matrícula cancelada na turma{' '}
                  <strong>{athleteToCancel.className}</strong> e seu status alterado para{' '}
                  <strong className="text-amber-950">DESLIGADO</strong>.
                </p>
                <p className="text-amber-900 text-[11px] font-semibold bg-white/70 p-2 rounded-lg border border-amber-200">
                  ✓ O cadastro do aluno <strong>NÃO será excluído do banco de dados</strong>. Todo histórico esportivo, frequências, histórico de pagamentos e documentos permanecerão preservados.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Select
                id="cancel_reason_select"
                label="Motivo do Cancelamento / Desvinculação *"
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                options={[
                  { value: 'Incompatibilidade de Horário / Rotina', label: 'Incompatibilidade de Horário / Rotina' },
                  { value: 'Mudança de Endereço / Cidade', label: 'Mudança de Endereço / Cidade' },
                  { value: 'Motivos Financeiros / Orçamento Familiar', label: 'Motivos Financeiros / Orçamento Familiar' },
                  { value: 'Problemas de Saúde / Lesão / Afastamento Médico', label: 'Problemas de Saúde / Lesão / Afastamento Médico' },
                  { value: 'Decisão Familiar / Transferência para Outro Esporte', label: 'Decisão Familiar / Transferência para Outro Esporte' },
                  { value: 'Desistência sem Motivo Informado', label: 'Desistência sem Motivo Informado' },
                  { value: 'Outro Motivo', label: 'Outro Motivo' },
                ]}
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Adicionais (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="Ex: Família solicitou trancamento até o próximo semestre."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAthleteToCancel(null)}
                disabled={isCanceling}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                leftIcon={<UserMinus size={14} />}
                onClick={handleConfirmCancelEnrollment}
                isLoading={isCanceling}
              >
                Confirmar Cancelamento da Matrícula
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ================================================================ */}
      {/* MODAL 3: CADASTRAR NOVA TURMA */}
      {/* ================================================================ */}
      <Modal
        isOpen={isNewClassModalOpen}
        onClose={() => setIsNewClassModalOpen(false)}
        title="Cadastrar Nova Turma"
        description="Defina os horários, categoria e capacidade dos treinos."
        size="md"
      >
        <form onSubmit={handleCreateClass} className="space-y-4">
          <Input
            id="class_name"
            label="Nome da Turma *"
            placeholder="Ex: Sub-11 A - Manhã"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="class_category"
              label="Categoria *"
              placeholder="Ex: Sub-11, Kids, Iniciação..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              required
            />

            <Input
              id="class_capacity"
              label="Capacidade Recomendada *"
              type="number"
              placeholder="Ex: 30"
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="class_days"
              label="Dias de Treino *"
              placeholder="Ex: Terça e Quinta"
              value={newScheduleDays}
              onChange={(e) => setNewScheduleDays(e.target.value)}
            />

            <Input
              id="class_time"
              label="Horário *"
              placeholder="Ex: 08:30 às 10:00"
              value={newScheduleTime}
              onChange={(e) => setNewScheduleTime(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="class_coach"
              label="Professor / Treinador"
              placeholder="Ex: Prof. Carlos Silva"
              value={newCoachName}
              onChange={(e) => setNewCoachName(e.target.value)}
            />

            <Input
              id="class_loc"
              label="Local do Treino"
              placeholder="Ex: Campo 1 - Centauro"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewClassModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={!newName.trim()}>
              Criar Turma
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================================================================ */}
      {/* MODAL 4: EDITAR TURMA */}
      {/* ================================================================ */}
      {classToEdit && (
        <Modal
          isOpen={true}
          onClose={() => setClassToEdit(null)}
          title={`Editar Turma: ${classToEdit.name}`}
          description="Altere dados de horários, categoria, local e capacidade."
          size="md"
        >
          <form onSubmit={handleSaveEditClass} className="space-y-4">
            <Input
              id="edit_class_name"
              label="Nome da Turma *"
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="edit_class_category"
                label="Categoria *"
                placeholder="Ex: Sub-11, Kids, Iniciação..."
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                required
              />

              <Input
                id="edit_class_capacity"
                label="Capacidade Recomendada *"
                type="number"
                value={editCapacity}
                onChange={(e) => setEditCapacity(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="edit_class_days"
                label="Dias de Treino *"
                placeholder="Ex: Terça e Quinta"
                value={editScheduleDays}
                onChange={(e) => setEditScheduleDays(e.target.value)}
              />

              <Input
                id="edit_class_time"
                label="Horário *"
                placeholder="Ex: 08:30 às 10:00"
                value={editScheduleTime}
                onChange={(e) => setEditScheduleTime(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="edit_class_coach"
                label="Professor / Treinador"
                placeholder="Ex: Prof. Carlos Silva"
                value={editCoachName}
                onChange={(e) => setEditCoachName(e.target.value)}
              />

              <Input
                id="edit_class_loc"
                label="Local do Treino"
                placeholder="Ex: Campo 1 - Centauro"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status da Turma
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditActive(!editActive)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    editActive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}
                >
                  <Power size={13} />
                  {editActive ? 'Turma Ativa (Aceita matrículas)' : 'Turma Inativa (Desativada)'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setClassToEdit(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================================================================ */}
      {/* MODAL 5: EXCLUIR TURMA */}
      {/* ================================================================ */}
      {classToDelete && (() => {
        const classAthletes = (athletes || []).filter(
          (a) =>
            (a.current_class_id === classToDelete.id || a.class_id === classToDelete.id) &&
            a.status === 'ATIVO'
        );

        return (
          <Modal
            isOpen={true}
            onClose={() => setClassToDelete(null)}
            title={`Excluir Turma: ${classToDelete.name}`}
            size="sm"
          >
            <div className="space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900 text-xs">
                <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="font-bold">Deseja realmente excluir esta turma?</p>
                  <p className="text-rose-700 mt-1 leading-relaxed">
                    Esta ação removerá a turma <strong>{classToDelete.name}</strong> da listagem e dos calendários de treinos.
                  </p>
                </div>
              </div>

              {classAthletes.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-amber-950">
                    <Users size={14} className="text-amber-600" />
                    <span>Atenção: {classAthletes.length} atleta(s) matriculado(s)</span>
                  </p>
                  <p className="text-amber-800 text-[11px] leading-relaxed">
                    Ao confirmar a exclusão, todos os {classAthletes.length} atletas serão desvinculados desta turma, mas{' '}
                    <strong>permanecerão salvos no banco de dados</strong> com status sem turma para que você possa remanejá-los.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setClassToDelete(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 size={14} />}
                  onClick={handleConfirmDeleteClass}
                >
                  Confirmar Exclusão
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
