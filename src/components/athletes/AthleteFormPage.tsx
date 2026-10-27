import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Athlete,
  Responsible,
  AthleteDocument,
} from '../../types';
import { Button } from '../common/Button';
import { Input, Select } from '../common/Input';
import { AthleteAvatar } from '../common/AthleteAvatar';
import {
  User,
  Users,
  Calendar,
  Layers,
  FileText,
  Upload,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileIcon,
  ArrowLeft,
  Save,
  MapPin,
  CreditCard,
  Download,
  Search,
  UserCheck,
  UserPlus,
  ChevronDown,
  Check,
} from 'lucide-react';
import {
  formatCPF,
  formatPhone,
  formatCEP,
  formatDateBR,
  formatFileSize,
  formatCurrency,
  normalizeSearchText,
} from '../../utils/formatters';
import { uploadAthletePhoto, uploadAthleteDocument } from '../../lib/supabaseStorage';

interface AthleteFormPageProps {
  athleteToEdit?: Athlete | null;
  initialTab?: 'bloco1' | 'bloco2' | 'bloco3' | 'bloco4' | 'bloco5';
  onBack: () => void;
  onSuccess: (athlete: Athlete) => void;
}

interface StagedDocument {
  id: string;
  file: File;
  file_name: string;
  file_type: AthleteDocument['file_type'];
  file_size: string;
  file_url: string;
  notes?: string;
}

export const AthleteFormPage: React.FC<AthleteFormPageProps> = ({
  athleteToEdit,
  initialTab = 'bloco1',
  onBack,
  onSuccess,
}) => {
  const {
    classes = [],
    responsibles = [],
    athletes = [],
    addAthlete,
    updateAthlete,
    checkDuplicateAthlete,
    checkDuplicateResponsible,
    documents = [],
    addDocument,
    removeDocument,
    updateResponsible,
    addResponsible,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'bloco1' | 'bloco2' | 'bloco3' | 'bloco4' | 'bloco5'>(
    initialTab || 'bloco1'
  );

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Form State - Athlete Info
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [phone, setPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);

  // Address
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('Recife');
  const [state, setState] = useState('PE');

  // Responsible Section
  const [respMode, setRespMode] = useState<'new' | 'select'>(() => {
    return (responsibles && responsibles.length > 0) ? 'select' : 'new';
  });
  const [selectedRespId, setSelectedRespId] = useState('');
  const [respSearchQuery, setRespSearchQuery] = useState('');
  const [isRespDropdownOpen, setIsRespDropdownOpen] = useState(false);
  const respDropdownRef = useRef<HTMLDivElement>(null);
  const [respName, setRespName] = useState('');
  const [respCpf, setRespCpf] = useState('');
  const [respPhone, setRespPhone] = useState('');
  const [respEmail, setRespEmail] = useState('');
  const [respRelationship, setRespRelationship] = useState('Pai');

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (respDropdownRef.current && !respDropdownRef.current.contains(e.target as Node)) {
        setIsRespDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered responsibles for live autocomplete search
  const filteredResponsibles = useMemo(() => {
    const query = respSearchQuery.trim();
    if (!query) {
      return (responsibles || [])
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }))
        .slice(0, 15);
    }

    const qNorm = normalizeSearchText(query);
    const qDigits = query.replace(/\D/g, '');

    return (responsibles || [])
      .filter((r) => {
        const matchName = normalizeSearchText(r.name).includes(qNorm);
        const matchEmail = (r.email || '').toLowerCase().includes(query.toLowerCase());
        const matchPhone = qDigits.length >= 2 && (r.phone || '').replace(/\D/g, '').includes(qDigits);
        const matchCpf = qDigits.length >= 2 && (r.cpf || '').replace(/\D/g, '').includes(qDigits);
        return matchName || matchEmail || matchPhone || matchCpf;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }))
      .slice(0, 25);
  }, [responsibles, respSearchQuery]);

  // Real-time suggestions when typing a name in "Cadastrar Novo" mode
  const typedNameMatches = useMemo(() => {
    const q = respName.trim();
    if (q.length < 3 || selectedRespId) return [];
    const qNorm = normalizeSearchText(q);
    return (responsibles || [])
      .filter((r) => normalizeSearchText(r.name).includes(qNorm))
      .slice(0, 3);
  }, [respName, responsibles, selectedRespId]);

  // Centauro Official Data
  const [currentClassId, setCurrentClassId] = useState('');
  const [status, setStatus] = useState<Athlete['status']>('ATIVO');
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [monthlyFee, setMonthlyFee] = useState<string>('180,00');
  const [financialCondition, setFinancialCondition] = useState<Athlete['financial_condition']>('PAGANTE_SEM_DESCONTO');
  const [discountType, setDiscountType] = useState<Athlete['discount_type']>('FIXO');
  const [discountValue, setDiscountValue] = useState(0);
  const [dueDay, setDueDay] = useState(10);
  const [uniformDelivered, setUniformDelivered] = useState(true);
  const [notes, setNotes] = useState('');

  // Duplicate alerts & validations
  const [duplicateAthlete, setDuplicateAthlete] = useState<Athlete | null>(null);
  const [duplicateResponsible, setDuplicateResponsible] = useState<Responsible | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Staged Documents for upload
  const [stagedDocuments, setStagedDocuments] = useState<StagedDocument[]>([]);
  const [docUploadType, setDocUploadType] = useState<AthleteDocument['file_type']>('RG_CPF');
  const [isDraggingDoc, setIsDraggingDoc] = useState(false);

  // Auto-fill on mount / edit
  useEffect(() => {
    if (athleteToEdit) {
      setName(athleteToEdit.name || '');
      setBirthDate(athleteToEdit.birth_date || '');
      setCpf(formatCPF(athleteToEdit.cpf) || '');
      setRg(athleteToEdit.rg || '');
      setPhone(formatPhone(athleteToEdit.phone) || '');
      setPhotoUrl(athleteToEdit.photo_url || '');

      setStreet(athleteToEdit.address_street || athleteToEdit.address || '');
      setNumber(athleteToEdit.address_number || '');
      setComplement(athleteToEdit.address_complement || '');
      setNeighborhood(athleteToEdit.address_neighborhood || '');
      setCity(athleteToEdit.address_city || 'Recife');
      setState(athleteToEdit.address_state || 'PE');
      setCep(formatCEP(athleteToEdit.address_zip) || '');

      if (athleteToEdit.responsible_id) {
        setRespMode('select');
        setSelectedRespId(athleteToEdit.responsible_id);
        const resp = (responsibles || []).find((r) => r.id === athleteToEdit.responsible_id);
        if (resp) {
          setRespSearchQuery(resp.name || '');
          setRespName(resp.name || '');
          setRespPhone(formatPhone(resp.phone) || '');
          setRespCpf(formatCPF(resp.cpf) || '');
          setRespEmail(resp.email || '');
          setRespRelationship(resp.relationship || 'Pai');
        } else {
          setRespSearchQuery(athleteToEdit.responsible_name || '');
          setRespName(athleteToEdit.responsible_name || '');
          setRespPhone(formatPhone(athleteToEdit.responsible_phone) || '');
          setRespCpf(formatCPF(athleteToEdit.responsible_cpf) || '');
          setRespEmail('');
          setRespRelationship('Pai');
        }
      } else if (athleteToEdit.responsible_name) {
        const match = (responsibles || []).find(
          (r) =>
            r.name.toLowerCase().trim() === athleteToEdit.responsible_name?.toLowerCase().trim() ||
            (athleteToEdit.responsible_phone &&
              r.phone.replace(/\D/g, '') === athleteToEdit.responsible_phone.replace(/\D/g, ''))
        );
        if (match) {
          setRespMode('select');
          setSelectedRespId(match.id);
          setRespSearchQuery(match.name || '');
          setRespName(match.name || '');
          setRespPhone(formatPhone(match.phone) || '');
          setRespCpf(formatCPF(match.cpf) || '');
          setRespEmail(match.email || '');
          setRespRelationship(match.relationship || 'Pai');
        } else {
          setRespMode('new');
          setSelectedRespId('');
          setRespSearchQuery('');
          setRespName(athleteToEdit.responsible_name || '');
          setRespPhone(formatPhone(athleteToEdit.responsible_phone) || '');
          setRespCpf(formatCPF(athleteToEdit.responsible_cpf) || '');
          setRespEmail('');
          setRespRelationship('Pai');
        }
      } else {
        setRespMode('new');
        setSelectedRespId('');
        setRespSearchQuery('');
        setRespName('');
        setRespPhone('');
        setRespCpf('');
        setRespEmail('');
        setRespRelationship('Pai');
      }

      setCurrentClassId(athleteToEdit.current_class_id || athleteToEdit.class_id || '');
      setStatus(athleteToEdit.status || 'ATIVO');
      setEnrollmentDate(athleteToEdit.enrollment_date || new Date().toISOString().split('T')[0]);
      const initialFee = athleteToEdit.custom_monthly_fee ?? (athleteToEdit as any).monthly_fee ?? 180;
      setMonthlyFee(typeof initialFee === 'number' ? initialFee.toFixed(2).replace('.', ',') : String(initialFee));
      setFinancialCondition(athleteToEdit.financial_condition || 'PAGANTE_SEM_DESCONTO');
      setDiscountType(athleteToEdit.discount_type || 'FIXO');
      setDiscountValue(athleteToEdit.discount_value || 0);
      setDueDay(athleteToEdit.payment_due_day || 10);
      setUniformDelivered(athleteToEdit.uniform_delivered ?? true);
      setNotes(athleteToEdit.notes || '');

      setDuplicateAthlete(null);
      setDuplicateResponsible(null);
      setErrors({});
      setStagedDocuments([]);
    } else {
      // New athlete defaults
      setName('');
      setBirthDate('');
      setCpf('');
      setRg('');
      setPhone('');
      setPhotoUrl('');

      setCep('');
      setStreet('');
      setNumber('');
      setComplement('');
      setNeighborhood('');
      setCity('Recife');
      setState('PE');

      setRespMode('new');
      setSelectedRespId('');
      setRespSearchQuery('');
      setRespName('');
      setRespCpf('');
      setRespPhone('');
      setRespEmail('');
      setRespRelationship('Pai');

      setCurrentClassId(classes[0]?.id || '');
      setStatus('ATIVO');
      setEnrollmentDate(new Date().toISOString().split('T')[0]);
      setMonthlyFee('180,00');
      setFinancialCondition('PAGANTE_SEM_DESCONTO');
      setDiscountType('FIXO');
      setDiscountValue(0);
      setDueDay(10);
      setUniformDelivered(true);
      setNotes('');

      setDuplicateAthlete(null);
      setDuplicateResponsible(null);
      setErrors({});
      setActiveTab('bloco1');
      setStagedDocuments([]);
    }
  }, [athleteToEdit, classes]);

  // Live calculation of effective monthly fee and discounts for preview and batch generation
  const effectiveFeePreview = useMemo(() => {
    const cleaned = String(monthlyFee || '').replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
    const base = isNaN(parseFloat(cleaned)) || parseFloat(cleaned) < 0 ? 0 : parseFloat(cleaned);

    if (financialCondition === 'BOLSA_INTEGRAL') {
      return {
        base,
        discount: base,
        finalAmount: 0,
        label: 'Bolsa Integral (100% isento)',
      };
    }

    if (financialCondition === 'PAGANTE_COM_DESCONTO') {
      let disc = 0;
      if (discountType === 'PERCENTUAL' && discountValue) {
        disc = (base * discountValue) / 100;
      } else if (discountValue) {
        disc = Number(discountValue) || 0;
      }
      const finalAmount = Math.max(0, base - disc);
      return {
        base,
        discount: disc,
        finalAmount,
        label: `Desconto de ${discountType === 'PERCENTUAL' ? `${discountValue}%` : `R$ ${Number(discountValue).toFixed(2)}`}`,
      };
    }

    return {
      base,
      discount: 0,
      finalAmount: base,
      label: 'Integral (sem desconto)',
    };
  }, [monthlyFee, financialCondition, discountType, discountValue]);

  // Read file as base64 Data URL (persists permanently without dead blob URLs)
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedPhotoFile(file);
      const dataUrl = await readFileAsDataUrl(file);
      if (dataUrl) {
        setPhotoUrl(dataUrl);
      }
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    setSelectedPhotoFile(null);
  };

  const handleAddFiles = async (
    files: FileList | File[],
    type: AthleteDocument['file_type'] = 'RG_CPF'
  ) => {
    const list = Array.from(files);
    const newDocs: StagedDocument[] = [];

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const dataUrl = await readFileAsDataUrl(file);
      newDocs.push({
        id: `staged-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
        file,
        file_name: file.name,
        file_type: type,
        file_size: formatFileSize(file.size),
        file_url: dataUrl,
      });
    }

    setStagedDocuments((prev) => [...prev, ...newDocs]);
  };

  const handleRemoveStagedDoc = (docId: string) => {
    setStagedDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleDownloadDoc = (doc: { file_name: string; file_url?: string; file_type?: string }) => {
    try {
      if (doc.file_url) {
        if (doc.file_url.startsWith('data:')) {
          const link = document.createElement('a');
          link.href = doc.file_url;
          link.download = doc.file_name || 'documento';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast(`Download de "${doc.file_name}" concluído!`, 'success');
        } else {
          fetch(doc.file_url)
            .then((res) => res.blob())
            .then((blob) => {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = doc.file_name || 'documento';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
              showToast(`Download de "${doc.file_name}" concluído!`, 'success');
            })
            .catch(() => {
              const link = document.createElement('a');
              link.href = doc.file_url!;
              link.download = doc.file_name || 'documento';
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              showToast(`Download de "${doc.file_name}" iniciado!`, 'success');
            });
        }
      } else {
        const content = `CENTAURO - CENTRO DE FORMAÇÃO\n\nDocumento: ${doc.file_name}\nTipo: ${doc.file_type || 'Documento Geral'}\nData de Registro: ${new Date().toLocaleDateString('pt-BR')}\n`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.file_name.endsWith('.txt') || doc.file_name.endsWith('.pdf') ? doc.file_name : `${doc.file_name}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast(`Download de "${doc.file_name}" gerado com sucesso!`, 'success');
      }
    } catch (err) {
      console.error('Download error:', err);
      showToast('Erro ao realizar download.', 'error');
    }
  };

  const handleSelectResponsible = (respId: string) => {
    setSelectedRespId(respId);
    setIsRespDropdownOpen(false);
    if (errors.selectedRespId) setErrors({ ...errors, selectedRespId: '' });
    if (respId) {
      const resp = (responsibles || []).find((r) => r.id === respId);
      if (resp) {
        setRespSearchQuery(resp.name || '');
        setRespName(resp.name || '');
        setRespPhone(formatPhone(resp.phone) || '');
        setRespCpf(formatCPF(resp.cpf) || '');
        setRespEmail(resp.email || '');
        setRespRelationship(resp.relationship || 'Pai');
      }
    }
  };

  const handleClearSelectedResponsible = () => {
    setSelectedRespId('');
    setRespSearchQuery('');
    setRespName('');
    setRespPhone('');
    setRespCpf('');
    setRespEmail('');
    setRespRelationship('Pai');
    setIsRespDropdownOpen(true);
  };

  const handleCreateNewWithTypedName = () => {
    setRespMode('new');
    setSelectedRespId('');
    setRespName(respSearchQuery.trim());
    setIsRespDropdownOpen(false);
  };

  const handleQuickSaveResponsible = () => {
    if (!respName.trim()) {
      showToast('O nome do responsável é obrigatório.', 'error');
      return;
    }
    if (!respPhone.trim()) {
      showToast('O telefone do responsável é obrigatório.', 'error');
      return;
    }

    const targetId = selectedRespId || athleteToEdit?.responsible_id;
    if (targetId) {
      updateResponsible(targetId, {
        name: respName.trim(),
        phone: formatPhone(respPhone),
        cpf: formatCPF(respCpf) || undefined,
        email: respEmail.trim() || undefined,
        relationship: respRelationship,
      });
      showToast('Dados do responsável atualizados com sucesso!', 'success');
    } else {
      const fullAddress = [
        street ? `${street}${number ? `, ${number}` : ''}` : '',
        complement,
        neighborhood,
        city && state ? `${city} - ${state}` : city,
        cep ? `CEP: ${cep}` : '',
      ]
        .filter(Boolean)
        .join(', ');

      const newResp = addResponsible({
        name: respName.trim(),
        phone: formatPhone(respPhone),
        cpf: formatCPF(respCpf) || undefined,
        email: respEmail.trim() || undefined,
        relationship: respRelationship,
        address: fullAddress || undefined,
      });
      setSelectedRespId(newResp.id);
      setRespMode('select');
      showToast('Responsável cadastrado e vinculado com sucesso!', 'success');
    }
  };

  // Check duplicate athlete on blur
  const handleCheckAthleteDuplicate = () => {
    if (!athleteToEdit && (cpf || (name && birthDate))) {
      const dup = checkDuplicateAthlete(cpf, name, birthDate);
      setDuplicateAthlete(dup);
    }
  };

  // Check duplicate responsible on blur
  const handleCheckRespDuplicate = () => {
    if (respMode === 'new' && (respCpf || (respName && respPhone))) {
      const dup = checkDuplicateResponsible(respCpf, respName, respPhone);
      setDuplicateResponsible(dup);
      if (dup && !selectedRespId) {
        // Can offer user to switch
      }
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Nome completo é obrigatório';
    if (!birthDate) newErrors.birthDate = 'Data de nascimento é obrigatória';

    if (respMode === 'select' && !selectedRespId) {
      newErrors.selectedRespId = 'Selecione um responsável já cadastrado';
    }

    if (respMode === 'new') {
      if (!respName.trim()) newErrors.respName = 'Nome do responsável é obrigatório';
      if (!respPhone.trim()) newErrors.respPhone = 'Telefone do responsável é obrigatório';
    }

    if (!currentClassId) newErrors.currentClassId = 'Selecione a turma oficial do atleta';
    if (!enrollmentDate) newErrors.enrollmentDate = 'Data de matrícula é obrigatória';
    const cleanedFee = String(monthlyFee || '').replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
    if (!cleanedFee) {
      newErrors.monthlyFee = 'Informe o valor da mensalidade';
    } else if (isNaN(Number(cleanedFee)) || Number(cleanedFee) < 0) {
      newErrors.monthlyFee = 'Informe um valor numérico válido';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      if (newErrors.name || newErrors.birthDate) {
        setActiveTab('bloco1');
      } else if (newErrors.selectedRespId || newErrors.respName || newErrors.respPhone) {
        setActiveTab('bloco3');
      } else if (newErrors.currentClassId || newErrors.enrollmentDate || newErrors.monthlyFee) {
        setActiveTab('bloco4');
      }
      return false;
    }

    return true;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const cleanedFee = String(monthlyFee || '').replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
      const parsedMonthlyFee = !isNaN(parseFloat(cleanedFee)) && parseFloat(cleanedFee) >= 0 ? parseFloat(cleanedFee) : 180;

      const fullAddress = [
        street ? `${street}${number ? `, ${number}` : ''}` : '',
        complement,
        neighborhood,
        city && state ? `${city} - ${state}` : city,
        cep ? `CEP: ${cep}` : '',
      ]
        .filter(Boolean)
        .join(', ');

      const targetAthleteId = athleteToEdit ? athleteToEdit.id : `a-${Date.now()}`;

      // Upload photo to Supabase Storage if a new file was selected
      let finalPhotoUrl = photoUrl;
      if (selectedPhotoFile) {
        try {
          const uploadRes = await uploadAthletePhoto(targetAthleteId, selectedPhotoFile);
          if (uploadRes.success && uploadRes.url) {
            finalPhotoUrl = uploadRes.url;
          }
        } catch (e) {
          console.warn('Storage upload photo notice:', e);
        }
      }

      let savedAthleteResult: Athlete;

      if (athleteToEdit) {
        // Edit existing athlete
        let targetResponsibleId = respMode === 'select' ? selectedRespId : athleteToEdit.responsible_id;

        if (respMode === 'select' && selectedRespId) {
          updateResponsible(selectedRespId, {
            name: respName.trim(),
            phone: formatPhone(respPhone),
            cpf: formatCPF(respCpf) || undefined,
            email: respEmail.trim() || undefined,
            relationship: respRelationship,
          });
        } else if (respMode === 'new') {
          if (athleteToEdit.responsible_id) {
            updateResponsible(athleteToEdit.responsible_id, {
              name: respName.trim(),
              phone: formatPhone(respPhone),
              cpf: formatCPF(respCpf) || undefined,
              email: respEmail.trim() || undefined,
              relationship: respRelationship,
            });
            targetResponsibleId = athleteToEdit.responsible_id;
          } else if (respName.trim()) {
            const newResp = addResponsible({
              name: respName.trim(),
              phone: formatPhone(respPhone),
              cpf: formatCPF(respCpf) || undefined,
              email: respEmail.trim() || undefined,
              relationship: respRelationship,
              address: fullAddress || undefined,
            });
            targetResponsibleId = newResp.id;
          }
        }

        updateAthlete(athleteToEdit.id, {
          name: name.trim(),
          birth_date: birthDate,
          cpf: formatCPF(cpf) || undefined,
          rg: rg.trim() || undefined,
          phone: formatPhone(phone) || undefined,
          photo_url: finalPhotoUrl || undefined,
          address: fullAddress || undefined,
          address_street: street.trim() || undefined,
          address_number: number.trim() || undefined,
          address_complement: complement.trim() || undefined,
          address_neighborhood: neighborhood.trim() || undefined,
          address_city: city.trim() || undefined,
          address_state: state.trim() || undefined,
          address_zip: formatCEP(cep) || undefined,
          responsible_id: targetResponsibleId,
          responsible_name: respName.trim() || undefined,
          responsible_phone: formatPhone(respPhone) || undefined,
          current_class_id: currentClassId,
          class_id: currentClassId,
          status,
          enrollment_date: enrollmentDate,
          financial_condition: financialCondition,
          custom_monthly_fee: parsedMonthlyFee,
          monthly_fee: parsedMonthlyFee,
          discount_type: financialCondition === 'PAGANTE_COM_DESCONTO' ? discountType : null,
          discount_value: financialCondition === 'PAGANTE_COM_DESCONTO' ? Number(discountValue) : 0,
          payment_due_day: Number(dueDay),
          uniform_delivered: uniformDelivered,
          notes: notes.trim() || undefined,
        });

        // Save staged documents with upload to Supabase Storage
        if (stagedDocuments.length > 0) {
          for (const doc of stagedDocuments) {
            let finalDocUrl = doc.file_url;
            if (doc.file) {
              try {
                const uploadRes = await uploadAthleteDocument(targetAthleteId, doc.file_name, doc.file);
                if (uploadRes.success && uploadRes.url) {
                  finalDocUrl = uploadRes.url;
                }
              } catch (e) {
                console.warn('Storage upload document notice:', e);
              }
            }
            addDocument({
              athlete_id: athleteToEdit.id,
              file_name: doc.file_name,
              file_type: doc.file_type,
              file_size: doc.file_size,
              file_url: finalDocUrl,
              notes: doc.notes,
            });
          }
        }

        savedAthleteResult = {
          ...athleteToEdit,
          name: name.trim(),
          birth_date: birthDate,
          current_class_id: currentClassId,
          class_id: currentClassId,
          custom_monthly_fee: parsedMonthlyFee,
          monthly_fee: parsedMonthlyFee,
          photo_url: finalPhotoUrl || undefined,
        };
      } else {
        // Create new athlete
        const responsiblePayload =
          respMode === 'new'
            ? {
                name: respName.trim(),
                cpf: formatCPF(respCpf),
                phone: formatPhone(respPhone),
                email: respEmail.trim() || undefined,
                relationship: respRelationship,
                address: fullAddress || undefined,
              }
            : undefined;

        const result = addAthlete(
          {
            id: targetAthleteId,
            name: name.trim(),
            birth_date: birthDate,
            cpf: formatCPF(cpf),
            rg: rg.trim() || undefined,
            phone: formatPhone(phone) || undefined,
            photo_url: finalPhotoUrl || undefined,
            address: fullAddress || undefined,
            address_street: street.trim() || undefined,
            address_number: number.trim() || undefined,
            address_complement: complement.trim() || undefined,
            address_neighborhood: neighborhood.trim() || undefined,
            address_city: city.trim() || undefined,
            address_state: state.trim() || undefined,
            address_zip: formatCEP(cep) || undefined,
            responsible_id: respMode === 'select' ? selectedRespId : '',
            current_class_id: currentClassId,
            class_id: currentClassId,
            status,
            enrollment_date: enrollmentDate,
            financial_condition: financialCondition,
            custom_monthly_fee: parsedMonthlyFee,
            monthly_fee: parsedMonthlyFee,
            discount_type: financialCondition === 'PAGANTE_COM_DESCONTO' ? discountType : null,
            discount_value: financialCondition === 'PAGANTE_COM_DESCONTO' ? Number(discountValue) : 0,
            payment_due_day: Number(dueDay),
            uniform_delivered: uniformDelivered,
            notes: notes.trim() || undefined,
          },
          responsiblePayload
        );

        if (result?.athlete && stagedDocuments.length > 0) {
          for (const doc of stagedDocuments) {
            let finalDocUrl = doc.file_url;
            if (doc.file) {
              try {
                const uploadRes = await uploadAthleteDocument(targetAthleteId, doc.file_name, doc.file);
                if (uploadRes.success && uploadRes.url) {
                  finalDocUrl = uploadRes.url;
                }
              } catch (e) {
                console.warn('Storage upload document notice:', e);
              }
            }
            addDocument({
              athlete_id: result.athlete.id,
              file_name: doc.file_name,
              file_type: doc.file_type,
              file_size: doc.file_size,
              file_url: finalDocUrl,
              notes: doc.notes,
            });
          }
        }

        savedAthleteResult = result.athlete;
      }

      onSuccess(savedAthleteResult);
    } catch (err) {
      console.error('Error saving athlete:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-700 transition-colors mb-1 cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Voltar</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <User className="text-blue-600" size={26} />
            {athleteToEdit ? `Editar Atleta: ${athleteToEdit.name}` : 'Cadastrar Novo Atleta'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {athleteToEdit
              ? 'Atualize os dados pessoais, turma, financeiro ou documentos do atleta.'
              : 'Preencha o formulário para matricular e cadastrar um novo atleta no CT Caxangá.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            leftIcon={<Save size={15} />}
          >
            {athleteToEdit ? 'Salvar Alterações' : 'Concluir Cadastro'}
          </Button>
        </div>
      </div>

      {/* Duplicate Warning */}
      {duplicateAthlete && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 shadow-2xs">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="font-bold">Aviso de Atleta Duplicado</h4>
            <p className="mt-0.5">
              Já existe um atleta cadastrado com dados semelhantes:{' '}
              <strong className="text-amber-950">{duplicateAthlete.name}</strong> (CPF:{' '}
              {duplicateAthlete.cpf || 'Não inf.'}, Nasc:{' '}
              {formatDateBR(duplicateAthlete.birth_date)}). Verifique se não se trata do mesmo aluno.
            </p>
          </div>
        </div>
      )}

      {/* Step Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {(
          [
            { id: 'bloco1', label: '1. Identificação & Foto', icon: User },
            { id: 'bloco2', label: '2. Endereço Residencial', icon: MapPin },
            { id: 'bloco3', label: '3. Responsável Legal', icon: Users },
            { id: 'bloco4', label: '4. Turma & Financeiro', icon: CreditCard },
            {
              id: 'bloco5',
              label: `5. Documentos & Anexos (${
                stagedDocuments.length +
                (athleteToEdit
                  ? (documents || []).filter((d) => d.athlete_id === athleteToEdit.id).length
                  : 0)
              })`,
              icon: FileText,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Form Body */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6">
        {/* ======================================================== */}
        {/* BLOCO 1 — IDENTIFICAÇÃO & FOTO */}
        {/* ======================================================== */}
        {activeTab === 'bloco1' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Photo & Basic Identity */}
            <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div className="relative group shrink-0">
                <AthleteAvatar
                  photoUrl={photoUrl}
                  name={name || 'Atleta'}
                  size="xl"
                  bordered
                  className="w-24 h-24 shadow-md bg-white"
                />

                {photoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-1.5 -right-1.5 w-7 h-7 bg-rose-600 text-white rounded-full flex items-center justify-center hover:bg-rose-700 shadow-sm cursor-pointer"
                    title="Remover foto"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-1">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Foto Oficial do Aluno
                </label>
                <p className="text-xs text-slate-500 max-w-md">
                  Envie uma foto nítida do rosto para a carteirinha e perfil digital. O arquivo é salvo com segurança e exibido sem falhas.
                </p>
                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:border-blue-500 rounded-xl text-xs font-bold text-slate-700 cursor-pointer transition-colors shadow-2xs">
                    <Upload size={14} className="text-blue-600" />
                    <span>{photoUrl ? 'Substituir Foto' : 'Selecionar Foto'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="athlete_name_input"
                label="Nome Completo do Aluno *"
                required
                placeholder="Ex: Gabriel Lucas de Oliveira"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                onBlur={handleCheckAthleteDuplicate}
                error={errors.name}
              />

              <Input
                id="athlete_birth_input"
                label="Data de Nascimento *"
                type="date"
                required
                value={birthDate}
                onChange={(e) => {
                  setBirthDate(e.target.value);
                  if (errors.birthDate) setErrors({ ...errors, birthDate: '' });
                }}
                onBlur={handleCheckAthleteDuplicate}
                error={errors.birthDate}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                id="athlete_cpf_input"
                label="CPF do Aluno"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                onBlur={handleCheckAthleteDuplicate}
                helperText="Opcional se ainda não possuir"
              />

              <Input
                id="athlete_rg_input"
                label="RG ou Certidão de Nascimento"
                placeholder="Ex: 54.321.987-X"
                value={rg}
                onChange={(e) => setRg(e.target.value)}
              />

              <Input
                id="athlete_phone_input"
                label="Telefone do Aluno (Opcional)"
                placeholder="(81) 98888-8888"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <Button type="button" variant="primary" onClick={() => setActiveTab('bloco2')}>
                Avançar para Endereço →
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* BLOCO 2 — ENDEREÇO */}
        {/* ======================================================== */}
        {activeTab === 'bloco2' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                id="addr_cep_input"
                label="CEP"
                placeholder="50000-000"
                value={cep}
                onChange={(e) => setCep(formatCEP(e.target.value))}
              />

              <div className="sm:col-span-2">
                <Input
                  id="addr_street_input"
                  label="Logradouro / Rua / Avenida"
                  placeholder="Ex: Rua Emiliano Braga"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                id="addr_num_input"
                label="Número"
                placeholder="Ex: 510"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />

              <div className="sm:col-span-2">
                <Input
                  id="addr_comp_input"
                  label="Complemento"
                  placeholder="Ex: Apto 302, Bloco B"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                id="addr_neigh_input"
                label="Bairro"
                placeholder="Ex: Várzea / Caxangá"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
              />

              <Input
                id="addr_city_input"
                label="Cidade"
                placeholder="Recife"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />

              <Input
                id="addr_uf_input"
                label="Estado (UF)"
                placeholder="PE"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
              />
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setActiveTab('bloco1')}>
                ← Voltar
              </Button>
              <Button type="button" variant="primary" onClick={() => setActiveTab('bloco3')}>
                Avançar para Responsável →
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* BLOCO 3 — RESPONSÁVEL */}
        {/* ======================================================== */}
        {activeTab === 'bloco3' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Responsible Selection Mode Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl max-w-lg w-full">
                <button
                  type="button"
                  onClick={() => setRespMode('select')}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    respMode === 'select'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Vincular Responsável Existente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRespMode('new');
                    setSelectedRespId('');
                  }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    respMode === 'new'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cadastrar Novo Responsável
                </button>
              </div>

              {selectedRespId && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl self-start sm:self-auto flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  Responsável Vinculado
                </span>
              )}
            </div>

            {/* If Select Mode, show live searchable combobox + selected card */}
            {respMode === 'select' && (
              <div className="space-y-4">
                {/* 1. Selected Responsible Card (if one is currently selected) */}
                {(() => {
                  const selectedResp = (responsibles || []).find((r) => r.id === selectedRespId);
                  if (!selectedResp) return null;

                  const otherAthletes = (athletes || []).filter(
                    (a) => a.responsible_id === selectedResp.id && (!athleteToEdit || a.id !== athleteToEdit.id)
                  );

                  return (
                    <div className="bg-gradient-to-r from-blue-50/80 to-slate-50 border border-blue-200/90 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs shadow-blue-600/30">
                          {selectedResp.name ? selectedResp.name.substring(0, 2).toUpperCase() : <UserCheck size={20} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 truncate">{selectedResp.name}</h4>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check size={11} />
                              Responsável Selecionado
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                            <span><strong>CPF:</strong> {formatCPF(selectedResp.cpf) || 'Não informado'}</span>
                            <span>•</span>
                            <span><strong>WhatsApp:</strong> {formatPhone(selectedResp.phone)}</span>
                            {selectedResp.email && (
                              <>
                                <span>•</span>
                                <span><strong>E-mail:</strong> {selectedResp.email}</span>
                              </>
                            )}
                            <span>•</span>
                            <span><strong>Parentesco:</strong> {selectedResp.relationship || 'Responsável'}</span>
                          </div>

                          {otherAthletes.length > 0 && (
                            <p className="text-[11px] text-blue-700 mt-1.5 font-medium flex items-center gap-1.5">
                              <Users size={13} className="shrink-0" />
                              <span>
                                Também responsável por: <strong>{otherAthletes.map((a) => a.name).join(', ')}</strong>
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <button
                          type="button"
                          onClick={() => setIsRespDropdownOpen((prev) => !prev)}
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-400 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <Search size={13} />
                          <span>Trocar Responsável</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleClearSelectedResponsible}
                          className="px-2.5 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xl transition-colors cursor-pointer text-xs font-semibold"
                          title="Desvincular responsável atual"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. Searchable Input & Autocomplete Dropdown */}
                {(!selectedRespId || isRespDropdownOpen) && (
                  <div className="relative" ref={respDropdownRef}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        {selectedRespId
                          ? 'Pesquisar Outro Responsável por Nome, CPF ou Telefone'
                          : 'Digite o Nome do Responsável Cadastrado para Vincular *'}
                      </label>
                      {selectedRespId && (
                        <button
                          type="button"
                          onClick={() => setIsRespDropdownOpen(false)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                        >
                          Fechar busca
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Search size={16} />
                      </div>
                      <input
                        type="text"
                        value={respSearchQuery}
                        onChange={(e) => {
                          setRespSearchQuery(e.target.value);
                          setIsRespDropdownOpen(true);
                        }}
                        onFocus={() => setIsRespDropdownOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (filteredResponsibles.length > 0) {
                              handleSelectResponsible(filteredResponsibles[0].id);
                            }
                          }
                        }}
                        placeholder="Digite o nome do responsável cadastrado (ex: Carlos, Mariana), CPF ou WhatsApp..."
                        className={`w-full pl-10 pr-20 py-2.5 bg-white border rounded-xl text-xs text-slate-800 placeholder-slate-400 transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                          errors.selectedRespId ? 'border-red-400 bg-red-50/20' : 'border-slate-300'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
                        {respSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setRespSearchQuery('');
                              setIsRespDropdownOpen(true);
                            }}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                            title="Limpar texto digitado"
                          >
                            <X size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsRespDropdownOpen((prev) => !prev)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                          title="Abrir/fechar lista"
                        >
                          <ChevronDown
                            size={15}
                            className={`transition-transform duration-200 ${
                              isRespDropdownOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {errors.selectedRespId && (
                      <p className="text-[11px] text-red-500 font-semibold mt-1">{errors.selectedRespId}</p>
                    )}

                    <p className="text-[11px] text-slate-500 mt-1">
                      💡 <strong>Dica:</strong> Basta digitar as primeiras letras do nome para filtrar a lista instantaneamente, sem precisar rolar uma lista extensa.
                    </p>

                    {/* Floating Dropdown */}
                    {isRespDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="p-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            {respSearchQuery.trim()
                              ? `${filteredResponsibles.length} responsável(is) encontrado(s) para "${respSearchQuery.trim()}"`
                              : 'Sugestões de responsáveis (ordem alfabética):'}
                          </span>
                          <span className="text-[10px] text-slate-400">Total na base: {responsibles.length}</span>
                        </div>

                        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                          {filteredResponsibles.length === 0 ? (
                            <div className="p-5 text-center space-y-3">
                              <p className="text-xs text-slate-600 font-medium">
                                Nenhum responsável encontrado com o termo <strong>"{respSearchQuery}"</strong>.
                              </p>
                              {respSearchQuery.trim() && (
                                <button
                                  type="button"
                                  onClick={handleCreateNewWithTypedName}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                                >
                                  <UserPlus size={14} />
                                  <span>Cadastrar Novo Responsável como "{respSearchQuery.trim()}"</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            filteredResponsibles.map((r) => {
                              const isSelected = selectedRespId === r.id;
                              const otherAthletes = (athletes || []).filter((a) => a.responsible_id === r.id);

                              return (
                                <div
                                  key={r.id}
                                  onClick={() => handleSelectResponsible(r.id)}
                                  className={`p-3 flex items-center justify-between gap-3 hover:bg-blue-50/70 transition-colors cursor-pointer ${
                                    isSelected ? 'bg-blue-50/90 border-l-4 border-l-blue-600' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {r.name ? r.name.substring(0, 2).toUpperCase() : 'RP'}
                                    </div>

                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-900 truncate">
                                          {r.name}
                                        </span>
                                        {isSelected && (
                                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-md">
                                            Vinculado
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
                                        <span>CPF: {formatCPF(r.cpf) || 'Não informado'}</span>
                                        <span>•</span>
                                        <span>WhatsApp: {formatPhone(r.phone)}</span>
                                        <span>•</span>
                                        <span className="text-slate-400">{r.relationship || 'Responsável'}</span>
                                      </div>
                                      {otherAthletes.length > 0 && (
                                        <p className="text-[10px] text-blue-600 font-semibold mt-0.5 truncate">
                                          Atleta(s): {otherAthletes.map((a) => a.name).join(', ')}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="shrink-0 text-right">
                                    <span className="text-[11px] font-bold text-blue-600 hover:underline">
                                      {isSelected ? 'Selecionado ✓' : 'Vincular →'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Duplicate warning for new resp */}
            {respMode === 'new' && duplicateResponsible && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-900">
                <div>
                  <strong>Responsável semelhante identificado:</strong> {duplicateResponsible.name} ({formatPhone(duplicateResponsible.phone)}).
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedRespId(duplicateResponsible.id);
                    setRespMode('select');
                    handleSelectResponsible(duplicateResponsible.id);
                  }}
                >
                  Usar Este
                </Button>
              </div>
            )}

            {/* Editable fields container - ALWAYS available so user can edit */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <User size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {respMode === 'select'
                        ? 'Editar Informações do Responsável Vinculado'
                        : 'Dados Cadastrais do Novo Responsável'}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {respMode === 'select'
                        ? 'Você pode não só vincular, mas também editar nome, WhatsApp, CPF, e-mail e parentesco diretamente aqui.'
                        : 'Preencha os dados do novo responsável legal do atleta.'}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-blue-700 border-blue-300 hover:bg-blue-50 text-[11px] self-start sm:self-center"
                  onClick={handleQuickSaveResponsible}
                  leftIcon={<Save size={13} />}
                >
                  Salvar Dados do Responsável
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="resp_name_input"
                  label="Nome Completo do Responsável *"
                  required
                  placeholder="Ex: Luciana Carneiro Germano"
                  value={respName}
                  onChange={(e) => {
                    setRespName(e.target.value);
                    if (errors.respName) setErrors({ ...errors, respName: '' });
                  }}
                  onBlur={handleCheckRespDuplicate}
                  error={errors.respName}
                />

                <Input
                  id="resp_phone_input"
                  label="Telefone / WhatsApp *"
                  required
                  placeholder="(81) 98618-8006"
                  value={respPhone}
                  onChange={(e) => {
                    setRespPhone(formatPhone(e.target.value));
                    if (errors.respPhone) setErrors({ ...errors, respPhone: '' });
                  }}
                  onBlur={handleCheckRespDuplicate}
                  error={errors.respPhone}
                />
              </div>

              {respMode === 'new' && typedNameMatches.length > 0 && (
                <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                  <p className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                    <Users size={14} className="text-blue-600" />
                    <span>Encontramos responsável cadastrado com nome semelhante. Deseja vincular diretamente?</span>
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {typedNameMatches.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setRespMode('select');
                          handleSelectResponsible(m.id);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-blue-100/80 border border-blue-300 text-blue-900 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                      >
                        <span>{m.name} {m.phone ? `(${formatPhone(m.phone)})` : ''}</span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                          Vincular Este →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  id="resp_cpf_input"
                  label="CPF do Responsável"
                  placeholder="000.000.000-00"
                  value={respCpf}
                  onChange={(e) => setRespCpf(formatCPF(e.target.value))}
                  onBlur={handleCheckRespDuplicate}
                />

                <Input
                  id="resp_email_input"
                  label="E-mail (Opcional)"
                  type="email"
                  placeholder="responsavel@email.com"
                  value={respEmail}
                  onChange={(e) => setRespEmail(e.target.value)}
                />

                <Select
                  id="resp_rel_select"
                  label="Parentesco / Vínculo *"
                  value={respRelationship}
                  onChange={(e) => setRespRelationship(e.target.value)}
                  options={[
                    { value: 'Pai', label: 'Pai' },
                    { value: 'Mãe', label: 'Mãe' },
                    { value: 'Avô / Avó', label: 'Avô / Avó' },
                    { value: 'Tio / Tia', label: 'Tio / Tia' },
                    { value: 'Tutor(a) Legal', label: 'Tutor(a) Legal' },
                    { value: 'Outro', label: 'Outro' },
                  ]}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setActiveTab('bloco2')}>
                ← Voltar
              </Button>
              <Button type="button" variant="primary" onClick={() => setActiveTab('bloco4')}>
                Avançar para Turma & Financeiro →
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* BLOCO 4 — TURMA & CONDIÇÃO FINANCEIRA */}
        {/* ======================================================== */}
        {activeTab === 'bloco4' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                id="ath_class_select"
                label="Turma Oficial do Aluno *"
                required
                value={currentClassId}
                onChange={(e) => {
                  setCurrentClassId(e.target.value);
                  if (errors.currentClassId) setErrors({ ...errors, currentClassId: '' });
                }}
                error={errors.currentClassId}
                options={[
                  { value: '', label: 'Selecione a turma...' },
                  ...(classes || []).map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.category} - ${(c.schedule_days || []).join('/')} às ${c.schedule_time})`,
                  })),
                ]}
              />

              <Select
                id="ath_status_select"
                label="Situação Cadastral *"
                required
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                options={[
                  { value: 'ATIVO', label: 'ATIVO' },
                  { value: 'DESLIGADO', label: 'DESLIGADO' },
                  { value: 'INATIVO', label: 'INATIVO' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                id="ath_monthly_fee"
                label="Valor da Mensalidade (R$) *"
                type="text"
                required
                placeholder="Ex: 180,00"
                value={monthlyFee}
                onChange={(e) => {
                  setMonthlyFee(e.target.value);
                  if (errors.monthlyFee) setErrors({ ...errors, monthlyFee: '' });
                }}
                error={errors.monthlyFee}
              />

              <Select
                id="ath_fin_cond"
                label="Condição Financeira *"
                required
                value={financialCondition}
                onChange={(e) => setFinancialCondition(e.target.value as any)}
                options={[
                  { value: 'PAGANTE_SEM_DESCONTO', label: 'Pagante sem Desconto (Integral)' },
                  { value: 'PAGANTE_COM_DESCONTO', label: 'Pagante com Desconto / Parcial' },
                  { value: 'BOLSA_INTEGRAL', label: 'Bolsa Integral (100% Isento)' },
                ]}
              />

              <Select
                id="ath_due_day"
                label="Dia de Vencimento Mensal *"
                required
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                options={[
                  { value: 5, label: 'Dia 05 de cada mês' },
                  { value: 10, label: 'Dia 10 de cada mês' },
                  { value: 15, label: 'Dia 15 de cada mês' },
                  { value: 20, label: 'Dia 20 de cada mês' },
                  { value: 25, label: 'Dia 25 de cada mês' },
                  { value: 30, label: 'Dia 30 de cada mês' },
                ]}
              />

              <Input
                id="ath_enroll_date"
                label="Data da Matrícula *"
                type="date"
                required
                value={enrollmentDate}
                onChange={(e) => {
                  setEnrollmentDate(e.target.value);
                  if (errors.enrollmentDate) setErrors({ ...errors, enrollmentDate: '' });
                }}
                error={errors.enrollmentDate}
              />
            </div>

            {/* Live calculation banner for monthly fee and batch generation preview */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-emerald-950">
                <CreditCard size={18} className="text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">Valor Base Cadastrado: </span>
                  <span className="font-extrabold">{formatCurrency(effectiveFeePreview.base)}</span>
                  {effectiveFeePreview.discount > 0 && (
                    <span className="text-amber-800 ml-2 font-medium">
                      ({effectiveFeePreview.label} → -{formatCurrency(effectiveFeePreview.discount)})
                    </span>
                  )}
                  {financialCondition === 'BOLSA_INTEGRAL' && (
                    <span className="text-emerald-700 ml-2 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                      Bolsa 100% (Isento)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 text-[11px] font-medium">Valor individual gerado em lote:</span>
                <span className="font-black text-sm text-emerald-800 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 shadow-2xs">
                  {formatCurrency(effectiveFeePreview.finalAmount)}
                </span>
              </div>
            </div>

            {financialCondition === 'PAGANTE_COM_DESCONTO' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
                <Select
                  id="ath_discount_type"
                  label="Tipo de Desconto"
                  value={discountType || 'FIXO'}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  options={[
                    { value: 'FIXO', label: 'Valor Fixo (Ex: R$ 30,00)' },
                    { value: 'PERCENTUAL', label: 'Percentual (Ex: 20%)' },
                    { value: 'PONTUALIDADE', label: 'Desconto por Pontualidade' },
                  ]}
                />

                <Input
                  id="ath_discount_val"
                  label="Valor / % do Desconto"
                  type="number"
                  placeholder="30"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                id="ath_uniform_select"
                label="Kit de Uniforme Entregue?"
                value={uniformDelivered ? 'sim' : 'nao'}
                onChange={(e) => setUniformDelivered(e.target.value === 'sim')}
                options={[
                  { value: 'sim', label: 'Sim, uniforme entregue' },
                  { value: 'nao', label: 'Não entregue / Pendente' },
                ]}
              />

              <div className="sm:col-span-2">
                <Input
                  id="ath_notes_input"
                  label="Observações / Restrições Médicas (Opcional)"
                  placeholder="Ex: Alergias, posição de preferência, recomendações..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setActiveTab('bloco3')}>
                ← Voltar
              </Button>
              <Button type="button" variant="primary" onClick={() => setActiveTab('bloco5')}>
                Avançar para Documentos →
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* BLOCO 5 — DOCUMENTAÇÃO & ANEXOS */}
        {/* ======================================================== */}
        {activeTab === 'bloco5' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="text-blue-600" size={18} />
                  <span>Documentação & Anexos Digitais</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Anexe RG, CPF, Certidão de Nascimento, Atestado Médico ou comprovante de residência.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-slate-600">Tipo padrão:</span>
                <select
                  value={docUploadType}
                  onChange={(e) => setDocUploadType(e.target.value as any)}
                  className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-hidden"
                >
                  <option value="RG_CPF">RG / CPF / Certidão</option>
                  <option value="ATESTADO_MEDICO">Atestado Médico</option>
                  <option value="COMPROVANTE_RESIDENCIA">Comprovante de Residência</option>
                  <option value="TERMO_MATRICULA">Termo de Matrícula</option>
                  <option value="OUTRO">Outro Documento</option>
                </select>
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingDoc(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDraggingDoc(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingDoc(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleAddFiles(e.dataTransfer.files, docUploadType);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                isDraggingDoc
                  ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
                  : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <UploadCloud size={24} />
              </div>
              <h5 className="text-xs font-bold text-slate-800">
                Arraste e solte os arquivos aqui, ou clique para selecionar
              </h5>
              <p className="text-[11px] text-slate-500 mt-1">
                Suporta cópias em PDF, JPG, PNG ou DOCX.
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                  <Plus size={14} />
                  <span>Escolher Arquivos</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/*,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleAddFiles(e.target.files, docUploadType);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Staged Docs List */}
            {stagedDocuments.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Arquivos prontos para salvar ({stagedDocuments.length}):
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {stagedDocuments.map((doc, idx) => (
                    <div
                      key={doc.id ? `${doc.id}-${idx}` : `staged-${idx}`}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileIcon size={16} className="text-blue-600 shrink-0" />
                        <div className="truncate">
                          <p className="font-bold text-slate-800 truncate">{doc.file_name}</p>
                          <p className="text-[10px] text-slate-400">{doc.file_size}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          onClick={() => handleDownloadDoc(doc)}
                          className="text-blue-700 border-blue-200 hover:bg-blue-50 text-[11px] py-1 px-2.5"
                          leftIcon={<Download size={13} />}
                        >
                          Baixar
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStagedDoc(doc.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remover anexo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Documents if editing */}
            {athleteToEdit && (() => {
              const existing = (documents || []).filter((d) => d.athlete_id === athleteToEdit.id);
              if (existing.length === 0) return null;

              return (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Documentos já arquivados no prontuário ({existing.length}):
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {existing.map((doc, idx) => (
                      <div
                        key={doc.id ? `${doc.id}-${idx}` : `existing-${idx}`}
                        className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText size={16} className="text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <p className="font-bold text-slate-800 truncate">{doc.file_name}</p>
                            <p className="text-[10px] text-slate-400">
                              {doc.file_type} • {formatDateBR(doc.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => handleDownloadDoc(doc)}
                            className="text-blue-700 border-blue-200 hover:bg-blue-50 text-[11px] py-1 px-2.5"
                            leftIcon={<Download size={13} />}
                          >
                            Baixar
                          </Button>
                          <button
                            type="button"
                            onClick={() => removeDocument(doc.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Excluir documento arquivado"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-between pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setActiveTab('bloco4')}>
                ← Voltar
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} leftIcon={<Save size={15} />}>
                {athleteToEdit ? 'Salvar Alterações' : 'Concluir Cadastro'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
