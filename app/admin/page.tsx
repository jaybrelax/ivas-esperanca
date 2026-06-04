'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomDatePicker } from '@/components/CustomDatePicker';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  Save, 
  UserPlus, 
  ChevronRight, 
  Eye, 
  Layout, 
  Lock,
  Clock,
  AlertTriangle,
  Sun,
  Moon
} from 'lucide-react';
import { 
  Evento, 
  ConfigMarca, 
  Participant,
  DEFAULT_CONFIG,
  fetchBrandingConfig, 
  saveBrandingConfig, 
  listAllEventos, 
  saveEvento, 
  deleteEvento, 
  getNextFridayDate,
  isSupabaseConfigured,
  generateId,
  formatDateBr,
  uploadImage
} from '@/lib/db';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'branding' | 'database'>('events');
  const [isDbConnected, setIsDbConnected] = useState(false);

  // Loaded database states
  const [events, setEvents] = useState<Evento[]>([]);
  const [config, setConfig] = useState<ConfigMarca>(DEFAULT_CONFIG);
  
  // Selected single event for guest list edit
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  // Adding new event states
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('20:00');
  const [showCreateEventForm, setShowCreateEventForm] = useState(false);
  const [showAddNomeForm, setShowAddNomeForm] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);

  // Brand config editing fields
  const [editTitulo, setEditTitulo] = useState('');
  const [editSubTitulo, setEditSubTitulo] = useState('');
  const [editTitulo2, setEditTitulo2] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editBannerUrl, setEditBannerUrl] = useState('');
  const [editCopyright, setEditCopyright] = useState('');
  const [editLightMode, setEditLightMode] = useState(false);

  // Password / lock passcode state
  const [passcode, setPasscode] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(true); // Default accessible in previews, can turn on passcode locker

  // Active event manual participant insertion
  const [adminAddNome, setAdminAddNome] = useState('');
  const [adminAddSexo, setAdminAddSexo] = useState<'M' | 'F'>('M');
  const [adminAddFixo, setAdminAddFixo] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'fixo' | 'M' | 'F'>('all');

  // Editing existing guest
  const [adminEditingParticipantId, setAdminEditingParticipantId] = useState<string | null>(null);
  const [adminEditNomeValue, setAdminEditNomeValue] = useState('');
  const [adminEditSexoValue, setAdminEditSexoValue] = useState<'M' | 'F'>('M');

  // Custom non-blocking confirmation dialog overlays
  const [deletingEvent, setDeletingEvent] = useState<{ id: string; numero: number } | null>(null);
  const [deletingParticipant, setDeletingParticipant] = useState<{ id: string; nome: string } | null>(null);

  // Toast notifications
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Upload image to Supabase Storage bucket "img"
  const handleImageUpload = async (file: File, setter: (url: string) => void) => {
    if (!file.type.startsWith('image/')) {
      showToast("Apenas arquivos de imagem são aceitos.", "error");
      return;
    }

    // Show a temporary preview immediately for responsiveness
    const tempReader = new FileReader();
    tempReader.onloadend = () => setter(tempReader.result as string);
    tempReader.readAsDataURL(file);

    const url = await uploadImage(file);
    if (url) {
      setter(url);
      showToast("Imagem enviada para o servidor com sucesso!", "success");
    } else {
      showToast("Falha ao enviar imagem. A visualização local continuará disponível.", "error");
    }
  };

  // Load all configurations & events list
  const loadStatsAndData = async () => {
    try {
      const brandCnf = await fetchBrandingConfig();
      setConfig(brandCnf);
      
      setEditTitulo(brandCnf.titulo);
      setEditSubTitulo(brandCnf.sub_titulo);
      setEditTitulo2(brandCnf.titulo_2);
      setEditLogoUrl(brandCnf.logo_url);
      setEditBannerUrl(brandCnf.banner_url || '');
      setEditCopyright(brandCnf.copyright);
      setEditLightMode(brandCnf.light_mode || false);

      const allEv = await listAllEventos();
      setEvents(allEv);
      
      if (allEv.length > 0 && !selectedEventId) {
        setSelectedEventId(allEv[0].id);
      }
      
      setIsDbConnected(isSupabaseConfigured());
    } catch (e) {
      console.error(e);
      showToast("Erro ao sincronizar informações.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStatsAndData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Update selected event whenever it exists
  const selectedEvent = events.find(e => e.id === selectedEventId);

  // Handle saving of branding configs
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedConfig: ConfigMarca = {
        titulo: editTitulo.trim() || DEFAULT_CONFIG.titulo,
        sub_titulo: editSubTitulo.trim() || DEFAULT_CONFIG.sub_titulo,
        titulo_2: editTitulo2.trim() || DEFAULT_CONFIG.titulo_2,
        logo_url: editLogoUrl.trim() || DEFAULT_CONFIG.logo_url,
        banner_url: editBannerUrl.trim() || DEFAULT_CONFIG.banner_url,
        copyright: editCopyright.trim() || DEFAULT_CONFIG.copyright,
        light_mode: editLightMode
      };
      
      const success = await saveBrandingConfig(updatedConfig);
      if (success) {
        setConfig(updatedConfig);
        showToast("Configurações salvas e aplicadas com sucesso!", "success");
      } else {
        showToast("Falha ao salvar. Verifique se o banco de dados está ativo.", "error");
      }
    } catch (err: any) {
      showToast(`Erro ao gravar marca: ${err.message || err}`, "error");
    }
  };

  // Auto create next logical Friday event
  const handleCreateAutoFriday = () => {
    const { dateStr } = getNextFridayDate();
    setNewEventDate(dateStr);
    showToast(`Data da próxima sexta selecionada: ${dateStr}`, "success");
  };

  // Edit selected event data
  const handleEditEvent = () => {
    if (!selectedEvent) return;
    setNewEventDate(selectedEvent.data);
    setNewEventTime(selectedEvent.hora_inicio || '20:00');
    setIsEditingEvent(true);
    setShowCreateEventForm(true);
    const el = document.getElementById('tab-events-root');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Create or update event manually
  const handleCreateCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventDate) {
      showToast("Por favor selecione uma data válida.", "error");
      return;
    }
    try {
      if (isEditingEvent && selectedEvent) {
        const updatedEv: Evento = {
          ...selectedEvent,
          data: newEventDate,
          hora_inicio: newEventTime || '20:00',
        };
        const saved = await saveEvento(updatedEv);
        showToast(`Oração #${saved.numero} atualizada com sucesso!`, "success");
        setShowCreateEventForm(false);
        setIsEditingEvent(false);
        setNewEventDate('');
        await loadStatsAndData();
        setSelectedEventId(saved.id);
      } else {
        const maxNum = events.reduce((max, e) => e.numero > max ? e.numero : max, 0);
        const newEv: Evento = {
          id: 'mock-' + generateId(),
          numero: maxNum + 1,
          data: newEventDate,
          hora_inicio: newEventTime || '20:00',
          nomes: []
        };
        
        const saved = await saveEvento(newEv);
        showToast(`Oração #${saved.numero} criada com sucesso!`, "success");
        setShowCreateEventForm(false);
        setNewEventDate('');
        await loadStatsAndData();
        setSelectedEventId(saved.id);
      }
    } catch (err: any) {
      showToast(`Erro ao ${isEditingEvent ? 'atualizar' : 'criar'} oração: ${err.message || err}`, "error");
    }
  };

  // Non-blocking admin confirmation function to delete event
  const confirmDeleteEvent = async (id: string, code: number) => {
    try {
      const ok = await deleteEvento(id);
      if (ok) {
        showToast("Evento e lista deletados com sucesso.");
        const remaining = events.filter(e => e.id !== id);
        setEvents(remaining);
        if (remaining.length > 0) {
          setSelectedEventId(remaining[0].id);
        } else {
          setSelectedEventId('');
        }
      }
    } catch (err: any) {
      showToast(`Erro ao deletar evento: ${err.message || err}`, "error");
    }
  };

  // Admin inserts participant manually
  const handleAdminAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    
    const trimmed = adminAddNome.trim();
    if (!trimmed) {
      showToast("Insira um nome válido.", "error");
      return;
    }

    const dup = selectedEvent.nomes.some(p => p.nome.toLowerCase() === trimmed.toLowerCase());
    if (dup) {
      showToast("Esse participante já está nesta lista!", "error");
      return;
    }

    const newP: Participant = {
      id: generateId(),
      nome: trimmed,
      sexo: adminAddSexo,
      criado_em: new Date().toISOString(),
      device_id: 'admin',
      isFixo: filterType === 'fixo'
    };

    const updatedNomes = [...selectedEvent.nomes, newP].sort((a, b) => 
      a.nome.localeCompare(b.nome, 'pt-BR')
    );

    const updatedEvent = {
      ...selectedEvent,
      nomes: updatedNomes
    };

    try {
      const saved = await saveEvento(updatedEvent);
      setEvents(events.map(ev => ev.id === saved.id ? saved : ev));
      
      // Salva no config globais se for fixo
      if (filterType === 'fixo') {
        const globalDup = config.nomes_fixo?.some(p => p.nome.toLowerCase() === trimmed.toLowerCase());
        if (!globalDup) {
          const updatedConfig = {
            ...config,
            nomes_fixo: [...(config.nomes_fixo || []), newP]
          };
          await saveBrandingConfig(updatedConfig);
          setConfig(updatedConfig);
        }
      }

      setAdminAddNome('');
      setAdminAddFixo(false);
      showToast("Participante inserido via Admin com sucesso!", "success");
    } catch (err: any) {
      showToast(`Erro ao adicionar participante: ${err.message || err}`, "error");
    }
  };

  // Swith individual row into edit mode
  const startEditingParticipant = (p: Participant) => {
    setAdminEditingParticipantId(p.id);
    setAdminEditNomeValue(p.nome);
    setAdminEditSexoValue(p.sexo);
  };

  // Save row changes
  const saveEditedParticipant = async (pId: string) => {
    if (!selectedEvent) return;
    
    const trimmed = adminEditNomeValue.trim();
    if (!trimmed) return;

    const dup = selectedEvent.nomes.some(p => p.id !== pId && p.nome.toLowerCase() === trimmed.toLowerCase());
    if (dup) {
      showToast("Outro participante já possui esse nome!", "error");
      return;
    }

    const updatedNomes = selectedEvent.nomes.map(p => {
      if (p.id === pId) {
        return { ...p, nome: trimmed, sexo: adminEditSexoValue };
      }
      return p;
    }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const updatedEv = {
      ...selectedEvent,
      nomes: updatedNomes
    };

    try {
      const saved = await saveEvento(updatedEv);
      setEvents(events.map(ev => ev.id === saved.id ? saved : ev));
      
      const pToEdit = selectedEvent.nomes.find(p => p.id === pId);
      if (pToEdit && pToEdit.isFixo) {
        // Encontrar e atualizar também na lista global
        const oldNomeLower = pToEdit.nome.toLowerCase();
        const globalDup = config.nomes_fixo?.find(fp => fp.nome.toLowerCase() === oldNomeLower || fp.id === pId);
        if (globalDup) {
          const updatedConfig = {
            ...config,
            nomes_fixo: config.nomes_fixo?.map(fp => 
              (fp.nome.toLowerCase() === oldNomeLower || fp.id === pId) 
                ? { ...fp, nome: trimmed, sexo: adminEditSexoValue } 
                : fp
            )
          };
          await saveBrandingConfig(updatedConfig);
          setConfig(updatedConfig);
        }
      }

      setAdminEditingParticipantId(null);
      showToast("Registro atualizado com sucesso!");
    } catch (err: any) {
      showToast(`Erro ao salvar correção: ${err.message || err}`, "error");
    }
  };

  // Non-blocking admin custom confirmation callback to remove a participant
  const confirmDeleteParticipant = async (pId: string) => {
    if (!selectedEvent) return;
    const updatedNomes = selectedEvent.nomes.filter(p => p.id !== pId);
    const updatedEv = {
      ...selectedEvent,
      nomes: updatedNomes
    };

    try {
      const saved = await saveEvento(updatedEv);
      setEvents(events.map(ev => ev.id === saved.id ? saved : ev));
      showToast("Nome removido com sucesso.");
    } catch (err: any) {
      showToast(`Erro ao deletar participante: ${err.message || err}`, "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-700 flex items-center justify-center font-bold">
        <div className="text-center font-mono text-xs">
          <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          Carregando Painel Administrativo...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col justify-between" id="admin-main-root">
      
      <div className="container mx-auto px-3 py-4 md:px-4 md:py-8 max-w-5xl flex-grow">
        
        {/* Passcode Lock Shield if wanted to demo protection */}
        {!isUnlocked ? (
          <div className="max-w-md mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 mt-12 text-center text-white">
            <Lock size={36} className="text-indigo-400 mx-auto mb-3" />
            <h3 className="text-md font-bold text-white mb-1 uppercase tracking-wide">Acesso Restrito</h3>
            <p className="text-xs text-indigo-300/80 mb-4">Insira o código de administrador para habilitar alterações no sistema.</p>
            <input 
              type="password" 
              placeholder="Código de Acesso" 
              className="w-full text-center px-4 py-3 bg-black/40 border border-white/10 rounded-xl mb-4 text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (e.target.value === '1234') {
                  setIsUnlocked(true);
                  showToast("Acesso administrativo desbloqueado com sucesso!");
                }
              }}
            />
            <p className="text-[10px] text-white/40 italic">Dica de preview: Digite &quot;1234&quot;</p>
          </div>
        ) : (
          <div>
            {/* Dashboard Tabs Selection - scrollável horizontalmente no mobile */}
            <div className="flex border-b border-white/10 mb-5 md:mb-8 overflow-x-auto no-scrollbar" id="admin-tabs">
              {[
                { id: 'events', label: 'Listas & Orações', labelFull: 'Gerenciar Listas & Orações', icon: Calendar },
                { id: 'branding', label: 'Marca', labelFull: 'Configuração da Marca', icon: Layout }
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 py-2.5 md:py-3 px-3 md:px-4 text-[10px] md:text-xs font-bold border-b-2 transition-all cursor-pointer uppercase tracking-widest whitespace-nowrap shrink-0 ${
                      isSelected 
                        ? 'border-indigo-500 text-white' 
                        : 'border-transparent text-indigo-200/60 hover:text-white'
                    }`}
                  >
                    <Icon size={13} />
                    <span className="sm:hidden">{tab.label}</span>
                    <span className="hidden sm:inline">{tab.labelFull}</span>
                  </button>
                );
              })}
            </div>

            {/* Content Switcher */}
            <div className="space-y-6">

              {/* TAB 1: LISTAS E GESTÃO DE PARTICIPANTES */}
              {activeTab === 'events' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8" id="tab-events-root">
                  
                  {/* Left panel: List of events */}
                  <div className="lg:col-span-4 space-y-3 md:space-y-4 animate-fade-in-up lg:sticky lg:top-5 lg:self-start">
                    <div className="pb-3">
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg bg-white/10 shadow-lg px-5 py-3 mb-3">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-300">Orações</h4>
                          <button
                            onClick={() => {
                              setShowCreateEventForm(!showCreateEventForm);
                              if (showCreateEventForm) setIsEditingEvent(false);
                            }}
                            className={`bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold py-1 px-3 rounded-lg border border-indigo-500/50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md ${showCreateEventForm ? 'bg-indigo-700' : ''}`}
                          >
                            {showCreateEventForm ? <Calendar size={12} /> : <Plus size={12} />}
                            <span>{showCreateEventForm ? "Fechar" : "Nova Oração"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Manual Custom event selection calendar form */}
                      <AnimatePresence>
                        {showCreateEventForm && (
                          <motion.form 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onSubmit={handleCreateCustomEvent}
                            className="bg-black/40 p-4 rounded-xl border border-white/10 mb-4 space-y-4 overflow-hidden text-xs"
                          >
                            <div className="flex justify-center text-white mb-2">
                              <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300">{isEditingEvent ? "Editar Oração" : "Escolha a Data da Oração"}</h3>
                            </div>
                            
                            <CustomDatePicker 
                              value={newEventDate} 
                              onChange={setNewEventDate} 
                            />
                            
                            <div className="pt-2">
                              <label className="block font-bold text-indigo-300 uppercase tracking-widest mb-1.5">HORA DE INÍCIO</label>
                              <div className="flex gap-2 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/50">
                                  <Clock size={16} />
                                </div>
                                <input 
                                  type="time" 
                                  required
                                  value={newEventTime}
                                  onChange={(e) => setNewEventTime(e.target.value)}
                                  className="flex-1 pl-10 pr-3 py-2.5 bg-black/45 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={handleCreateAutoFriday}
                                  className="bg-white/5 hover:bg-white/10 text-white/90 font-semibold py-2 px-3 rounded-lg transition-colors border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer text-[10px] shrink-0"
                                  title="Selecionar próxima sexta"
                                >
                                  <Calendar size={12} />
                                  Próxima Sexta
                                </button>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowCreateEventForm(false);
                                  setIsEditingEvent(false);
                                }}
                                className="w-1/2 bg-white/10 hover:bg-white/20 text-white/80 font-semibold py-3 px-3 rounded-lg transition-colors border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer text-[10px]"
                              >
                                Cancelar
                              </button>
                              
                              <button 
                                type="submit"
                                className={`w-1/2 px-4 py-3 rounded-lg font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${!newEventDate ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                                disabled={!newEventDate}
                              >
                                <Save size={14} />
                                {isEditingEvent ? "Atualizar" : "Confirmar"}
                              </button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>

                      {/* Display current events carousel */}
                      <div className="relative">
                        <div className="flex lg:grid lg:grid-cols-1 gap-1.5 lg:gap-[10px] overflow-x-auto lg:overflow-x-visible snap-x snap-mandatory lg:snap-none scroll-smooth no-scrollbar pb-1" id="events-carousel">
                          {events.length > 0 ? (
                            events.map((ev) => {
                              const isSelected = ev.id === selectedEventId;
                              return (
                                <div
                                  key={ev.id}
                                  className={`snap-start shrink-0 w-[calc(25%-4.5px)] lg:w-full min-w-[75px] lg:min-w-0 aspect-[4/3] lg:aspect-auto rounded-lg border transition-all cursor-pointer flex flex-col lg:flex-row items-center justify-center lg:justify-between text-center lg:text-left p-1 lg:px-4 lg:py-3 relative overflow-hidden mt-2 lg:mt-0 first:ml-5 lg:first:ml-0 ${
                                    isSelected 
                                      ? 'border-violet-400 bg-violet-500/25 ring-2 ring-violet-400/50 scale-[1.02] lg:scale-[1.01]' 
                                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                                  }`}
                                  onClick={() => setSelectedEventId(ev.id)}
                                >
                                  <span className="font-mono text-2xl lg:text-lg font-black text-white leading-none">
                                    #{ev.numero}
                                  </span>
                                  <span className="text-[9px] lg:text-xs font-bold text-white/70 leading-tight mt-0 lg:mt-0">
                                    {new Date(ev.data + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="w-full text-center py-8 text-xs text-indigo-200/50">
                              Nenhuma oração registrada ainda.
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Right panel: Live participant editor inside selected event */}
                  <div className="lg:col-span-8 space-y-4">
                    {selectedEvent ? (
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-2xl">
                        
                        {/* Event title summary info */}
                        <div className="flex justify-between items-center flex-wrap gap-2 border-b border-white/10 pb-3 mb-4 md:pb-4 md:mb-6">
                          <div>
                            <span className="text-sm md:text-[28px] font-bold text-violet-400 font-mono">
                              ORAÇÃO #{selectedEvent.numero}
                            </span>
                            <h3 className="text-base md:text-lg font-bold text-white mt-1 capitalize">
                              {formatDateBr(selectedEvent.data).replace(/ de \d{4}/, '')}
                            </h3>
                            <p className="text-[10px] md:text-xs text-indigo-200/60 flex items-center gap-1.5 mt-1 font-medium">
                              <Clock size={11} className="text-indigo-300" />
                              Início: {selectedEvent.hora_inicio || '20:00'}
                            </p>
                          </div>
                          
                          <div className="bg-indigo-500/10 px-3 md:px-4 py-2 rounded-xl text-center border border-indigo-500/20 min-w-[64px]">
                            <span className="block text-xl font-black text-white font-mono leading-none">{selectedEvent.nomes.length + (config.nomes_fixo?.filter(fixo => !selectedEvent.nomes.some(n => n.id === fixo.id)).length || 0)}</span>
                            <span className="text-[8px] md:text-[9px] uppercase font-bold text-indigo-300/80 tracking-wide mt-1 block">Cadastros</span>
                          </div>
                        </div>

                        {/* Fast manual insert form */}
                        <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setShowAddNomeForm(!showAddNomeForm)}
                            className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-[11px] font-bold py-2 px-4 rounded-xl border border-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>{showAddNomeForm ? "Fechar" : "Adicionar Nome"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleEditEvent}
                            className="bg-white/10 hover:bg-white/20 text-white/80 text-[11px] font-bold px-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10 shrink-0 cursor-pointer"
                            title="Editar data e horário desta oração"
                          >
                            <Edit size={14} />
                            <span className="hidden sm:inline">Editar dados</span>
                          </button>
                        </div>

                        {showAddNomeForm && (
                        <form onSubmit={handleAdminAddParticipant} className="mb-5 flex flex-col gap-2">
                          <label className="block text-[10px] md:text-[11px] font-bold text-indigo-300 uppercase tracking-widest pl-1">Inserir nome na lista</label>
                          <input 
                            type="text"
                            value={adminAddNome}
                            onChange={(e) => setAdminAddNome(e.target.value)}
                            placeholder="Nome e Sobrenome"
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 placeholder:text-white/30 h-12"
                          />

                          <div className="flex gap-2 w-full h-12">
                            <div className="flex bg-white/5 p-1 border border-white/10 rounded-xl flex-grow">
                              <button
                                type="button"
                                onClick={() => setAdminAddSexo('M')}
                                className={`flex-1 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold rounded-lg duration-100 cursor-pointer ${adminAddSexo === 'M' ? 'bg-indigo-600 text-white shadow' : 'text-white/40 hover:text-white'}`}
                              >
                                ♂️ <span className="ml-0.5">Masc.</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setAdminAddSexo('F')}
                                className={`flex-1 flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-bold rounded-lg duration-100 cursor-pointer ${adminAddSexo === 'F' ? 'bg-pink-500/80 text-white shadow' : 'text-white/40 hover:text-white'}`}
                              >
                                ♀️ <span className="ml-0.5">Fem.</span>
                              </button>
                            </div>
                            <button
                              type="submit"
                              className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-bold px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer border border-indigo-500/20 shrink-0"
                            >
                              <Plus size={16} />
                              <span>Adicionar</span>
                            </button>
                          </div>
                        </form>
                        )}

                        {/* List items representation */}
                        <div className="flex flex-col gap-1.5 mb-3">
                          <h4 className="text-[10px] md:text-xs font-bold text-indigo-300 uppercase tracking-widest pl-1">Lista de Intercessado</h4>
                          
                          {/* Filters */}
                          <div className="flex bg-black/40 p-1 border border-white/10 rounded-lg overflow-x-auto w-full no-scrollbar">
                            {(['all', 'M', 'F', 'fixo'] as const).map(type => (
                              <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`flex-1 py-1.5 px-2 text-[9px] sm:text-[10px] font-bold rounded uppercase tracking-wider duration-100 cursor-pointer whitespace-nowrap text-center min-w-[48px] ${filterType === type ? 'bg-indigo-500 text-white shadow' : 'text-white/40 hover:text-white'}`}
                              >
                                {type === 'all' ? 'Todos' : type === 'fixo' ? '📌 Fixos' : type === 'M' ? '♂️ Masc.' : '♀️ Fem.'}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <div className="border border-white/10 rounded-2xl divide-y divide-white/5 overflow-hidden shadow-inner bg-black/15" id="participantes-editor-table">
                          {(() => {
                            const allNomes = [
                              ...selectedEvent.nomes,
                              ...(config.nomes_fixo?.filter(fixo => 
                                !selectedEvent.nomes.some(n => n.id === fixo.id)
                              ) || [])
                            ];
                            const filteredNomes = allNomes.filter(p => {
                              if (filterType === 'fixo') return p.isFixo;
                              if (filterType === 'M') return p.sexo === 'M';
                              if (filterType === 'F') return p.sexo === 'F';
                              return true;
                            });

                            return filteredNomes.length > 0 ? (
                              filteredNomes.map((p, idx) => {
                                const isEditing = adminEditingParticipantId === p.id;
                                return (
                                  <div key={p.id} className="p-3 flex justify-between items-center text-xs hover:bg-white/5 transition-colors">
                                    {isEditing ? (
                                      <div className="flex flex-wrap items-center gap-2 flex-grow">
                                        <input
                                          type="text"
                                          value={adminEditNomeValue}
                                          onChange={(e) => setAdminEditNomeValue(e.target.value)}
                                          className="px-3 py-2 bg-black/50 border border-white/10 text-white rounded text-sm font-semibold focus:outline-none focus:border-indigo-500 min-w-[250px] w-full sm:w-auto"
                                        />
                                        <select
                                          value={adminEditSexoValue}
                                          onChange={(e) => setAdminEditSexoValue(e.target.value as 'M' | 'F')}
                                          className="p-1 px-2.5 bg-black border border-white/10 rounded text-xs font-medium text-white focus:outline-none h-full"
                                        >
                                          <option value="M">♂️ Masculino</option>
                                          <option value="F">♀️ Feminino</option>
                                        </select>
                                        <button 
                                          onClick={() => saveEditedParticipant(p.id)}
                                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold py-1 px-2.5 rounded cursor-pointer"
                                        >
                                          Salvar
                                        </button>
                                        <button 
                                          onClick={() => setAdminEditingParticipantId(null)}
                                          className="bg-white/10 hover:bg-white/20 text-white/80 text-[11px] font-medium py-1 px-2 rounded border border-white/10 cursor-pointer"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-2.5 min-w-0 pr-4">
                                          <span className="font-mono text-[10px] text-indigo-300 font-bold w-4 shrink-0">
                                            {idx + 1}
                                          </span>
                                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.sexo === 'F' ? 'bg-pink-400' : 'bg-blue-400'}`} title={p.sexo === 'F' ? 'Feminino' : 'Masculino'}></span>
                                          <span className="font-semibold text-white uppercase">
                                            {p.nome}
                                          </span>
                                          {p.isFixo && (
                                            <span className="text-[8px] uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded font-bold border border-indigo-500/30 shrink-0 ml-1">
                                              Fixo
                                            </span>
                                          )}

                                        </div>

                                        <div className="flex items-center gap-2.5 shrink-0">
                                          <button
                                            onClick={() => startEditingParticipant(p)}
                                            className="p-1 opacity-40 hover:opacity-100 text-white/60 hover:text-white/90 transition-all duration-200 cursor-pointer"
                                            title="Editar nome ou sexo"
                                          >
                                            <Edit size={12} />
                                          </button>
                                          <button
                                            onClick={() => setDeletingParticipant({ id: p.id, nome: p.nome })}
                                            className="p-1 opacity-40 hover:opacity-100 text-white/60 hover:text-red-400 transition-all duration-200 cursor-pointer"
                                            title="Deletar participante"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                                  <div className="text-center py-12 text-xs text-indigo-200/50">
                                    Nenhum participante encontrado com os filtros atuais.
                                  </div>
                                );
                              })()}
                            </div>

                            <button
                              onClick={() => setDeletingEvent({ id: selectedEvent.id, numero: selectedEvent.numero })}
                              className="mt-20 text-[10px] font-bold text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1.5 px-1 cursor-pointer"
                            >
                              <Trash2 size={12} />
                              Excluir esta oração
                            </button>

                          </div>
                        ) : (
                      <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-8 text-center text-indigo-205/60 text-xs">
                        Clique em &quot;Próxima Sexta&quot; para selecionar a data ou configure uma data personalizada, depois clique em &quot;Confirmar&quot; para criar.
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 2: BRANDING E CONFIGURAÇÃO DA CARACTERÍSTICA */}
              {activeTab === 'branding' && (
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 md:p-6 shadow-2xl max-w-2xl mx-auto" id="tab-branding-root">
                  <div className="border-b border-white/10 pb-3 mb-4 md:mb-6">
                    <h3 className="text-sm md:text-base font-extrabold text-white uppercase tracking-wider pl-3 border-l-4 border-indigo-500">Customização Visual da Marca</h3>
                    <p className="text-[10px] md:text-xs text-indigo-200/60 mt-1 font-medium">Todas as modificações são refletidas instantaneamente na página de inscrição pública dos participantes.</p>
                  </div>

                  <form onSubmit={handleSaveBranding} className="space-y-4 text-xs font-semibold">
                    
                    {/* Event URL Logo input & Upload */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                      <label htmlFor="logo-url-field" className="block text-indigo-300 mb-1 uppercase tracking-widest text-[11px]">Logo do Seu Evento</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        {/* Preview and Upload box */}
                        <div 
                          className="md:col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-xl p-3 bg-black/20 hover:border-indigo-500/50 transition-colors relative cursor-pointer group h-32"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleImageUpload(file, setEditLogoUrl);
                          }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            id="logo-upload-input"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, setEditLogoUrl);
                            }}
                          />
                          <label htmlFor="logo-upload-input" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer text-center p-2">
                            {editLogoUrl ? (
                              <div className="relative w-20 h-20 group">
                                <img src={editLogoUrl} alt="Logo Preview" className="w-20 h-20 object-cover rounded-full border border-indigo-500/50 bg-slate-950" />
                                <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Edit size={16} className="text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-white/55">
                                <Plus size={20} className="mb-1 text-indigo-400 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-bold">Upload Logo</span>
                                <span className="text-[8px] text-white/45">Arraste ou clique</span>
                              </div>
                            )}
                          </label>
                        </div>
                        
                        {/* URL input */}
                        <div className="md:col-span-2 space-y-2">
                          <label htmlFor="logo-url-field" className="block text-[10px] text-indigo-200/60 uppercase">Ou cole uma URL externa direta</label>
                          <input
                            id="logo-url-field"
                            type="text"
                            value={editLogoUrl}
                            onChange={(e) => setEditLogoUrl(e.target.value)}
                            placeholder="Ex: https://meusite.com/logo.png"
                            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis"
                          />
                          <span className="block text-[10px] text-white/40 font-medium leading-relaxed">Se vazio, o cabeçalho usará um ícone elegante por padrão. Você também pode arrastar e soltar um arquivo de imagem no quadrado pontilhado!</span>
                        </div>
                      </div>
                    </div>

                    {/* Event URL Banner Background input & Upload */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                      <label htmlFor="banner-url-field" className="block text-indigo-300 mb-1 uppercase tracking-widest text-[11px]">Banner de Fundo do Evento</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        {/* Preview and Upload box */}
                        <div 
                          className="md:col-span-1 flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-xl p-3 bg-black/20 hover:border-indigo-500/50 transition-colors relative cursor-pointer group h-32"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleImageUpload(file, setEditBannerUrl);
                          }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            id="banner-upload-input"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file, setEditBannerUrl);
                            }}
                          />
                          <label htmlFor="banner-upload-input" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer text-center p-2">
                            {editBannerUrl ? (
                              <div className="relative w-full h-full group p-1">
                                <img src={editBannerUrl} alt="Banner Preview" className="w-full h-full object-cover rounded-lg border border-indigo-500/30 bg-slate-950" />
                                <div className="absolute inset-0 bg-black/60 rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Edit size={16} className="text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-white/55">
                                <Plus size={20} className="mb-1 text-indigo-400 group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-bold">Upload Banner</span>
                                <span className="text-[8px] text-white/45">Arraste ou clique</span>
                              </div>
                            )}
                          </label>
                        </div>
                        
                        {/* URL input */}
                        <div className="md:col-span-2 space-y-2">
                          <label htmlFor="banner-url-field" className="block text-[10px] text-indigo-200/60 uppercase">Ou cole uma URL externa direta</label>
                          <input
                            id="banner-url-field"
                            type="text"
                            value={editBannerUrl}
                            onChange={(e) => setEditBannerUrl(e.target.value)}
                            placeholder="Ex: https://meusite.com/banner.jpg"
                            className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium text-xs whitespace-nowrap overflow-hidden text-ellipsis"
                          />
                          <span className="block text-[10px] text-white/40 font-medium leading-relaxed">Insira o link para a imagem de fundo que ficará atrás da logo na página pública. Aceita arquivos locais ou links remotos.</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Title */}
                      <div>
                        <label htmlFor="title-field" className="block text-indigo-300 mb-1.5 uppercase tracking-widest">TÍTULO PRINCIPAL</label>
                        <input
                          id="title-field"
                          type="text"
                          required
                          value={editTitulo}
                          onChange={(e) => setEditTitulo(e.target.value)}
                          placeholder="Ex: Lista do Oração Semanal"
                          className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>

                      {/* Header Subtitle */}
                      <div>
                        <label htmlFor="subtitle-field" className="block text-indigo-300 mb-1.5 uppercase tracking-widest">SUBTÍTULO</label>
                        <input
                          id="subtitle-field"
                          type="text"
                          required
                          value={editSubTitulo}
                          onChange={(e) => setEditSubTitulo(e.target.value)}
                          placeholder="Ex: Confirme sua presença preenchendo o nome na lista!"
                          className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium"
                        />
                      </div>
                    </div>

                    {/* Title 2 footer */}
                    <div>
                      <label htmlFor="title2-field" className="block text-indigo-300 mb-1.5 uppercase tracking-widest">TÍTULO DE DESTAQUE DO RODAPÉ (TÍTULO 2)</label>
                      <input
                        id="title2-field"
                        type="text"
                        required
                        value={editTitulo2}
                        onChange={(e) => setEditTitulo2(e.target.value)}
                        placeholder="Ex: Não perca o melhor evento de sexta!"
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    {/* Copyright footerbar text */}
                    <div>
                      <label htmlFor="copyright-field" className="block text-indigo-300 mb-1.5 uppercase tracking-widest">TEXTO DE COPYRIGHT (RODAPÉ)</label>
                      <input
                        id="copyright-field"
                        type="text"
                        required
                        value={editCopyright}
                        onChange={(e) => setEditCopyright(e.target.value)}
                        placeholder="Ex: © 2026 Todos os direitos reservados. Minha Marca."
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-300">Tema da Página:</span>
                        <button
                          type="button"
                          onClick={() => setEditLightMode(!editLightMode)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                            editLightMode
                              ? 'bg-amber-400/20 border-amber-400/30 text-amber-300 hover:bg-amber-400/30'
                              : 'bg-indigo-600/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30'
                          }`}
                        >
                          {editLightMode ? <Sun size={14} /> : <Moon size={14} />}
                          {editLightMode ? 'Light Mode' : 'Dark Mode'}
                        </button>
                      </div>
                      <button
                        type="submit"
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold py-3 px-6 rounded-xl shadow-lg border border-indigo-500/20 hover:shadow-indigo-500/10 transition-all flex items-center justify-center gap-1.5 text-xs tracking-widest uppercase cursor-pointer"
                      >
                        <Save size={14} />
                        <span>Salvar Todos os Ajustes</span>
                      </button>
                    </div>

                  </form>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* Admin footer bar */}
      <footer className="bg-white/5 backdrop-blur-md border-t border-white/10 py-4 text-center text-[10px] md:text-[11px] text-indigo-200/50 font-medium">
        <p>Painel de Controle Administrativo Integrado • Gestor de Listas de Convidados</p>
      </footer>

      {/* Admin Toast Alert Indicator */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-4 right-4 z-50 text-xs font-bold px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-1.5 backdrop-blur-xl ${
              toast.type === 'success' 
                ? 'bg-[#0b1220]/95 text-white border-indigo-500/30' 
                : 'bg-red-950/90 text-white/90 border-red-500/30'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${toast.type === 'success' ? 'bg-indigo-400 animate-pulse' : 'bg-red-500'}`}></span>
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-blocking Confirm Modal for Event Deletion */}
      <AnimatePresence>
        {deletingEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1220]/95 border border-white/10 rounded-3xl p-5 md:p-6 max-w-sm w-full shadow-2xl relative text-center"
            >
              <div className="mx-auto w-11 h-11 md:w-12 md:h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                <AlertTriangle size={22} />
              </div>
              <h3 className="text-sm md:text-base font-extrabold text-white mb-2 uppercase tracking-wider">Remover Oração #{deletingEvent.numero}?</h3>
              <p className="text-[10px] md:text-xs text-indigo-200/70 mb-5 md:mb-6 leading-relaxed">
                ATENÇÃO: Deseja realmente remover a Oração #{deletingEvent.numero}? Isso irá excluir permanentemente todos os nomes registrados na lista. Esta ação é irreversível.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setDeletingEvent(null)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-white/10 bg-white/5 text-white/90 rounded-xl text-xs font-semibold hover:bg-white/10 duration-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const idToDel = deletingEvent.id;
                    const numToDel = deletingEvent.numero;
                    setDeletingEvent(null);
                    await confirmDeleteEvent(idToDel, numToDel);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold duration-100 shadow-md cursor-pointer"
                >
                  Excluir Permanentemente
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Non-blocking Confirm Modal for Participant Deletion */}
      <AnimatePresence>
        {deletingParticipant && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1220]/95 border border-white/10 rounded-3xl p-5 md:p-6 max-w-sm w-full shadow-2xl relative text-center"
            >
              <div className="mx-auto w-11 h-11 md:w-12 md:h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                <AlertTriangle size={22} />
              </div>
              <h3 className="text-sm md:text-base font-extrabold text-white mb-2 uppercase tracking-wider">Banir / Remover?</h3>
              <p className="text-[10px] md:text-xs text-indigo-200/70 mb-5 md:mb-6 leading-relaxed">
                Deseja mesmo remover &quot;<strong className="text-white font-bold">{deletingParticipant.nome}</strong>&quot; da lista de presença?
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setDeletingParticipant(null)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-white/10 bg-white/5 text-white/90 rounded-xl text-xs font-semibold hover:bg-white/10 duration-100 cursor-pointer"
                >
                  Manter na Lista
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const idToDel = deletingParticipant.id;
                    setDeletingParticipant(null);
                    await confirmDeleteParticipant(idToDel);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold duration-100 shadow-md cursor-pointer"
                >
                  Confirmar Remoção
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

