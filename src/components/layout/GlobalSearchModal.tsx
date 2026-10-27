import React, { useState } from 'react';
import { Search, X, Users, Calendar, ArrowRight, Layers, Award } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { normalizeSearchText } from '../../utils/formatters';

export const GlobalSearchModal: React.FC = () => {
  const {
    isGlobalSearchOpen,
    setIsGlobalSearchOpen,
    athletes = [],
    classes = [],
    leads = [],
    responsibles = [],
    setActiveModule,
    setSelectedAthleteId,
    setSelectedClassId,
  } = useApp();
  const [query, setQuery] = useState('');

  if (!isGlobalSearchOpen) return null;

  const qRaw = query.trim();
  const qNorm = normalizeSearchText(qRaw);
  const qDigits = qRaw.replace(/\D/g, '');

  const filteredAthletes = qNorm
    ? athletes
        .filter((a) => {
          const matchName = normalizeSearchText(a.name).includes(qNorm);
          const matchNick = normalizeSearchText(a.nickname).includes(qNorm);
          let matchCpf = false;
          if (qDigits.length > 0) {
            matchCpf = (a.cpf || '').replace(/\D/g, '').includes(qDigits);
          }
          const resp = (responsibles || []).find((r) => r.id === a.responsible_id);
          const matchResp =
            normalizeSearchText(a.responsible_name).includes(qNorm) ||
            normalizeSearchText(resp?.name).includes(qNorm);
          return matchName || matchNick || matchCpf || matchResp;
        })
        .slice(0, 5)
    : [];

  const filteredLeads = qNorm
    ? leads
        .filter((l) => {
          const matchLeadAthlete = normalizeSearchText(l.athlete_name).includes(qNorm);
          const matchLeadResp = normalizeSearchText(l.responsible_name).includes(qNorm);
          let matchLeadPhone = false;
          if (qDigits.length >= 2) {
            matchLeadPhone = (l.responsible_phone || '').replace(/\D/g, '').includes(qDigits);
          }
          return matchLeadAthlete || matchLeadResp || matchLeadPhone;
        })
        .slice(0, 5)
    : [];

  const filteredClasses = qNorm
    ? classes
        .filter((c) => {
          const matchClassName = normalizeSearchText(c.name).includes(qNorm);
          const matchClassCat = normalizeSearchText(c.category).includes(qNorm);
          const matchClassCoach = normalizeSearchText(c.coach_name).includes(qNorm);
          return matchClassName || matchClassCat || matchClassCoach;
        })
        .slice(0, 5)
    : [];

  const totalResults = filteredAthletes.length + filteredLeads.length + filteredClasses.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por atletas, interessados ou turmas..."
            className="w-full text-sm outline-none text-slate-800 placeholder-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer rounded-full hover:bg-slate-100"
              title="Limpar"
            >
              <X size={15} />
            </button>
          )}
          <button
            onClick={() => setIsGlobalSearchOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto space-y-4">
          {qNorm === '' ? (
            <div className="text-center py-8 text-slate-400 space-y-1">
              <Search size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Busca Rápida Global</p>
              <p className="text-[11px] text-slate-400">
                Digite o nome de um aluno, responsável, CPF, turma ou interessado.
              </p>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-8 text-slate-500 space-y-1">
              <p className="text-xs font-semibold text-slate-700">Nenhum resultado encontrado</p>
              <p className="text-[11px] text-slate-400">Não encontramos correspondências para "{query}".</p>
            </div>
          ) : (
            <>
              {filteredAthletes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Users size={12} className="text-blue-600" />
                      Atletas Cadastrados ({filteredAthletes.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {filteredAthletes.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => {
                          setSelectedAthleteId(a.id);
                          setActiveModule('atletas');
                          setIsGlobalSearchOpen(false);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-blue-50/70 border border-transparent hover:border-blue-100 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                            {a.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700 block truncate">
                              {a.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {a.class_name || 'Sem turma'} • Resp: {a.responsible_name || 'Não inf.'}
                            </span>
                          </div>
                        </div>
                        <ArrowRight size={13} className="text-slate-400 group-hover:text-blue-600 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredClasses.length > 0 && (
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Layers size={12} className="text-indigo-600" />
                      Turmas & Horários ({filteredClasses.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {filteredClasses.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          if (setSelectedClassId) setSelectedClassId(c.id);
                          setActiveModule('turmas');
                          setIsGlobalSearchOpen(false);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/70 border border-transparent hover:border-indigo-100 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                            <Layers size={14} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 block truncate">
                              {c.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {c.category} • {c.schedule_time || ''} • Prof: {c.coach_name || 'Comissão'}
                            </span>
                          </div>
                        </div>
                        <ArrowRight size={13} className="text-slate-400 group-hover:text-indigo-600 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {filteredLeads.length > 0 && (
                <div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 mb-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Calendar size={12} className="text-amber-600" />
                      Interessados / CRM ({filteredLeads.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {filteredLeads.map((l) => (
                      <div
                        key={l.id}
                        onClick={() => {
                          setActiveModule('interessados');
                          setIsGlobalSearchOpen(false);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50/70 border border-transparent hover:border-amber-100 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0">
                            <Calendar size={14} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-amber-700 block truncate">
                              {l.athlete_name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Resp: {l.responsible_name} • Tel: {l.responsible_phone}
                            </span>
                          </div>
                        </div>
                        <ArrowRight size={13} className="text-slate-400 group-hover:text-amber-600 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

