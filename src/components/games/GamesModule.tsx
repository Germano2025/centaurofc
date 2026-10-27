import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { GameMatch, MatchParticipant, MatchGoal } from '../../types';
import {
  Trophy,
  Plus,
  Calendar,
  MapPin,
  Clock,
  Edit3,
  CheckCircle2,
  Shield,
  Trash2,
  Users,
  Search,
  Filter,
  X,
  RotateCcw,
  Target,
  UserPlus,
  Minus,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Input, Select } from '../common/Input';
import { formatDateBR } from '../../utils/formatters';

interface RosterItemState {
  athleteId: string;
  athleteName: string;
  className?: string;
  participated: boolean;
  goals: number;
}

export const GamesModule: React.FC = () => {
  const {
    matches = [],
    classes = [],
    athletes = [],
    matchParticipants = [],
    matchGoals = [],
    addMatch,
    deleteMatch,
    setMatchScore,
    syncMatchRosterAndGoals,
    showToast,
  } = useApp();

  // ==================== FILTERS STATE ====================
  const [competitionFilter, setCompetitionFilter] = useState('');
  const [athleteFilter, setAthleteFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AGENDADO' | 'REALIZADO' | 'CANCELADO'>('ALL');

  // ==================== MODALS STATE ====================
  const [isNewMatchOpen, setIsNewMatchOpen] = useState(false);
  const [matchToScore, setMatchToScore] = useState<GameMatch | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<GameMatch | null>(null);
  const [matchForRoster, setMatchForRoster] = useState<GameMatch | null>(null);

  // New Match Form State
  const [opponent, setOpponent] = useState('');
  const [classId, setClassId] = useState(() => classes[0]?.id || '');
  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [matchTime, setMatchTime] = useState('09:00');
  const [location, setLocation] = useState('Campo Principal Centauro');
  const [competitionName, setCompetitionName] = useState('Amistoso Preparatório');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Roster selected when creating new match
  const [newMatchRoster, setNewMatchRoster] = useState<Record<string, { selected: boolean; goals: number }>>({});
  const [guestAthleteId, setGuestAthleteId] = useState('');

  // Score Modal Form State
  const [scorePs, setScorePs] = useState('');
  const [scoreOpponent, setScoreOpponent] = useState('');

  // Roster Modal Form State (Editing match lineup and goals)
  const [rosterDraft, setRosterDraft] = useState<RosterItemState[]>([]);
  const [addRosterAthleteId, setAddRosterAthleteId] = useState('');

  // Get unique competitions from existing matches
  const availableCompetitions = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      if (m.competition_name && m.competition_name.trim()) {
        set.add(m.competition_name.trim());
      }
    });
    return Array.from(set).sort();
  }, [matches]);

  // Get unique categories strictly from registered classes (sempre igual às turmas cadastradas)
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    (classes || []).forEach((c) => {
      if (c.category && c.category.trim()) {
        set.add(c.category.trim());
      }
    });
    return Array.from(set).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b, 'pt-BR');
    });
  }, [classes]);

  // Get available years from match dates and current year
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    const currentYear = String(new Date().getFullYear());
    set.add(currentYear);
    (matches || []).forEach((m) => {
      if (m.match_date && m.match_date.length >= 4) {
        const yr = m.match_date.substring(0, 4);
        if (/^\d{4}$/.test(yr)) {
          set.add(yr);
        }
      }
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [matches]);

  // Athletes belonging to selected class in New Match modal
  const classAthletes = useMemo(() => {
    if (!classId) return [];
    return (athletes || []).filter((a) => a.class_id === classId && a.status === 'ATIVO');
  }, [athletes, classId]);

  // Helper when class changes in New Match modal: select all active athletes by default
  const handleClassChangeInNewMatch = (newClassId: string) => {
    setClassId(newClassId);
    const targetAthletes = (athletes || []).filter((a) => a.class_id === newClassId && a.status === 'ATIVO');
    const newRoster: Record<string, { selected: boolean; goals: number }> = {};
    targetAthletes.forEach((a) => {
      newRoster[a.id] = { selected: true, goals: 0 };
    });
    setNewMatchRoster(newRoster);
  };

  // Open New Match Modal: reset state
  const handleOpenNewMatch = () => {
    const initialClassId = classes[0]?.id || '';
    setClassId(initialClassId);
    setOpponent('');
    setMatchDate(new Date().toISOString().split('T')[0]);
    setMatchTime('09:00');
    setLocation('Campo Principal Centauro');
    setCompetitionName('Amistoso Preparatório');
    setNotes('');

    const targetAthletes = (athletes || []).filter((a) => a.class_id === initialClassId && a.status === 'ATIVO');
    const newRoster: Record<string, { selected: boolean; goals: number }> = {};
    targetAthletes.forEach((a) => {
      newRoster[a.id] = { selected: true, goals: 0 };
    });
    setNewMatchRoster(newRoster);
    setGuestAthleteId('');
    setIsNewMatchOpen(true);
  };

  // Toggle selection in New Match roster
  const toggleNewMatchAthlete = (athId: string) => {
    setNewMatchRoster((prev) => {
      const current = prev[athId] || { selected: false, goals: 0 };
      return {
        ...prev,
        [athId]: { ...current, selected: !current.selected },
      };
    });
  };

  // Adjust goals in New Match roster
  const adjustNewMatchAthleteGoals = (athId: string, delta: number) => {
    setNewMatchRoster((prev) => {
      const current = prev[athId] || { selected: true, goals: 0 };
      const newGoals = Math.max(0, current.goals + delta);
      return {
        ...prev,
        [athId]: { selected: true, goals: newGoals },
      };
    });
  };

  // Select / Deselect all in New Match
  const selectAllNewMatchAthletes = (selectAll: boolean) => {
    setNewMatchRoster((prev) => {
      const updated: Record<string, { selected: boolean; goals: number }> = {};
      classAthletes.forEach((a) => {
        const cur = prev[a.id] || { selected: false, goals: 0 };
        updated[a.id] = { ...cur, selected: selectAll };
      });
      return { ...prev, ...updated };
    });
  };

  // Add guest athlete in New Match
  const handleAddGuestInNewMatch = () => {
    if (!guestAthleteId) return;
    setNewMatchRoster((prev) => ({
      ...prev,
      [guestAthleteId]: { selected: true, goals: 0 },
    }));
    setGuestAthleteId('');
  };

  // Save New Match
  const handleCreateMatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opponent.trim() || !matchDate) {
      showToast('Preencha o adversário e a data da partida.', 'error');
      return;
    }

    const selectedClass = classes.find((c) => c.id === classId);
    setIsSubmitting(true);
    try {
      // Calculate total goals and prepare roster array
      const rosterEntries: Array<{ athleteId: string; participated: boolean; goals: number }> = [];
      let totalAthleteGoals = 0;

      Object.keys(newMatchRoster).forEach((athId) => {
        const item = newMatchRoster[athId];
        if (item && item.selected) {
          totalAthleteGoals += item.goals;
          rosterEntries.push({
            athleteId: athId,
            participated: true,
            goals: item.goals,
          });
        }
      });

      const { match } = addMatch({
        opponent: opponent.trim(),
        class_id: classId || (classes[0]?.id || 'c-1'),
        class_name: selectedClass?.name || 'Turma Oficial',
        category: selectedClass?.category || 'Sub-11',
        match_date: matchDate,
        match_time: matchTime.trim() || undefined,
        location: location.trim() || 'Centauro',
        competition_name: competitionName.trim() || undefined,
        status: totalAthleteGoals > 0 ? 'REALIZADO' : 'AGENDADO',
        score_ps: totalAthleteGoals > 0 ? totalAthleteGoals : null,
        score_opponent: null,
        notes: notes.trim() || undefined,
      });

      if (rosterEntries.length > 0) {
        syncMatchRosterAndGoals(match.id, rosterEntries);
      }

      setIsNewMatchOpen(false);
      showToast(
        `Partida contra ${opponent.trim()} agendada com ${rosterEntries.length} atletas relacionados!`,
        'success'
      );
    } catch (err) {
      console.error('Error creating match:', err);
      showToast('Erro ao criar partida.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Score Modal Handlers
  const handleOpenScoreModal = (m: GameMatch) => {
    setMatchToScore(m);
    setScorePs(m.score_ps !== null && m.score_ps !== undefined ? String(m.score_ps) : '');
    setScoreOpponent(m.score_opponent !== null && m.score_opponent !== undefined ? String(m.score_opponent) : '');
  };

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchToScore) return;

    const psVal = scorePs.trim() === '' ? null : parseInt(scorePs, 10);
    const oppVal = scoreOpponent.trim() === '' ? null : parseInt(scoreOpponent, 10);

    setMatchScore(matchToScore.id, psVal, oppVal);
    setMatchToScore(null);
  };

  // Delete Match Handlers
  const handleConfirmDeleteMatch = () => {
    if (!matchToDelete) return;
    deleteMatch(matchToDelete.id);
    setMatchToDelete(null);
  };

  // Open Roster & Goals Modal for an existing match
  const handleOpenRosterModal = (m: GameMatch) => {
    setMatchForRoster(m);

    // Get current participants and goals for this match
    const currentParticipants = matchParticipants.filter((p) => p.match_id === m.id);
    const currentGoals = matchGoals.filter((g) => g.match_id === m.id);

    // Build draft list
    const draft: RosterItemState[] = currentParticipants.map((p) => {
      const athlete = athletes.find((a) => a.id === p.athlete_id);
      const athClass = classes.find((c) => c.id === athlete?.class_id);
      const goal = currentGoals.find((g) => g.athlete_id === p.athlete_id);
      return {
        athleteId: p.athlete_id,
        athleteName: athlete?.name || p.athlete_name || 'Atleta',
        className: athClass?.name || p.athlete_main_class_name,
        participated: p.participated,
        goals: goal ? goal.goals_count : 0,
      };
    });

    // If no participants yet, suggest athletes from the match's class
    if (draft.length === 0 && m.class_id) {
      const classMembers = athletes.filter((a) => a.class_id === m.class_id && a.status === 'ATIVO');
      classMembers.forEach((a) => {
        draft.push({
          athleteId: a.id,
          athleteName: a.name,
          className: classes.find((c) => c.id === a.class_id)?.name,
          participated: true,
          goals: 0,
        });
      });
    }

    setRosterDraft(draft);
    setAddRosterAthleteId('');
  };

  // Save Roster & Goals Modal
  const handleSaveRoster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchForRoster) return;

    const payload = rosterDraft.map((r) => ({
      athleteId: r.athleteId,
      participated: r.participated,
      goals: r.goals,
    }));

    syncMatchRosterAndGoals(matchForRoster.id, payload);

    // Sum athlete goals to suggest updating match score
    const totalGoalsScored = payload.reduce((sum, item) => sum + item.goals, 0);
    if (totalGoalsScored > 0 && (matchForRoster.score_ps === null || matchForRoster.score_ps === undefined)) {
      setMatchScore(matchForRoster.id, totalGoalsScored, matchForRoster.score_opponent ?? 0);
    }

    showToast('Escalação e registro de gols atualizados com sucesso!', 'success');
    setMatchForRoster(null);
  };

  // Add athlete into draft
  const handleAddAthleteToDraft = () => {
    if (!addRosterAthleteId) return;
    if (rosterDraft.some((r) => r.athleteId === addRosterAthleteId)) {
      showToast('Este atleta já está na lista da partida.', 'info');
      return;
    }
    const ath = athletes.find((a) => a.id === addRosterAthleteId);
    if (!ath) return;
    const athClass = classes.find((c) => c.id === ath.class_id);

    setRosterDraft((prev) => [
      ...prev,
      {
        athleteId: ath.id,
        athleteName: ath.name,
        className: athClass?.name,
        participated: true,
        goals: 0,
      },
    ]);
    setAddRosterAthleteId('');
  };

  const removeAthleteFromDraft = (athId: string) => {
    setRosterDraft((prev) => prev.filter((r) => r.athleteId !== athId));
  };

  const toggleDraftParticipation = (athId: string) => {
    setRosterDraft((prev) =>
      prev.map((r) => (r.athleteId === athId ? { ...r, participated: !r.participated } : r))
    );
  };

  const adjustDraftGoals = (athId: string, delta: number) => {
    setRosterDraft((prev) =>
      prev.map((r) => {
        if (r.athleteId === athId) {
          const newG = Math.max(0, r.goals + delta);
          return { ...r, goals: newG, participated: true };
        }
        return r;
      })
    );
  };

  // ==================== FILTERING LOGIC ====================
  const hasActiveFilters = Boolean(
    competitionFilter.trim() ||
      athleteFilter !== 'ALL' ||
      categoryFilter !== 'ALL' ||
      yearFilter !== 'ALL' ||
      statusFilter !== 'ALL'
  );

  const handleClearFilters = () => {
    setCompetitionFilter('');
    setAthleteFilter('ALL');
    setCategoryFilter('ALL');
    setYearFilter('ALL');
    setStatusFilter('ALL');
  };

  const filteredMatches = useMemo(() => {
    return (matches || []).filter((m) => {
      // 1. Competition Filter
      if (competitionFilter.trim()) {
        const qNorm = competitionFilter.toLowerCase().trim();
        const compNorm = (m.competition_name || '').toLowerCase();
        if (!compNorm.includes(qNorm)) return false;
      }

      // 2. Athlete Filter (match must have this athlete in participants)
      if (athleteFilter !== 'ALL') {
        const isParticipant = matchParticipants.some(
          (p) => p.match_id === m.id && p.athlete_id === athleteFilter
        );
        if (!isParticipant) return false;
      }

      // 3. Category / Class Filter (sempre sincronizado com as turmas cadastradas)
      if (categoryFilter !== 'ALL') {
        const isCatPrefix = categoryFilter.startsWith('cat:');
        const targetVal = isCatPrefix ? categoryFilter.replace('cat:', '') : categoryFilter;

        const matchClass = (classes || []).find((c) => c.id === m.class_id);
        const matchCategory = (m.category || (m as any).category || matchClass?.category || '').trim().toLowerCase();
        const matchClassName = (m.class_name || matchClass?.name || '').trim().toLowerCase();
        const matchClassId = m.class_id || matchClass?.id || '';

        if (isCatPrefix) {
          // Filtered by general category (e.g. "Sub-11", "Sub-13")
          const targetNorm = targetVal.trim().toLowerCase();
          const matchesCat =
            matchCategory === targetNorm ||
            matchCategory.includes(targetNorm) ||
            matchClassName.includes(targetNorm);
          if (!matchesCat) return false;
        } else {
          // Filtered by specific class ID from registered classes
          const targetClass = (classes || []).find((c) => c.id === targetVal);
          if (targetClass) {
            if (matchClassId) {
              const directIdMatch = matchClassId === targetClass.id;
              const directNameMatch = matchClassName === targetClass.name.toLowerCase();
              if (!directIdMatch && !directNameMatch) return false;
            } else {
              const matchesName = matchClassName.includes(targetClass.name.toLowerCase());
              const matchesCat = matchCategory === targetClass.category.toLowerCase();
              if (!matchesName && !matchesCat) return false;
            }
          } else {
            const targetLower = targetVal.trim().toLowerCase();
            const matchesAny =
              matchClassId === targetVal ||
              matchCategory === targetLower ||
              matchClassName.includes(targetLower);
            if (!matchesAny) return false;
          }
        }
      }

      // 4. Year Filter (filtro por ano da partida)
      if (yearFilter !== 'ALL') {
        const matchYear = m.match_date ? m.match_date.substring(0, 4) : '';
        if (matchYear !== yearFilter) return false;
      }

      // 5. Status Filter
      if (statusFilter !== 'ALL') {
        if (m.status !== statusFilter) return false;
      }

      return true;
    });
  }, [matches, competitionFilter, athleteFilter, categoryFilter, yearFilter, statusFilter, matchParticipants, classes]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="text-amber-500" size={26} />
            Jogos & Competições
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Agendamento de partidas, convocação de atletas, registro de gols e histórico de torneios do Centauro.
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          leftIcon={<Plus size={16} />}
          onClick={handleOpenNewMatch}
        >
          Agendar Partida
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Filter size={15} className="text-blue-600" />
            <span>Filtros de Partidas</span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw size={13} />
              <span>Limpar Filtros</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Competição */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Competição / Torneio</label>
            <div className="relative">
              <input
                type="text"
                value={competitionFilter}
                onChange={(e) => setCompetitionFilter(e.target.value)}
                placeholder="Ex: Copa Recife, Amistoso..."
                className="w-full text-xs py-2 pl-3 pr-8 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              {competitionFilter && (
                <button
                  type="button"
                  onClick={() => setCompetitionFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* 2. Atleta */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Nome do Atleta</label>
            <select
              value={athleteFilter}
              onChange={(e) => setAthleteFilter(e.target.value)}
              className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold"
            >
              <option value="ALL">Todos os Atletas</option>
              {(athletes || [])
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.category || 'Atleta'})
                  </option>
                ))}
            </select>
          </div>

          {/* 3. Turma / Categoria (Sincronizado com as turmas cadastradas) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Turma / Categoria</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold"
            >
              <option value="ALL">Todas as Turmas / Categorias</option>
              <optgroup label="Turmas Cadastradas">
                {(classes || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category})
                  </option>
                ))}
              </optgroup>
              {availableCategories.length > 0 && (
                <optgroup label="Por Categoria Geral">
                  {availableCategories.map((cat) => (
                    <option key={`cat:${cat}`} value={`cat:${cat}`}>
                      Categoria {cat} (Todas as turmas)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* 4. Ano da Partida */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Ano da Partida</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold"
            >
              <option value="ALL">Todos os Anos</option>
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Status da Partida</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full text-xs py-2 px-3 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white cursor-pointer font-semibold"
            >
              <option value="ALL">Todos os Status</option>
              <option value="AGENDADO">Agendados</option>
              <option value="REALIZADO">Realizados</option>
              <option value="CANCELADO">Cancelados</option>
            </select>
          </div>
        </div>

        {/* Counter Info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
          <span>
            Exibindo <strong>{filteredMatches.length}</strong> de <strong>{matches.length}</strong> partida(s)
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {categoryFilter !== 'ALL' && (
              <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Turma/Categoria:{' '}
                {categoryFilter.startsWith('cat:')
                  ? categoryFilter.replace('cat:', '')
                  : classes.find((c) => c.id === categoryFilter)?.name || categoryFilter}
              </span>
            )}
            {athleteFilter !== 'ALL' && (
              <span className="text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Filtrado por atleta: {athletes.find((a) => a.id === athleteFilter)?.name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Matches Grid */}
      {filteredMatches.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <Trophy size={42} className="mx-auto text-slate-300" />
          <p className="font-bold text-slate-700">Nenhuma partida encontrada.</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Nenhuma partida corresponde aos filtros aplicados. Tente ajustar os parâmetros ou limpar os filtros.'
              : 'Cadastre amistosos e partidas oficiais contra outras equipes para gerenciar resultados e convocações.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            {hasActiveFilters ? (
              <Button size="sm" variant="outline" onClick={handleClearFilters} leftIcon={<RotateCcw size={14} />}>
                Limpar Filtros
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                leftIcon={<Plus size={15} />}
                onClick={handleOpenNewMatch}
              >
                Agendar Primeira Partida
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMatches.map((m) => {
            const isCompleted = m.status === 'REALIZADO' || m.status === 'FINALIZADO';
            const isCancelled = m.status === 'CANCELADO';

            // Participants and goals for this match
            const matchRoster = matchParticipants.filter((p) => p.match_id === m.id);
            const matchGoalsList = matchGoals.filter((g) => g.match_id === m.id && g.goals_count > 0);
            const totalGoalsInMatch = matchGoalsList.reduce((sum, g) => sum + g.goals_count, 0);

            return (
              <div
                key={m.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 hover:border-blue-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Card Header: Category, Competition & Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <Badge variant="primary" size="sm">
                        {m.class_name || classes.find((c) => c.id === m.class_id)?.name || 'Geral'}
                      </Badge>
                      {(m.category || classes.find((c) => c.id === m.class_id)?.category) && (
                        <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          {m.category || classes.find((c) => c.id === m.class_id)?.category}
                        </span>
                      )}
                      {m.competition_name && (
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                          {m.competition_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={isCompleted ? 'success' : isCancelled ? 'danger' : 'warning'}
                        size="sm"
                      >
                        {m.status}
                      </Badge>
                      {/* Delete Match Button */}
                      <button
                        type="button"
                        onClick={() => setMatchToDelete(m)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir partida"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Scoreboard Card */}
                  <div className="flex items-center justify-around py-3.5 bg-slate-50 rounded-2xl text-center border border-slate-100">
                    <div className="w-5/12">
                      <span className="text-xs font-black text-slate-900 block truncate">
                        CENTAURO
                      </span>
                      <span className="text-3xl font-black text-blue-700">
                        {m.score_ps !== null && m.score_ps !== undefined ? m.score_ps : '-'}
                      </span>
                    </div>
                    <div className="text-xs font-black text-slate-300">X</div>
                    <div className="w-5/12">
                      <span className="text-xs font-black text-slate-900 block truncate">
                        {m.opponent}
                      </span>
                      <span className="text-3xl font-black text-slate-800">
                        {m.score_opponent !== null && m.score_opponent !== undefined
                          ? m.score_opponent
                          : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Match Schedule & Location */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar size={13} className="text-slate-400" />
                      {formatDateBR(m.match_date)} {m.match_time ? `às ${m.match_time}` : ''}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium truncate max-w-[180px]">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{m.location || 'Centauro'}</span>
                    </span>
                  </div>

                  {/* Lineup & Goals Section preview */}
                  <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span className="flex items-center gap-1.5 text-blue-900">
                        <Users size={14} className="text-blue-600" />
                        <span>
                          <strong>{matchRoster.length}</strong> atletas relacionados
                        </span>
                      </span>
                      {totalGoalsInMatch > 0 && (
                        <span className="text-amber-900 font-bold bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span>⚽</span>
                          <span>{totalGoalsInMatch} {totalGoalsInMatch === 1 ? 'gol PS' : 'gols PS'}</span>
                        </span>
                      )}
                    </div>

                    {matchGoalsList.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                        <span className="font-bold text-slate-700">Gols:</span>
                        {matchGoalsList.map((g) => (
                          <span
                            key={g.id}
                            className="bg-white border border-amber-200 text-amber-950 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 shadow-2xs"
                          >
                            <span>⚽ {g.athlete_name}</span>
                            {g.goals_count > 1 && (
                              <span className="bg-amber-200 text-amber-900 px-1 rounded-sm text-[10px] font-black">
                                {g.goals_count}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : matchRoster.length > 0 ? (
                      <p className="text-[11px] text-slate-500 truncate">
                        Convocados: {matchRoster.map((r) => r.athlete_name).slice(0, 5).join(', ')}
                        {matchRoster.length > 5 && ` +${matchRoster.length - 5} outros`}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        Nenhum atleta vinculado ainda. Clique em "Atletas & Gols" para escalar.
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-4">
                  <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                    {m.notes ? `Obs: ${m.notes}` : 'Centauro'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Atletas & Gols button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-700 border-blue-200 hover:bg-blue-50 text-xs py-1 px-2.5 font-bold"
                      leftIcon={<Users size={13} />}
                      onClick={() => handleOpenRosterModal(m)}
                    >
                      Atletas & Gols
                    </Button>

                    {/* Placar button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs py-1 px-2.5"
                      leftIcon={<Edit3 size={13} />}
                      onClick={() => handleOpenScoreModal(m)}
                    >
                      {isCompleted ? 'Placar' : 'Informar Placar'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================================================================ */}
      {/* 1. MODAL: AGENDAR NOVA PARTIDA COM VÍNCULO DE ATLETAS & GOLS */}
      {/* ================================================================ */}
      <Modal
        isOpen={isNewMatchOpen}
        onClose={() => setIsNewMatchOpen(false)}
        title="Agendar Nova Partida"
        description="Defina os detalhes do jogo, adversário, categoria e vincule os atletas convocados."
        size="lg"
      >
        <form onSubmit={handleCreateMatch} className="space-y-4">
          <Input
            label="Equipe Adversária *"
            placeholder="Ex: Escolinha Craques da Bola"
            required
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Turma / Categoria *</label>
              <select
                value={classId}
                onChange={(e) => handleClassChangeInNewMatch(e.target.value)}
                className="w-full text-xs font-semibold border border-slate-300 rounded-xl px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                required
              >
                {(classes || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category})
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Competição / Torneio"
              placeholder="Ex: Amistoso Preparatório / Copa Recife"
              value={competitionName}
              onChange={(e) => setCompetitionName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="date"
              label="Data da Partida *"
              required
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
            />
            <Input
              type="time"
              label="Horário do Jogo *"
              required
              value={matchTime}
              onChange={(e) => setMatchTime(e.target.value)}
            />
          </div>

          <Input
            label="Local da Partida"
            placeholder="Ex: Campo Principal Centauro"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          {/* VÍNCULO DE ATLETAS SELECIONADOS & GOLS */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Users size={14} className="text-blue-600" />
                  <span>Vincular Atletas Selecionados (Convocação & Gols)</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Marque os atletas que foram selecionados para o jogo e registre eventuais gols marcados.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectAllNewMatchAthletes(true)}
                  className="text-[11px] text-blue-700 hover:underline font-bold cursor-pointer"
                >
                  Selecionar Todos
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => selectAllNewMatchAthletes(false)}
                  className="text-[11px] text-slate-500 hover:underline font-medium cursor-pointer"
                >
                  Desmarcar Todos
                </button>
              </div>
            </div>

            {/* List of class athletes */}
            {classAthletes.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Nenhum atleta ativo encontrado nesta turma. Você pode convidar atletas de outras turmas abaixo.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200">
                {classAthletes.map((a) => {
                  const state = newMatchRoster[a.id] || { selected: false, goals: 0 };
                  return (
                    <div
                      key={a.id}
                      className={`p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors ${
                        state.selected ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={state.selected}
                          onChange={() => toggleNewMatchAthlete(a.id)}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800 truncate">{a.name}</span>
                      </label>

                      {/* Goals Counter for selected athlete */}
                      {state.selected && (
                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                          <span className="text-[11px] font-bold text-slate-600 mr-1 flex items-center gap-0.5">
                            <span>⚽ Gols:</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustNewMatchAthleteGoals(a.id, -1)}
                            className="w-5 h-5 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300 cursor-pointer"
                            title="Diminuir gol"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-5 text-center text-xs font-black text-amber-700">
                            {state.goals}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustNewMatchAthleteGoals(a.id, 1)}
                            className="w-5 h-5 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300 cursor-pointer"
                            title="Adicionar gol"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add guest athlete from another class */}
            <div className="flex items-center gap-2 pt-1">
              <select
                value={guestAthleteId}
                onChange={(e) => setGuestAthleteId(e.target.value)}
                className="flex-1 text-xs border border-slate-300 rounded-xl px-2.5 py-1.5 bg-white outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="">-- Convidar atleta de outra turma --</option>
                {athletes
                  .filter((a) => a.class_id !== classId && a.status === 'ATIVO' && !newMatchRoster[a.id]?.selected)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.category || 'Atleta'})
                    </option>
                  ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!guestAthleteId}
                onClick={handleAddGuestInNewMatch}
                leftIcon={<UserPlus size={13} />}
              >
                Adicionar
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações / Instruções da Partida
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Chegar com 40 min de antecedência com uniforme 1 (Azul)"
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewMatchOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Agendar Partida
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================================================================ */}
      {/* 2. MODAL: ESCALAÇÃO & REGISTRO DE GOLS DA PARTIDA */}
      {/* ================================================================ */}
      {matchForRoster && (
        <Modal
          isOpen={true}
          onClose={() => setMatchForRoster(null)}
          title="Atletas Relacionados & Registro de Gols"
          description={`CENTAURO vs ${matchForRoster.opponent} • ${formatDateBR(matchForRoster.match_date)}`}
          size="lg"
        >
          <form onSubmit={handleSaveRoster} className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">
                Adversário: <strong>{matchForRoster.opponent}</strong> ({matchForRoster.class_name})
              </span>
              <span className="text-blue-700 font-bold bg-blue-100/80 px-2 py-0.5 rounded-md">
                {rosterDraft.length} atleta(s) na súmula
              </span>
            </div>

            {/* Quick add athlete to this match */}
            <div className="flex items-center gap-2">
              <select
                value={addRosterAthleteId}
                onChange={(e) => setAddRosterAthleteId(e.target.value)}
                className="flex-1 text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
              >
                <option value="">-- Adicionar outro atleta à súmula da partida --</option>
                {athletes
                  .filter((a) => !rosterDraft.some((r) => r.athleteId === a.id))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.category || 'Atleta'})
                    </option>
                  ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!addRosterAthleteId}
                onClick={handleAddAthleteToDraft}
                leftIcon={<UserPlus size={13} />}
              >
                Adicionar
              </Button>
            </div>

            {/* Roster Athletes List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 bg-white rounded-xl border border-slate-200">
              {rosterDraft.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <Users size={32} className="mx-auto text-slate-300 mb-1" />
                  <p className="text-xs font-semibold text-slate-600">Nenhum atleta relacionado ainda.</p>
                  <p className="text-[11px] text-slate-400">Selecione atletas no campo acima para escalar.</p>
                </div>
              ) : (
                rosterDraft.map((item) => (
                  <div
                    key={item.athleteId}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleDraftParticipation(item.athleteId)}
                        className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black transition-colors cursor-pointer ${
                          item.participated
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                        title={item.participated ? 'Em campo (clique para marcar banco)' : 'Banco (clique para marcar em campo)'}
                      >
                        {item.participated ? '✓' : '—'}
                      </button>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {item.athleteName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.className || 'Centauro'} •{' '}
                          {item.participated ? (
                            <strong className="text-emerald-700">Jogou / Em Campo</strong>
                          ) : (
                            'Relacionado'
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Goals counter */}
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                        <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                          <span>⚽ Gols:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustDraftGoals(item.athleteId, -1)}
                          className="w-5 h-5 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300 cursor-pointer"
                          title="Diminuir gol"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="w-5 text-center text-xs font-black text-amber-700">
                          {item.goals}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustDraftGoals(item.athleteId, 1)}
                          className="w-5 h-5 rounded bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300 cursor-pointer"
                          title="Adicionar gol"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      {/* Remove from draft */}
                      <button
                        type="button"
                        onClick={() => removeAthleteFromDraft(item.athleteId)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Remover atleta da súmula"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Total de gols marcados pelo time:{' '}
                <strong className="text-amber-700 font-bold">
                  ⚽ {rosterDraft.reduce((acc, curr) => acc + curr.goals, 0)}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setMatchForRoster(null)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" leftIcon={<CheckCircle2 size={14} />}>
                  Salvar Escalação & Gols
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ================================================================ */}
      {/* 3. MODAL: ATUALIZAR PLACAR DA PARTIDA */}
      {/* ================================================================ */}
      {matchToScore && (
        <Modal
          isOpen={true}
          onClose={() => setMatchToScore(null)}
          title="Resultado da Partida"
          description={`CENTAURO vs ${matchToScore.opponent}`}
          size="sm"
        >
          <form onSubmit={handleSaveScore} className="space-y-5">
            <div className="flex items-center justify-around py-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="text-center space-y-1.5 w-5/12">
                <span className="text-xs font-bold text-slate-900 block truncate">
                  CENTAURO
                </span>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={scorePs}
                  onChange={(e) => setScorePs(e.target.value)}
                  placeholder="0"
                  className="w-16 h-12 text-center text-2xl font-black text-blue-700 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <span className="text-xs font-black text-slate-400">X</span>

              <div className="text-center space-y-1.5 w-5/12">
                <span className="text-xs font-bold text-slate-900 block truncate">
                  {matchToScore.opponent}
                </span>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={scoreOpponent}
                  onChange={(e) => setScoreOpponent(e.target.value)}
                  placeholder="0"
                  className="w-16 h-12 text-center text-2xl font-black text-slate-800 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMatchToScore(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" leftIcon={<CheckCircle2 size={14} />}>
                Salvar Placar
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ================================================================ */}
      {/* 4. MODAL: CONFIRMAR EXCLUSÃO DE PARTIDA */}
      {/* ================================================================ */}
      {matchToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setMatchToDelete(null)}
          title="Excluir Partida Cadastrada"
          description="Confirmação de exclusão permanente do jogo."
          size="md"
        >
          <div className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1.5 text-xs text-rose-900">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle size={16} className="text-rose-600" />
                <span>Tem certeza que deseja excluir esta partida?</span>
              </div>
              <p className="text-rose-800 text-[11px] leading-relaxed">
                Esta ação removerá o jogo contra <strong>{matchToDelete.opponent}</strong> ({formatDateBR(matchToDelete.match_date)}), bem como a lista de atletas relacionados e todos os gols registrados para este confronto.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Adversário:</span>
                <span className="font-bold text-slate-800">{matchToDelete.opponent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Data / Horário:</span>
                <span className="font-medium text-slate-700">
                  {formatDateBR(matchToDelete.match_date)} {matchToDelete.match_time ? `às ${matchToDelete.match_time}` : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Turma / Categoria:</span>
                <span className="font-medium text-slate-700">{matchToDelete.class_name}</span>
              </div>
              {matchToDelete.competition_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Competição:</span>
                  <span className="font-medium text-slate-700">{matchToDelete.competition_name}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMatchToDelete(null)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleConfirmDeleteMatch}
                leftIcon={<Trash2 size={14} />}
              >
                Confirmar Exclusão
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
