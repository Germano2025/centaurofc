import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ClipboardCheck, Calendar, Users, Check, X, CheckCheck, UserX, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button';
import { StatCard } from '../common/StatCard';
import { AthleteAvatar } from '../common/AthleteAvatar';
import { formatDateBR } from '../../utils/formatters';

export const PresencasModule: React.FC = () => {
  const {
    classes = [],
    athletes = [],
    trainingSessions = [],
    attendances = [],
    addTrainingSession,
    saveAttendanceRecords,
    showToast,
  } = useApp();

  const [selectedClassId, setSelectedClassId] = useState<string>(() => classes[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'PRESENTE' | 'AUSENTE'>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync default class if classes loaded late
  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  // Athletes belonging to the selected class
  const classAthletes = useMemo(() => {
    return (athletes || []).filter(
      (a) =>
        (a.current_class_id === selectedClassId || a.class_id === selectedClassId) &&
        a.status === 'ATIVO'
    );
  }, [athletes, selectedClassId]);

  // Existing training session for this class and date
  const currentSession = useMemo(() => {
    return (trainingSessions || []).find(
      (t) => t.class_id === selectedClassId && t.training_date === selectedDate
    );
  }, [trainingSessions, selectedClassId, selectedDate]);

  // Load existing attendances when class or date changes
  useEffect(() => {
    const newMap: Record<string, 'PRESENTE' | 'AUSENTE'> = {};

    if (currentSession) {
      const sessionAttendances = (attendances || []).filter(
        (a) => a.training_id === currentSession.id
      );
      for (const att of sessionAttendances) {
        newMap[att.athlete_id] = att.status === 'PRESENTE' ? 'PRESENTE' : 'AUSENTE';
      }
    }

    // Default unrecorded athletes to PRESENTE
    for (const ath of classAthletes) {
      if (!newMap[ath.id]) {
        newMap[ath.id] = 'PRESENTE';
      }
    }

    setAttendanceMap(newMap);
  }, [currentSession, selectedClassId, selectedDate, classAthletes]);

  const handleToggleStatus = (athleteId: string, status: 'PRESENTE' | 'AUSENTE') => {
    setAttendanceMap((prev) => ({
      ...prev,
      [athleteId]: status,
    }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, 'PRESENTE' | 'AUSENTE'> = {};
    for (const ath of classAthletes) {
      updated[ath.id] = 'PRESENTE';
    }
    setAttendanceMap(updated);
    showToast('Todos os alunos marcados como presentes.', 'info');
  };

  const handleMarkAllAbsent = () => {
    const updated: Record<string, 'PRESENTE' | 'AUSENTE'> = {};
    for (const ath of classAthletes) {
      updated[ath.id] = 'AUSENTE';
    }
    setAttendanceMap(updated);
    showToast('Todos os alunos marcados como ausentes.', 'info');
  };

  const handleSaveAttendance = async () => {
    if (!selectedClassId) {
      showToast('Selecione uma turma para realizar a chamada.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      let session = currentSession;
      if (!session) {
        session = addTrainingSession({
          class_id: selectedClassId,
          class_name: selectedClass?.name || 'Turma Oficial',
          training_date: selectedDate,
          training_time: selectedClass?.schedule_time || '08:00 - 09:30',
          location: selectedClass?.location || 'Campo Principal Centauro',
          training_type: 'REGULAR',
          status: 'REALIZADO',
          coach_name: selectedClass?.coach_name || 'Comissão Técnica',
          notes: `Chamada realizada via módulo de presença em ${formatDateBR(selectedDate)}`,
        });

        // Sync session to backend API
        fetch('/api/training-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(session),
        }).catch((err) => console.warn('Sync training session warning:', err));
      }

      const records = classAthletes.map((ath) => ({
        athleteId: ath.id,
        athleteMainClassId: ath.current_class_id || selectedClassId,
        status: (attendanceMap[ath.id] || 'PRESENTE') as 'PRESENTE' | 'AUSENTE',
      }));

      saveAttendanceRecords(session.id, records);

      // Sync attendances to backend API
      for (const rec of records) {
        fetch('/api/attendances', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            training_id: session.id,
            athlete_id: rec.athleteId,
            training_class_id: selectedClassId,
            status: rec.status,
            present: rec.status === 'PRESENTE',
          }),
        }).catch((err) => console.warn('Sync attendance record warning:', err));
      }

      showToast(`Chamada da turma "${selectedClass?.name}" salva com sucesso!`, 'success');
    } catch (err: any) {
      console.error('Error saving attendances:', err);
      showToast('Erro ao salvar chamada. Tente novamente.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = classAthletes.filter((a) => attendanceMap[a.id] === 'PRESENTE').length;
  const absentCount = classAthletes.length - presentCount;
  const attendanceRate =
    classAthletes.length > 0 ? Math.round((presentCount / classAthletes.length) * 100) : 0;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardCheck className="text-blue-600" size={26} />
            Controle de Presença e Chamada
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Registro diário de frequência nos treinos, controle de faltas e justificativas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="primary"
            onClick={handleSaveAttendance}
            isLoading={isSaving}
            disabled={classAthletes.length === 0}
            leftIcon={<Save size={15} />}
          >
            Salvar Chamada
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard title="Total na Turma" value={classAthletes.length} icon={Users} />
        <StatCard title="Presentes Marcados" value={presentCount} icon={CheckCircle2} />
        <StatCard title="Faltas Marcadas" value={absentCount} icon={X} />
        <StatCard
          title="Taxa de Frequência"
          value={`${attendanceRate}%`}
          icon={ClipboardCheck}
        />
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-5">
        {/* Filters and Controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Turma Oficial
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
              >
                {(classes || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Data do Treino
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs font-bold border border-slate-300 rounded-xl px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Quick toggle actions */}
          <div className="flex items-center gap-2 self-end lg:self-center">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleMarkAllPresent}
              leftIcon={<CheckCheck size={14} className="text-emerald-600" />}
            >
              Todos Presentes
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleMarkAllAbsent}
              leftIcon={<UserX size={14} className="text-rose-600" />}
            >
              Todos Ausentes
            </Button>
          </div>
        </div>

        {/* Athletes List */}
        {classAthletes.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Users size={36} className="mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600">Nenhum atleta ativo vinculado a esta turma.</p>
            <p className="text-xs text-slate-400">
              Vincule atletas a esta turma no módulo de Atletas ou escolha outra turma acima.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {classAthletes.map((ath) => {
              const isPresent = attendanceMap[ath.id] === 'PRESENTE';

              return (
                <div
                  key={ath.id}
                  className={`py-3 px-3 rounded-xl flex items-center justify-between gap-4 transition-colors ${
                    isPresent ? 'hover:bg-emerald-50/30' : 'bg-rose-50/20 hover:bg-rose-50/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <AthleteAvatar
                      photoUrl={ath.photo_url}
                      name={ath.name}
                      size="sm"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">{ath.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {ath.category || selectedClass?.category} • Resp: {ath.responsible_name || 'Não informado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(ath.id, 'PRESENTE')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isPresent
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      <Check size={14} />
                      <span>Presente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(ath.id, 'AUSENTE')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        !isPresent
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                      }`}
                    >
                      <X size={14} />
                      <span>Falta</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer save CTA */}
        {classAthletes.length > 0 && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Total: <strong>{classAthletes.length}</strong> alunos • Presentes: <strong className="text-emerald-700">{presentCount}</strong> • Faltas: <strong className="text-rose-700">{absentCount}</strong>
            </span>
            <Button
              size="sm"
              variant="primary"
              onClick={handleSaveAttendance}
              isLoading={isSaving}
              leftIcon={<Save size={15} />}
            >
              Salvar Chamada
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
