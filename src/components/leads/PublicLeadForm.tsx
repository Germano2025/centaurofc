import React, { useState } from 'react';
import {
  Trophy,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Shield,
  MessageCircle,
  RotateCcw,
  FileText,
  Home,
  Building,
} from 'lucide-react';
import { TrialLead } from '../../types';
import { supabase } from '../../lib/supabase';
import { formatCPF, formatCEP, cleanDigits } from '../../utils/formatters';
import { saveLeadToServer, broadcastNewLead } from '../../utils/leadsSync';

interface PublicLeadFormProps {
  onLeadAdded?: (lead: TrialLead) => void;
}

const BRAZILIAN_STATES = [
  { uf: 'PE', name: 'Pernambuco (PE)' },
  { uf: 'PB', name: 'Paraíba (PB)' },
  { uf: 'AL', name: 'Alagoas (AL)' },
  { uf: 'RN', name: 'Rio Grande do Norte (RN)' },
  { uf: 'CE', name: 'Ceará (CE)' },
  { uf: 'BA', name: 'Bahia (BA)' },
  { uf: 'SP', name: 'São Paulo (SP)' },
  { uf: 'RJ', name: 'Rio de Janeiro (RJ)' },
  { uf: 'MG', name: 'Minas Gerais (MG)' },
  { uf: 'AC', name: 'Acre (AC)' },
  { uf: 'AP', name: 'Amapá (AP)' },
  { uf: 'AM', name: 'Amazonas (AM)' },
  { uf: 'DF', name: 'Distrito Federal (DF)' },
  { uf: 'ES', name: 'Espírito Santo (ES)' },
  { uf: 'GO', name: 'Goiás (GO)' },
  { uf: 'MA', name: 'Maranhão (MA)' },
  { uf: 'MT', name: 'Mato Grosso (MT)' },
  { uf: 'MS', name: 'Mato Grosso do Sul (MS)' },
  { uf: 'PA', name: 'Pará (PA)' },
  { uf: 'PR', name: 'Paraná (PR)' },
  { uf: 'PI', name: 'Piauí (PI)' },
  { uf: 'RO', name: 'Rondônia (RO)' },
  { uf: 'RR', name: 'Roraima (RR)' },
  { uf: 'RS', name: 'Rio Grande do Sul (RS)' },
  { uf: 'SC', name: 'Santa Catarina (SC)' },
  { uf: 'SE', name: 'Sergipe (SE)' },
  { uf: 'TO', name: 'Tocantins (TO)' },
];

export const PublicLeadForm: React.FC<PublicLeadFormProps> = ({ onLeadAdded }) => {
  // SESSÃO 1: DADOS DO ALUNO(A)
  const [athleteName, setAthleteName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [athleteDocument, setAthleteDocument] = useState(''); // RG ou CPF do Aluno
  const [hasExperience, setHasExperience] = useState<'SIM' | 'NAO' | 'INICIANTE'>('INICIANTE');

  // SESSÃO 2: DADOS DO RESPONSÁVEL E ENDEREÇO
  const [responsibleName, setResponsibleName] = useState('');
  const [responsibleCpf, setResponsibleCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState('Pai/Mãe');

  // Campos de Endereço
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('Recife');
  const [addressState, setAddressState] = useState('PE');
  const [addressZip, setAddressZip] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedLead, setSubmittedLead] = useState<TrialLead | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Phone input mask
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 11) val = val.slice(0, 11);

    if (val.length > 10) {
      val = val.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (val.length > 6) {
      val = val.replace(/^(\d{2})(\d{4})(\d{0,4})$/, '($1) $2-$3');
    } else if (val.length > 2) {
      val = val.replace(/^(\d{2})(\d{0,5})$/, '($1) $2');
    }
    setPhone(val);
  };

  // CPF do Responsável mask
  const handleResponsibleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResponsibleCpf(formatCPF(e.target.value));
  };

  // CEP mask
  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressZip(formatCEP(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!athleteName.trim()) {
      setErrorMessage('Por favor, informe o nome completo do aluno(a).');
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!birthDate) {
      setErrorMessage('Por favor, informe a data de nascimento do aluno(a).');
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!responsibleName.trim()) {
      setErrorMessage('Por favor, informe o nome do responsável.');
      if (typeof window !== 'undefined') window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    const cleanRespCpf = cleanDigits(responsibleCpf);
    if (!cleanRespCpf || cleanRespCpf.length !== 11) {
      setErrorMessage('Por favor, informe o CPF completo do responsável (11 dígitos).');
      if (typeof window !== 'undefined') window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    const cleanPhone = cleanDigits(phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('Por favor, informe um WhatsApp válido com DDD (mínimo 10 dígitos).');
      if (typeof window !== 'undefined') window.scrollTo({ top: 350, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const leadId = `l-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Formatar endereço completo unificado
      const addressParts = [
        addressStreet.trim(),
        addressNumber.trim() ? `nº ${addressNumber.trim()}` : '',
        addressComplement.trim(),
        addressNeighborhood.trim() ? `Bairro ${addressNeighborhood.trim()}` : '',
        addressCity.trim() && addressState.trim()
          ? `${addressCity.trim()} - ${addressState.trim()}`
          : (addressCity.trim() || addressState.trim()),
        addressZip.trim() ? `CEP: ${addressZip.trim()}` : '',
      ].filter(Boolean);

      const formattedAddress = addressParts.join(', ');

      // Determinar se o documento do aluno é CPF (11 dígitos) ou RG
      const cleanStudentDoc = cleanDigits(athleteDocument);
      const isStudentCpf = cleanStudentDoc.length === 11;

      const fullNotes = [
        athleteDocument.trim() ? `Doc Aluno: ${athleteDocument.trim()}` : '',
        `CPF Responsável: ${formatCPF(cleanRespCpf)}`,
        `Parentesco: ${relationship}`,
        hasExperience ? `Experiência: ${hasExperience}` : '',
        formattedAddress ? `Endereço: ${formattedAddress}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      const newLead: TrialLead = {
        id: leadId,
        athlete_name: athleteName.trim(),
        athlete_birth_date: birthDate,
        athlete_document: athleteDocument.trim() || undefined,
        athlete_cpf: isStudentCpf ? cleanStudentDoc : undefined,
        athlete_rg: !isStudentCpf && athleteDocument.trim() ? athleteDocument.trim() : undefined,
        responsible_name: responsibleName.trim(),
        responsible_cpf: cleanRespCpf,
        responsible_phone: phone.trim(),
        responsible_email: email.trim().toLowerCase() || undefined,
        responsible_relationship: relationship,
        address: formattedAddress || undefined,
        address_street: addressStreet.trim() || undefined,
        address_number: addressNumber.trim() || undefined,
        address_complement: addressComplement.trim() || undefined,
        address_neighborhood: addressNeighborhood.trim() || undefined,
        address_city: addressCity.trim() || undefined,
        address_state: addressState.trim() || undefined,
        address_zip: cleanDigits(addressZip) || undefined,
        previous_experience: hasExperience === 'SIM',
        interest_class_name: 'Aula Experimental (A Definir)',
        source: 'FORMULARIO_EXTERNO',
        stage: 'NOVO',
        entry_date: today,
        last_activity_date: today,
        notes: fullNotes,
        timeline: [
          {
            id: `lt-${Date.now()}`,
            lead_id: leadId,
            action_type: 'FORMULARIO_RECEBIDO',
            title: 'Inscrição via Link Externo',
            description: `Inscrição online recebida de ${responsibleName.trim()} (CPF: ${formatCPF(cleanRespCpf)}) para o atleta ${athleteName.trim()}.${athleteDocument.trim() ? ` Doc Aluno: ${athleteDocument.trim()}.` : ''} Endereço: ${formattedAddress || 'Não informado'}.`,
            new_stage: 'NOVO',
            registered_by: 'Formulário Online',
            created_at: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
      };

      // 1. Salvar no localStorage
      const existingLeadsRaw = localStorage.getItem('ps_leads');
      let currentLeads: TrialLead[] = [];
      try {
        currentLeads = existingLeadsRaw ? JSON.parse(existingLeadsRaw) : [];
      } catch {
        currentLeads = [];
      }

      const updatedLeads = [newLead, ...currentLeads.filter((l) => l.id !== newLead.id)];
      localStorage.setItem('ps_leads', JSON.stringify(updatedLeads));

      // 2. Salvar no servidor Express persistente (/api/leads)
      await saveLeadToServer(newLead);

      // 3. Propagar via BroadcastChannel para outras abas
      broadcastNewLead(newLead);

      // 4. Disparar CustomEvent na janela atual
      window.dispatchEvent(
        new CustomEvent('ps_lead_created', {
          detail: newLead,
        })
      );

      // 5. Se o callback interno de criação estiver disponível, registrar
      if (onLeadAdded) {
        onLeadAdded(newLead);
      }

      // 6. Sincronizar com Supabase se disponível
      if (supabase) {
        supabase
          .from('leads')
          .insert({
            athlete_name: newLead.athlete_name,
            athlete_birth_date: newLead.athlete_birth_date,
            athlete_cpf: newLead.athlete_cpf,
            athlete_rg: newLead.athlete_rg,
            responsible_name: newLead.responsible_name,
            responsible_cpf: newLead.responsible_cpf,
            responsible_phone: newLead.responsible_phone,
            responsible_email: newLead.responsible_email,
            address: newLead.address,
            address_street: newLead.address_street,
            address_number: newLead.address_number,
            address_complement: newLead.address_complement,
            address_neighborhood: newLead.address_neighborhood,
            address_city: newLead.address_city,
            address_state: newLead.address_state,
            source: 'FORMULARIO_EXTERNO',
            stage: 'NOVO',
            notes: fullNotes,
          })
          .then(
            ({ error }) => {
              if (error) console.warn('Supabase public lead insert notice:', error.message);
            },
            () => {}
          );
      }

      setSubmittedLead(newLead);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setErrorMessage('Ocorreu um erro ao enviar sua inscrição. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setAthleteName('');
    setBirthDate('');
    setAthleteDocument('');
    setHasExperience('INICIANTE');
    setResponsibleName('');
    setResponsibleCpf('');
    setPhone('');
    setEmail('');
    setRelationship('Pai/Mãe');
    setAddressStreet('');
    setAddressNumber('');
    setAddressComplement('');
    setAddressNeighborhood('');
    setAddressCity('Recife');
    setAddressState('PE');
    setAddressZip('');
    setSubmittedLead(null);
    setErrorMessage('');
  };

  // Header do formulário público (link externo independente)
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/60 to-slate-100 text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Barra Superior de Identificação */}
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-20 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0A1D37] flex items-center justify-center p-1 border border-amber-500/30 shadow-md shadow-amber-500/10">
              <img
                src="/centauro-logo.png"
                alt="Centauro"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-black tracking-wider text-slate-900 flex items-center gap-1.5 leading-none">
                <span className="text-[#0A1D37]">CENTAURO</span>
                <span className="text-amber-800 text-xs font-bold px-1.5 py-0.5 bg-amber-50 rounded border border-amber-300">
                  CENTRO DE FORMAÇÃO
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 mt-1">
                Centro de Formação de Futebol • Recife - PE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full shadow-2xs">
            <Shield size={14} className="text-emerald-600 shrink-0" />
            <span className="hidden sm:inline font-semibold text-slate-700">Inscrição Oficial Segura</span>
            <span className="sm:hidden font-semibold text-slate-700 text-[11px]">Inscrição Oficial</span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        {submittedLead ? (
          /* TELA DE CONFIRMAÇÃO DE SUCESSO DO ALUNO(A) */
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 text-center shadow-xl shadow-slate-200/50 animate-in zoom-in-95 duration-200 space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={44} />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                Cadastro Enviado com Sucesso!
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 pt-2">
                Inscrição Confirmada!
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Os dados do(a) aluno(a) <strong className="text-slate-900">{submittedLead.athlete_name}</strong> foram
                enviados e registrados com sucesso no sistema do <strong>Centauro</strong>.
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                A coordenação entrará em contato com o responsável <strong>{submittedLead.responsible_name}</strong> para agendar a aula experimental.
              </p>
            </div>

            {/* Resumo dos Dados do(a) Aluno(a) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 text-left max-w-md mx-auto space-y-2.5 text-xs shadow-2xs">
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Aluno(a):</span>
                <span className="font-bold text-slate-900">{submittedLead.athlete_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Data de Nascimento:</span>
                <span className="font-semibold text-slate-800">
                  {submittedLead.athlete_birth_date ? submittedLead.athlete_birth_date.split('-').reverse().join('/') : 'Não informada'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">RG / CPF do Aluno:</span>
                <span className="font-semibold text-slate-800">
                  {submittedLead.athlete_document || formatCPF(submittedLead.athlete_cpf) || submittedLead.athlete_rg || 'Não informado'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Responsável Legal:</span>
                <span className="font-bold text-slate-900">
                  {submittedLead.responsible_name}
                  {submittedLead.responsible_cpf ? ` (CPF: ${formatCPF(submittedLead.responsible_cpf)})` : ''}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Telefone / WhatsApp:</span>
                <span className="font-bold text-slate-900">{submittedLead.responsible_phone}</span>
              </div>
              {submittedLead.address && (
                <div className="flex flex-col border-b border-slate-200/80 pb-2">
                  <span className="text-slate-500">Endereço:</span>
                  <span className="font-medium text-slate-800 mt-0.5">{submittedLead.address}</span>
                </div>
              )}
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Local da Escolinha:</span>
                <span className="font-semibold text-blue-700">Centauro — Recife/PE</span>
              </div>
            </div>

            {/* Ação de Novo Cadastro */}
            <div className="pt-2 max-w-md mx-auto">
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto mx-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-xs py-2.5 px-6 rounded-xl border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Cadastrar outro(a) aluno(a)</span>
              </button>
            </div>
          </div>
        ) : (
          /* FORMULÁRIO DE CAPTAÇÃO */
          <div className="space-y-6">
            {/* Header com destaque */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                <Sparkles size={14} className="text-blue-600" />
                <span>Primeira Aula 100% Gratuita • Sem Compromisso</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Inscrição para Aula Experimental
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                Preencha os dados abaixo para o cadastro e agendamento da aula experimental no <strong>Centauro</strong>.
              </p>
            </div>

            {errorMessage && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                {errorMessage}
              </div>
            )}

            {/* Formulário */}
            <form
              onSubmit={handleSubmit}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-8 shadow-xl shadow-slate-200/40 space-y-6"
            >
              {/* ======================================================== */}
              {/* SESSÃO 1: DADOS DO ALUNO(A) */}
              {/* ======================================================== */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <User size={16} className="text-blue-600" />
                    <span>Dados do Aluno(a)</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome do Aluno */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nome Completo do Aluno(a) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={athleteName}
                      onChange={(e) => setAthleteName(e.target.value)}
                      placeholder="Ex: Gabriel Lucas de Oliveira"
                      className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                    />
                  </div>

                  {/* Data de Nascimento */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Data de Nascimento <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                    />
                  </div>

                  {/* RG ou CPF do Aluno */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText size={13} className="text-blue-600" />
                        RG ou CPF do Aluno(a)
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">Identificação</span>
                    </label>
                    <input
                      type="text"
                      value={athleteDocument}
                      onChange={(e) => setAthleteDocument(e.target.value)}
                      placeholder="Ex: 000.000.000-00 ou 1.234.567 SDS/PE"
                      className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-mono shadow-2xs"
                    />
                  </div>

                  {/* Já treinou em escolinha antes? */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Já treinou em escolinha antes?
                    </label>
                    <select
                      value={hasExperience}
                      onChange={(e) => setHasExperience(e.target.value as any)}
                      className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer shadow-2xs"
                    >
                      <option value="INICIANTE">Iniciante (Primeira vez em escolinha)</option>
                      <option value="SIM">Sim, já tem experiência prévia</option>
                      <option value="NAO">Não, joga apenas na escola ou em quadra livre</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* SESSÃO 2: DADOS DO RESPONSÁVEL E ENDEREÇO */}
              {/* ======================================================== */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    <Home size={16} className="text-blue-600" />
                    <span>Dados do Responsável & Endereço</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome do Responsável */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nome do Pai / Mãe / Responsável <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={responsibleName}
                      onChange={(e) => setResponsibleName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo de Oliveira"
                      className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                    />
                  </div>

                  {/* CPF do Responsável */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>
                        CPF do Responsável <span className="text-rose-500">*</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal">11 dígitos</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={responsibleCpf}
                      onChange={handleResponsibleCpfChange}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-mono shadow-2xs"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      WhatsApp com DDD <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="(81) 98888-7777"
                      className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-mono shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Enviaremos a confirmação e horários por este número.
                    </p>
                  </div>

                  {/* Parentesco */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Grau de Parentesco <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer shadow-2xs"
                    >
                      <option value="Pai/Mãe">Pai / Mãe</option>
                      <option value="Avô/Avó">Avô / Avó</option>
                      <option value="Tio/Tia">Tio / Tia</option>
                      <option value="Tutor Legal">Tutor Legal</option>
                      <option value="Outro">Outro Responsável</option>
                    </select>
                  </div>

                  {/* E-mail (opcional) */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      E-mail do Responsável (Opcional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="responsavel@email.com"
                      className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                    />
                  </div>

                  {/* SUB-BLOCO DE ENDEREÇO */}
                  <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block mb-3 flex items-center gap-1.5">
                      <MapPin size={13} />
                      <span>Endereço Residencial</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Logradouro / Rua */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Endereço / Rua / Avenida
                        </label>
                        <input
                          type="text"
                          value={addressStreet}
                          onChange={(e) => setAddressStreet(e.target.value)}
                          placeholder="Ex: Av. Caxangá, Rua dos Coelhos..."
                          className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                        />
                      </div>

                      {/* Número */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Número
                        </label>
                        <input
                          type="text"
                          value={addressNumber}
                          onChange={(e) => setAddressNumber(e.target.value)}
                          placeholder="Ex: 120 ou S/N"
                          className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                        />
                      </div>

                      {/* Complemento */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Complemento
                        </label>
                        <input
                          type="text"
                          value={addressComplement}
                          onChange={(e) => setAddressComplement(e.target.value)}
                          placeholder="Ex: Apto 302, Bloco B, Casa 1"
                          className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                        />
                      </div>

                      {/* Bairro */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Bairro
                        </label>
                        <input
                          type="text"
                          value={addressNeighborhood}
                          onChange={(e) => setAddressNeighborhood(e.target.value)}
                          placeholder="Ex: Caxangá, Várzea, Cordeiro..."
                          className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                        />
                      </div>

                      {/* CEP (Opcional) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          CEP
                        </label>
                        <input
                          type="text"
                          value={addressZip}
                          onChange={handleZipChange}
                          placeholder="50000-000"
                          maxLength={9}
                          className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all font-mono shadow-2xs"
                        />
                      </div>

                      {/* Cidade */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Cidade
                        </label>
                        <input
                          type="text"
                          value={addressCity}
                          onChange={(e) => setAddressCity(e.target.value)}
                          placeholder="Ex: Recife"
                          className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                        />
                      </div>

                      {/* Estado (UF) */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Estado (UF)
                        </label>
                        <select
                          value={addressState}
                          onChange={(e) => setAddressState(e.target.value)}
                          className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer shadow-2xs"
                        >
                          {BRAZILIAN_STATES.map((st) => (
                            <option key={st.uf} value={st.uf}>
                              {st.uf} - {st.name.split(' (')[0]}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerta de erro na parte inferior também se houver */}
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Botão de Envio */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <Shield size={14} className="text-emerald-600 shrink-0" />
                  <span>Seus dados são protegidos e usados exclusivamente para contato do Centauro.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3.5 px-8 rounded-xl shadow-md shadow-blue-600/20 transition-all text-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Enviando inscrição...</span>
                  ) : (
                    <>
                      <span>Solicitar Aula Experimental Gratuita</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Rodapé Oficial */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 space-y-2">
        <div className="flex items-center justify-center gap-2 font-bold text-slate-800">
          <img src="/centauro-logo.png" alt="Centauro" className="w-5 h-5 object-contain" />
          <span>CENTAURO • CENTRO DE FORMAÇÃO</span>
        </div>
        <p className="text-[11px] text-slate-500">
          Recife - PE • Fone/WhatsApp: (81) 99709-3505 • Centro de Formação de Atletas
        </p>
        <p className="text-[10px] text-slate-400">
          © {new Date().getFullYear()} Centauro. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
};
