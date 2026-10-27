import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Input, Select } from '../common/Input';
import { useApp } from '../../context/AppContext';
import { TrialLead, LeadSource, KanbanStage } from '../../types';
import { formatCPF, formatPhone, cleanDigits } from '../../utils/formatters';
import { AlertTriangle, User, Phone, Calendar, Info } from 'lucide-react';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadToEdit?: TrialLead | null;
  initialStage?: KanbanStage;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  leadToEdit,
  initialStage = 'NOVO',
}) => {
  const { classes, addLead, updateLead, checkDuplicateAthlete, checkDuplicateLead, showToast } = useApp();
  const [validationError, setValidationError] = useState('');

  // Athlete info
  const [athleteName, setAthleteName] = useState('');
  const [athleteBirthDate, setAthleteBirthDate] = useState('');
  const [athleteCpf, setAthleteCpf] = useState('');
  const [athleteRg, setAthleteRg] = useState('');

  // Responsible info
  const [responsibleName, setResponsibleName] = useState('');
  const [responsiblePhone, setResponsiblePhone] = useState('');
  const [responsibleCpf, setResponsibleCpf] = useState('');
  const [responsibleEmail, setResponsibleEmail] = useState('');
  const [responsibleRelationship, setResponsibleRelationship] = useState('Pai/Mãe');
  const [address, setAddress] = useState('');

  // Lead interest info
  const [stage, setStage] = useState<KanbanStage>(initialStage);
  const [interestClassId, setInterestClassId] = useState('');
  const [source, setSource] = useState<LeadSource>('WHATSAPP');
  const [previousExperience, setPreviousExperience] = useState(false);
  const [notes, setNotes] = useState('');

  // Duplicate warning
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  useEffect(() => {
    if (leadToEdit) {
      setAthleteName(leadToEdit.athlete_name || '');
      setAthleteBirthDate(leadToEdit.athlete_birth_date || '');
      const docClean = cleanDigits(leadToEdit.athlete_document);
      const editCpf = leadToEdit.athlete_cpf
        ? formatCPF(leadToEdit.athlete_cpf)
        : (docClean.length === 11 ? formatCPF(leadToEdit.athlete_document) : '');
      const editRg = leadToEdit.athlete_rg || (docClean.length !== 11 && leadToEdit.athlete_document ? leadToEdit.athlete_document : '');
      setAthleteCpf(editCpf);
      setAthleteRg(editRg);
      setResponsibleName(leadToEdit.responsible_name || '');
      setResponsiblePhone(leadToEdit.responsible_phone ? formatPhone(leadToEdit.responsible_phone) : '');
      setResponsibleCpf(leadToEdit.responsible_cpf ? formatCPF(leadToEdit.responsible_cpf) : '');
      setResponsibleEmail(leadToEdit.responsible_email || '');
      setResponsibleRelationship(leadToEdit.responsible_relationship || 'Pai/Mãe');
      setAddress(leadToEdit.address || '');
      setStage(leadToEdit.stage || 'NOVO');
      setInterestClassId(leadToEdit.interest_class_id || '');
      setSource(leadToEdit.source || 'WHATSAPP');
      setPreviousExperience(leadToEdit.previous_experience || false);
      setNotes(leadToEdit.notes || '');
      setDuplicateWarning(null);
    } else {
      setAthleteName('');
      setAthleteBirthDate('');
      setAthleteCpf('');
      setAthleteRg('');
      setResponsibleName('');
      setResponsiblePhone('');
      setResponsibleCpf('');
      setResponsibleEmail('');
      setResponsibleRelationship('Pai/Mãe');
      setAddress('');
      setStage(initialStage);
      setInterestClassId('');
      setSource('WHATSAPP');
      setPreviousExperience(false);
      setNotes('');
      setDuplicateWarning(null);
    }
  }, [leadToEdit, initialStage, isOpen]);

  // Real-time duplicate checking
  useEffect(() => {
    if (!isOpen || leadToEdit) {
      setDuplicateWarning(null);
      return;
    }

    const cleanCpf = cleanDigits(athleteCpf);
    const cleanPhone = cleanDigits(responsiblePhone);
    const normName = athleteName.trim();

    if (cleanCpf.length === 11 || (normName.length > 3 && cleanPhone.length >= 8)) {
      const dupAthlete = checkDuplicateAthlete(cleanCpf, normName, athleteBirthDate);
      if (dupAthlete) {
        setDuplicateWarning(
          `Atenção: Já existe um atleta cadastrado no CT com estes dados: "${dupAthlete.name}" (Status: ${dupAthlete.status}). Verifique para evitar duplicidade.`
        );
        return;
      }

      const dupLead = checkDuplicateLead(cleanCpf, normName, cleanPhone);
      if (dupLead) {
        setDuplicateWarning(
          `Aviso: Já existe um interessado em andamento no funil: "${dupLead.athlete_name}" (Etapa: ${dupLead.stage}).`
        );
        return;
      }
    }

    setDuplicateWarning(null);
  }, [athleteCpf, athleteName, athleteBirthDate, responsiblePhone, isOpen, leadToEdit, checkDuplicateAthlete, checkDuplicateLead]);

  // Calculate age preview
  const calculatedAge = useMemo(() => {
    if (!athleteBirthDate) return null;
    const birth = new Date(athleteBirthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  }, [athleteBirthDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!athleteName.trim() || !athleteBirthDate || !responsibleName.trim() || !responsiblePhone.trim()) {
      setValidationError('Por favor, preencha todos os campos obrigatórios (Nome do Atleta, Nascimento, Responsável e Telefone).');
      showToast('Preencha os campos obrigatórios marcados com *', 'error');
      return;
    }
    setValidationError('');

    const selectedClass = classes.find((c) => c.id === interestClassId);

    const leadData = {
      athlete_name: athleteName.trim(),
      athlete_birth_date: athleteBirthDate,
      athlete_document: leadToEdit?.athlete_document || athleteCpf || athleteRg || undefined,
      athlete_cpf: cleanDigits(athleteCpf) || undefined,
      athlete_rg: athleteRg.trim() || undefined,
      responsible_name: responsibleName.trim(),
      responsible_phone: cleanDigits(responsiblePhone),
      responsible_cpf: cleanDigits(responsibleCpf) || undefined,
      responsible_email: responsibleEmail.trim() || undefined,
      responsible_relationship: responsibleRelationship,
      address: address.trim() || undefined,
      address_street: leadToEdit?.address_street,
      address_number: leadToEdit?.address_number,
      address_complement: leadToEdit?.address_complement,
      address_neighborhood: leadToEdit?.address_neighborhood,
      address_city: leadToEdit?.address_city,
      address_state: leadToEdit?.address_state,
      address_zip: leadToEdit?.address_zip,
      stage: stage,
      interest_class_id: interestClassId || undefined,
      interest_class_name: selectedClass?.name || undefined,
      source: source,
      previous_experience: previousExperience,
      notes: notes.trim() || undefined,
    };

    if (leadToEdit) {
      updateLead(leadToEdit.id, leadData);
    } else {
      addLead(leadData);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={leadToEdit ? 'Editar Interessado' : 'Novo Interessado (Lead)'}
      subtitle="Cadastre o contato inicial para acompanhamento no funil de captação e agendamento de aula experimental."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {validationError && (
          <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3 text-rose-900 text-xs animate-in fade-in">
            <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-bold">{validationError}</p>
            </div>
          </div>
        )}

        {duplicateWarning && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-amber-900 text-xs animate-in fade-in">
            <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-bold">{duplicateWarning}</p>
              <p className="text-amber-700 mt-0.5">
                O sistema permite prosseguir caso seja uma nova tentativa ou homônimo, mas fique atento.
              </p>
            </div>
          </div>
        )}

        {/* Section 1: Dados do Atleta */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <User size={16} className="text-blue-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              1. Dados do Aluno / Atleta Interessado
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome Completo do Aluno *"
              required
              placeholder="Ex: Gabriel Santos Silva"
              value={athleteName}
              onChange={(e) => setAthleteName(e.target.value)}
            />

            <div>
              <Input
                label="Data de Nascimento *"
                type="date"
                required
                value={athleteBirthDate}
                onChange={(e) => setAthleteBirthDate(e.target.value)}
                helperText={calculatedAge !== null ? `Idade calculada: ${calculatedAge} anos` : undefined}
              />
            </div>

            <Input
              label="CPF do Aluno (Opcional)"
              placeholder="000.000.000-00"
              value={athleteCpf}
              onChange={(e) => setAthleteCpf(formatCPF(e.target.value))}
            />

            <Input
              label="RG / Certidão (Opcional)"
              placeholder="Número do documento"
              value={athleteRg}
              onChange={(e) => setAthleteRg(e.target.value)}
            />
          </div>
        </div>

        {/* Section 2: Dados do Responsável */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Phone size={16} className="text-blue-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              2. Responsável pelo Contato
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nome do Responsável *"
              required
              placeholder="Ex: Carlos Eduardo Silva"
              value={responsibleName}
              onChange={(e) => setResponsibleName(e.target.value)}
            />

            <Input
              label="WhatsApp / Telefone *"
              required
              placeholder="(00) 00000-0000"
              value={responsiblePhone}
              onChange={(e) => setResponsiblePhone(formatPhone(e.target.value))}
            />

            <Select
              label="Grau de Parentesco"
              value={responsibleRelationship}
              onChange={(e) => setResponsibleRelationship(e.target.value)}
              options={[
                { value: 'Pai/Mãe', label: 'Pai ou Mãe' },
                { value: 'Avô/Avó', label: 'Avô ou Avó' },
                { value: 'Tio/Tia', label: 'Tio ou Tia' },
                { value: 'Tutor(a) Legal', label: 'Tutor(a) Legal' },
                { value: 'Outro', label: 'Outro Parentesco' },
              ]}
            />

            <Input
              label="E-mail (Opcional)"
              type="email"
              placeholder="email@exemplo.com"
              value={responsibleEmail}
              onChange={(e) => setResponsibleEmail(e.target.value)}
            />

            <Input
              label="CPF do Responsável (Opcional)"
              placeholder="000.000.000-00"
              value={responsibleCpf}
              onChange={(e) => setResponsibleCpf(formatCPF(e.target.value))}
            />

            <Input
              label="Bairro / Endereço (Opcional)"
              placeholder="Ex: Centro, Rua das Flores"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        {/* Section 3: Interesse & Origem */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Calendar size={16} className="text-blue-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              3. Turma de Interesse e Origem
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Turma de Interesse Pretendida"
              value={interestClassId}
              onChange={(e) => setInterestClassId(e.target.value)}
              options={[
                { value: '', label: '-- Selecionar Turma (ou definir depois) --' },
                ...(classes || [])
                  .filter((c) => c.status === 'ATIVA')
                  .map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.category} - ${(c.schedule_days || []).join('/')} às ${c.schedule_time})`,
                  })),
              ]}
            />

            <Select
              label="Origem do Contato"
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              options={[
                { value: 'WHATSAPP', label: 'WhatsApp Direto' },
                { value: 'INSTAGRAM', label: 'Instagram / Redes Sociais' },
                { value: 'INDICACAO', label: 'Indicação de Aluno/Amigo' },
                { value: 'PASSANTE', label: 'Passante / Visita Presencial ao CT' },
                { value: 'FORMULARIO_EXTERNO', label: 'Formulário Online / Site' },
                { value: 'FACEBOOK', label: 'Facebook Ads' },
                { value: 'GOOGLE', label: 'Google Pesquisa / Maps' },
                { value: 'OUTRO', label: 'Outro Canal' },
              ]}
            />

            <Select
              label="Etapa no Funil"
              value={stage}
              onChange={(e) => setStage(e.target.value as KanbanStage)}
              options={[
                { value: 'NOVO', label: '1. Novo Contato' },
                { value: 'AULA_AGENDADA', label: '2. Aula Agendada' },
                { value: 'MATRICULADO', label: '3. Matriculado' },
                { value: 'NAO_CONVERTIDO', label: '4. Arquivado / Não Convertidos' },
              ]}
            />

            <div className="flex items-center gap-3 pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={previousExperience}
                  onChange={(e) => setPreviousExperience(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                Já possui experiência em escolinha/futebol
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Observações / Preferências / Histórico
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Aluno joga no ataque, prefere treinar no período da tarde, mãe quer acompanhar aula experimental..."
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary">
            {leadToEdit ? 'Salvar Alterações' : 'Cadastrar Interessado'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
