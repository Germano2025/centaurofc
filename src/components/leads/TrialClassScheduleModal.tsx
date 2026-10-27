import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Select } from '../common/Input';
import { useApp } from '../../context/AppContext';
import { TrialLead, TrialClass } from '../../types';

interface TrialClassScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: TrialLead | null;
  existingTrialClass?: TrialClass | null;
  isReschedule?: boolean;
}

export const TrialClassScheduleModal: React.FC<TrialClassScheduleModalProps> = ({
  isOpen,
  onClose,
  lead,
  existingTrialClass,
  isReschedule,
}) => {
  const { classes, scheduleTrialClass, rescheduleTrialClass } = useApp();
  const [classDate, setClassDate] = useState(() => existingTrialClass?.class_date || new Date().toISOString().split('T')[0]);
  const [classTime, setClassTime] = useState(() => existingTrialClass?.class_time || '18:00');
  const [classId, setClassId] = useState(() => existingTrialClass?.class_id || classes[0]?.id || '');
  const [notes, setNotes] = useState(() => existingTrialClass?.notes || '');

  if (!lead && !existingTrialClass) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClass = classes.find((c) => c.id === classId);

    if (isReschedule && existingTrialClass) {
      rescheduleTrialClass(existingTrialClass.id, {
        newDate: classDate,
        newTime: classTime,
        newClassId: classId,
        reason: notes,
      });
    } else if (lead) {
      scheduleTrialClass({
        lead_id: lead.id,
        athlete_name: lead.athlete_name,
        class_id: classId,
        class_name: selectedClass?.name || 'Turma Centauro',
        class_date: classDate,
        class_time: classTime,
        location: 'Centauro - Campo Principal',
        notes,
        status: 'AGENDADA',
      });
    }
    onClose();
  };

  const athleteName = lead?.athlete_name || existingTrialClass?.athlete_name || '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isReschedule ? 'Reagendar Aula Experimental' : 'Agendar Aula Experimental'}
      subtitle={`Aluno: ${athleteName}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="date"
            label="Data da Aula *"
            required
            value={classDate}
            onChange={(e) => setClassDate(e.target.value)}
          />
          <Input
            type="time"
            label="Horário *"
            required
            value={classTime}
            onChange={(e) => setClassTime(e.target.value)}
          />
        </div>

        <Select
          label="Turma Recomendada *"
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          options={(classes || []).map((c) => ({
            value: c.id,
            label: `${c.name} (${c.category} - ${c.schedule_time})`,
          }))}
        />

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Observações da Aula</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Aluno precisa de chuteira emprestada ou teste na posição de goleiro..."
            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" type="submit">
            {isReschedule ? 'Salvar Novo Horário' : 'Confirmar Agendamento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
