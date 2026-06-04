  'use client';

  import React, { useState, useEffect, useRef } from 'react';
  import { motion, AnimatePresence } from 'motion/react';
  import { 
    Users, 
    User, 
    Calendar, 
    Clock, 
    UserCheck, 
    Edit2, 
    Trash2, 
    Check, 
    X, 
    Search, 
    Database, 
    ShieldCheck,
    Zap,
    AlertTriangle
  } from 'lucide-react';
  import { 
    Evento, 
    ConfigMarca, 
    Participant,
    DEFAULT_CONFIG,
    fetchBrandingConfig, 
    listAllEventos, 
    getNextActiveEvento, 
    addParticipantToEvento, 
    removeParticipantFromEvento, 
    editParticipantInEvento,
    isSupabaseConfigured,
    formatDateBr,
    generateId
  } from '@/lib/db';

  export default function Home() {
    const [loading, setLoading] = useState(true);
    const [isDbConnected, setIsDbConnected] = useState(false);
    
    // Storage states
    const [config, setConfig] = useState<ConfigMarca | null>(null);
    const [activeEvent, setActiveEvent] = useState<Evento | null>(null);
    const [allEvents, setAllEvents] = useState<Evento[]>([]);
    
    // Input fields
    const [inputNome, setInputNome] = useState('');
    const [inputSexo, setInputSexo] = useState<'M' | 'F' | ''>('');
    
    // Pre-saved names in LocalStorage
    const [savedNames, setSavedNames] = useState<{nome: string, sexo: 'M' | 'F'}[]>([]);
    
    // Search filter
    const [searchQuery, setSearchQuery] = useState('');
    
    // Editing state
    const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
    const [editNome, setEditNome] = useState('');
    const [editSexo, setEditSexo] = useState<'M' | 'F'>('M');
    
    // Countdown state
    const [countdown, setCountdown] = useState({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isOver: false
    });

    // Toast notifications for user feedbacks
    const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

    // Custom non-blocking confirmations inside the preview iframe/sandbox
    const [deletingParticipant, setDeletingParticipant] = useState<{ id: string; nome: string } | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    // Nomes adicionados nesta sessão (para esconder do painel de pré-salvos, sem apagar do localStorage)
    const [addedThisSession, setAddedThisSession] = useState<string[]>([]);
    // Estado de foco do input de nome (para o efeito glow)
    const [isInputFocused, setIsInputFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const formCardRef = useRef<HTMLDivElement>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    };

    // Load configuration, event and local storage pre-saves
    useEffect(() => {
      async function loadData() {
        try {
          const brandConfig = await fetchBrandingConfig();
          setConfig(brandConfig);
          
          const activeEv = await getNextActiveEvento();
          setActiveEvent(activeEv);
          
          const list = await listAllEventos();
          setAllEvents(list);
          
          setIsDbConnected(isSupabaseConfigured());
          
          // Load pre-saved list from client localStorage
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('gestor_eventos_pre_salvos');
            if (stored) {
              try {
                setSavedNames(JSON.parse(stored));
              } catch (e) {
                console.error("Failed to parse pre-saved names", e);
              }
            }
          }
        } catch (err) {
          console.error("Failed to fetch initial page data", err);
          showToast("Erro ao carregar dados do evento", "error");
        } finally {
          setLoading(false);
        }
      }
      loadData();
    }, []);

    // Countdown timer clock
    useEffect(() => {
      if (!activeEvent) return;

      const timer = setInterval(() => {
        // Parse event date and start time robustly to avoid NaN
        const [year, month, day] = activeEvent.data.split('-').map(Number);
        const [hour, minute, second] = (activeEvent.hora_inicio || '20:00').split(':').map(Number);
        const targetTime = new Date(year, month - 1, day, hour, minute, second || 0).getTime();
        const nowTime = new Date().getTime();
        const difference = targetTime - nowTime;

        if (difference <= 0) {
          setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true });
          clearInterval(timer);
        } else {
          const days = Math.floor(difference / (1000 * 60 * 60 * 24));
          const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((difference % (1000 * 60)) / 1000);

          setCountdown({ days, hours, minutes, seconds, isOver: false });
        }
      }, 1000);

      return () => clearInterval(timer);
    }, [activeEvent]);

    // Sync body background for light mode
    useEffect(() => {
      if (config?.light_mode) {
        document.body.style.background = '#f1f5f9';
        document.body.style.color = '#0f172a';
      } else {
        document.body.style.background = '';
        document.body.style.color = '';
      }
    }, [config?.light_mode]);

    // Focus input and scroll when form appears
    useEffect(() => {
      if (showAddForm || savedNames.length === 0) {
        setTimeout(() => {
          inputRef.current?.focus();
          formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }, [showAddForm, savedNames.length]);

    // Handle manual submit registration
    const handleRegisterSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeEvent) {
        showToast("Não há nenhum evento ativo para registro neste momento.", "error");
        return;
      }

      const trimmedNome = inputNome.trim();
      if (!trimmedNome) {
        showToast("Por favor, digite um nome válido.", "error");
        return;
      }

      if (!trimmedNome.includes(' ')) {
        showToast("Por favor, preencha nome e sobrenome.", "error");
        return;
      }

      if (trimmedNome.length < 3) {
        showToast("O nome deve conter pelo menos 3 caracteres.", "error");
        return;
      }

      if (!inputSexo) {
        showToast("Por favor, selecione o gênero.", "error");
        return;
      }

      try {
        // Build a device-specific ID or fallback
        let devId = 'device';
        if (typeof window !== 'undefined') {
          let storedDevId = localStorage.getItem('gestor_eventos_device_id');
          if (!storedDevId) {
            storedDevId = 'dev-' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('gestor_eventos_device_id', storedDevId);
          }
          devId = storedDevId;
        }

        const updated = await addParticipantToEvento(activeEvent.id, trimmedNome, inputSexo as 'M' | 'F', devId);
        if (updated) {
          setActiveEvent(updated);
          setInputNome('');
          setInputSexo('');
          showToast("Sucesso! Nome adicionado à lista.", "success");
          formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

          // Save to browser list of pre-saved names for Quick Add
          const alreadySaved = savedNames.some(p => p.nome.toLowerCase() === trimmedNome.toLowerCase());
          if (!alreadySaved) {
            const newSaved = [...savedNames, { nome: trimmedNome, sexo: inputSexo as 'M' | 'F' }].slice(-10); // Keep last 10
            setSavedNames(newSaved);
            if (typeof window !== 'undefined') {
              localStorage.setItem('gestor_eventos_pre_salvos', JSON.stringify(newSaved));
            }
          }
        }
      } catch (err: any) {
        showToast(err.message || "Erro ao adicionar participante.", "error");
      }
    };

    // Quick Action Register with one click
    const handleQuickRegister = async (pName: string, pSexo: 'M' | 'F') => {
      if (!activeEvent) return;
      
      // Check if duplicate on list first
      const isDuplicate = activeEvent.nomes.some(n => n.nome.toLowerCase() === pName.toLowerCase());
      if (isDuplicate) {
        showToast(`"${pName}" já está registrado na lista deste evento!`, "error");
        return;
      }

      try {
        let devId = 'device';
        if (typeof window !== 'undefined') {
          devId = localStorage.getItem('gestor_eventos_device_id') || 'device';
        }

        const updated = await addParticipantToEvento(activeEvent.id, pName, pSexo, devId);
        if (updated) {
          setActiveEvent(updated);
          // Esconde o botão desta sessão (sem remover do localStorage)
          setAddedThisSession(prev => [...prev, pName.toLowerCase()]);
          showToast(`✅ ${pName} adicionado à lista!`, "success");
          formCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (err: any) {
        showToast(err.message || "Erro no registro simplificado.", "error");
      }
    };

    // Trigger editing a participant
    const handleStartEdit = (p: Participant) => {
      setEditingParticipant(p);
      setEditNome(p.nome);
      setEditSexo(p.sexo);
    };

    // Save participant edits
    const handleSaveEdit = async () => {
      if (!activeEvent || !editingParticipant) return;
      
      const trimmed = editNome.trim();
      if (!trimmed) {
        showToast("O nome não pode ficar vazio.", "error");
        return;
      }

      try {
        const updated = await editParticipantInEvento(activeEvent.id, editingParticipant.id, trimmed, editSexo);
        if (updated) {
          setActiveEvent(updated);
          setEditingParticipant(null);
          showToast("Registro editado com sucesso!", "success");
        }
      } catch (err: any) {
        showToast(err.message || "Ocorreu um erro ao atualizar o nome.", "error");
      }
    };

    // Triggered after confirming the deletion from modal
    const confirmDeleteParticipant = async (pId: string) => {
      if (!activeEvent) return;

      try {
        const updated = await removeParticipantFromEvento(activeEvent.id, pId);
        if (updated) {
          setActiveEvent(updated);
          showToast("Registro removido com sucesso.", "success");
        }
      } catch (err: any) {
        showToast(err.message || "Erro ao deletar registro.", "error");
      }
    };

    // Remove list of pre-saved names from browser Cache
    const confirmClearPreSaved = () => {
      setSavedNames([]);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('gestor_eventos_pre_salvos');
      }
      showToast("Nomes recomendados limpos.");
    };

    // Categorize names by Gender, filtered by search query
    const query = searchQuery.toLowerCase().trim();
    const allParticipants = [
      ...(activeEvent?.nomes || []),
      ...(config?.nomes_fixo?.filter(fixo => 
        !activeEvent?.nomes.some(n => n.id === fixo.id)
      ) || [])
    ];
    const filteredParticipants = allParticipants.filter(p => 
      p.nome.toLowerCase().includes(query)
    );


    return (
      <div className={`min-h-screen bg-transparent text-white flex flex-col justify-between selection:bg-indigo-500 selection:text-white ${config?.light_mode ? 'light-mode' : ''}`} id="public-main-root">
        


        {/* Banner - full width no top spacing on mobile */}
        <div className="w-full relative mb-10 md:mb-16" id="main-banner-layout">
          <div className="w-full h-44 sm:h-52 md:h-64 rounded-none md:rounded-2xl md:mx-auto md:max-w-[600px] overflow-hidden relative border-0 md:border border-white/10 shadow-2xl">
            {config?.banner_url ? (
              <img 
                src={config.banner_url} 
                alt="Banner de Fundo" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                   (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/eventbanner/1200/450';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          </div>

          {/* Overlapping Logo */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 z-10">
            {config?.logo_url ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl"></div>
                <img 
                  src={config.logo_url} 
                  alt="Logo do Evento" 
                  className="h-20 w-20 md:h-24 md:w-24 object-cover rounded-full shadow-2xl relative bg-slate-955"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/eventlogo/200/200';
                  }}
                />
              </motion.div>
            ) : (
              <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-slate-900 text-indigo-300 flex items-center justify-center shadow-2xl backdrop-blur-md">
                <Users size={28} />
              </div>
            )}
          </div>
        </div>

        <div className="container mx-auto px-3 py-4 md:px-4 md:py-8 max-w-[600px] flex-grow">
          
          {/* Header Section */}
          <header className="text-center mb-8 md:mb-12 flex flex-col items-center" id="main-header">
            
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white uppercase flex items-center justify-center gap-3 flex-wrap">
              <span>{config?.titulo || DEFAULT_CONFIG.titulo}</span>
              {activeEvent && (
                <span className="text-indigo-400 font-black tracking-wider">N°{activeEvent.numero}</span>
              )}
            </h1>
            
            <p className="text-indigo-200/80 text-sm md:text-base max-w-lg mt-1 font-medium">
              {config?.sub_titulo || DEFAULT_CONFIG.sub_titulo}
            </p>
 
            {activeEvent ? (
              <div className="flex items-center justify-center mt-4">
                <div className="flex items-center gap-3 bg-emerald-500/20 border border-emerald-400/30 px-5 py-2.5 rounded-xl shadow-lg">
                  <Calendar size={18} className="text-emerald-400/70 shrink-0" />
                  <span className="font-bold text-sm md:text-base text-white capitalize">{formatDateBr(activeEvent.data).replace(/ de \d{4}/, '')}</span>
                  <span className="text-white/40">|</span>
                  <Clock size={16} className="text-emerald-400/70 shrink-0" />
                  <span className="font-semibold text-sm md:text-base text-white/90">{activeEvent.hora_inicio?.slice(0, 5) || '20:00'}</span>
                </div>
              </div>
            ) : (
              <p className="text-amber-400 text-xs md:text-sm font-medium mt-4">Aguardando novos eventos agendados pelo administrador.</p>
            )}
          </header>
 
          {/* Live Countdown Card */}
          {activeEvent && (
            <div className="mb-8 md:mb-10 animate-fade-in-up" id="countdown-card" style={{ animationDelay: '0.1s' }}>
              <h2 className="text-center text-[10px] md:text-xs font-semibold uppercase tracking-widest text-indigo-300 mb-3">CONTAGEM REGRESSIVA PARA A ORAÇÃO</h2>
              
              {countdown.isOver ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-indigo-600/30 border border-indigo-500/30 backdrop-blur-md text-white p-4 md:p-5 rounded-2xl shadow-md text-center mx-auto"
                >
                  <p className="font-bold text-base md:text-lg">🚀 O evento já começou!</p>
                  <p className="text-[10px] md:text-xs text-indigo-205 mt-1">A lista permanece aberta para correções de última hora.</p>
                </motion.div>
              ) : (
                <div className="flex mx-auto text-center bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-indigo-500/10 relative" id="countdown-grid">
                  {/* Top gradient accent line */}
                  <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />
                  
                  {[
                    { label: 'Dias', value: countdown.days },
                    { label: 'Horas', value: countdown.hours },
                    { label: 'Minutos', value: countdown.minutes },
                    { label: 'Segundos', value: countdown.seconds }
                  ].map((item, index) => {
                    const isLast = index === 3;
                    return (
                      <div key={item.label} className="flex flex-1 flex-col items-center py-4 md:py-5 px-1 relative">
                        {index < 3 && <div className="absolute right-0 top-3 bottom-3 w-px bg-gradient-to-b from-transparent via-indigo-400/50 to-transparent" />}
                        {/* Bottom accent line per block */}
                        <div className={`absolute bottom-0 left-2 right-2 h-0.5 rounded-full ${isLast ? 'bg-indigo-400/50' : 'bg-white/10'}`} />
                        <span className={`text-xl md:text-3xl font-bold tabular-nums ${isLast ? 'text-indigo-300 animate-count-glow' : 'text-white'}`}>
                          {String(item.value).padStart(2, '0')}
                        </span>
                        <span className="text-[8px] md:text-[10px] uppercase font-bold tracking-widest text-white/40 mt-1">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
 
          {/* Quick Add Saved names + Registration Card Form unificados */}
          {activeEvent ? (
                          <div ref={formCardRef} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-2xl mx-auto mb-8 md:mb-12 flex flex-col gap-4 md:gap-5 animate-fade-in-up" id="registration-form-card" style={{ animationDelay: '0.2s' }}>
              
              {/* Cabeçalho e pré-salvos apenas se houver */}
              {savedNames.length > 0 ? (
                <>
                  <div className="flex justify-between items-center" id="quick-add-panel">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                      <Zap size={14} className="text-amber-500 fill-amber-500" />
                      Seus Nomes Pré-Salvos (1 clique)
                    </span>
                    <button 
                      onClick={() => setShowClearConfirm(true)}
                      className="text-[10px] text-white/40 hover:text-red-400 transition-colors"
                      title="Limpar sugestões locais"
                    >
                      Limpar sugestões
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {savedNames.filter(item => !addedThisSession.includes(item.nome.toLowerCase()) && !activeEvent?.nomes.some(n => n.nome.toLowerCase() === item.nome.toLowerCase())).map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickRegister(item.nome, item.sexo)}
                        className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-xs flex items-center gap-2 hover:bg-white/10 transition-colors text-white font-medium cursor-pointer"
                      >
                        <span className={`font-black ${item.sexo === 'F' ? 'text-pink-400' : 'text-blue-400'}`}>
                          {item.sexo === 'F' ? '♀️' : '♂️'}
                        </span>
                        <span className="uppercase">+ {item.nome}</span>
                      </button>
                    ))}
                    {savedNames.every(item => addedThisSession.includes(item.nome.toLowerCase()) || activeEvent?.nomes.some(n => n.nome.toLowerCase() === item.nome.toLowerCase())) && (
                      <p className="text-xs text-indigo-300/60 font-medium py-1">✅ Todos os seus nomes salvos já foram adicionados!</p>
                    )}
                  </div>

                  {/* Botão para abrir formulário / X para fechar */}
                  {!showAddForm ? (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setShowAddForm(true)}
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-bold uppercase tracking-widest shadow-lg shadow-indigo-600/30 border border-indigo-400/30 btn-shimmer"
                      id="btn-adicionar-novo-nome"
                    >
                      <span className="text-xl leading-none font-light">+</span> Adicionar novo nome
                    </motion.button>
                  ) : (
                    <>
                      <div className="flex justify-between items-center border-t border-white/10 pt-4">
                        <h2 className="text-sm font-semibold border-l-4 border-indigo-500 pl-3 uppercase tracking-wider text-white">
                          Adicionar nomes à lista
                        </h2>
                        <button
                          onClick={() => { setShowAddForm(false); setInputNome(''); setInputSexo(''); }}
                          className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="Fechar"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                          <div className="flex-1 w-full">
                            <label htmlFor="input-nome-participante" className="block text-xs uppercase tracking-widest text-indigo-300 mb-1.5 font-bold">Nome e Sobrenome</label>
                            <div className={`input-glow-wrapper ${(isInputFocused || inputNome.length > 0) ? 'is-active' : ''}`}>
                              <div className="input-inner">
                                <div className="relative">
                                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none transition-colors duration-300 ${isInputFocused || inputNome ? 'text-indigo-400' : 'text-white/40'}`}><User size={16} /></span>
                                  <input
                                    ref={inputRef}
                                    id="input-nome-participante"
                                    type="text"
                                    required
                                    value={inputNome}
                                    onChange={(e) => setInputNome(e.target.value)}
                                    onFocus={() => setIsInputFocused(true)}
                                    onBlur={() => setIsInputFocused(false)}
                                    placeholder="Ex: João Silva"
                                    className="w-full pl-9 pr-4 h-[56px] bg-black/60 border-0 outline-none rounded-[11px] placeholder:text-white/20 text-base font-semibold text-white uppercase"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="w-full md:w-[260px] shrink-0">
                            <span className="block text-xs uppercase tracking-widest text-indigo-300 mb-1.5 font-bold">Gênero</span>
                            <div className="grid grid-cols-2 gap-2 h-[56px]" id="gender-selection-grid">
                              <label className={`flex items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-all duration-150 cursor-pointer ${inputSexo === 'M' ? 'border-indigo-500/50 bg-indigo-500/20 text-white font-bold shadow-lg shadow-indigo-500/10' : 'border-white/25 bg-white/10 text-white/80 hover:bg-white/20'}`}>
                                <input type="radio" name="sexo" value="M" checked={inputSexo === 'M'} onChange={() => setInputSexo('M')} className="sr-only" />
                                <span className="text-blue-400 font-bold text-base leading-none mt-[1px]">♂️</span>
                                <span>Masculino</span>
                              </label>
                              <label className={`flex items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-all duration-150 cursor-pointer ${inputSexo === 'F' ? 'border-pink-500/50 bg-pink-500/20 text-white font-bold shadow-lg shadow-pink-500/10' : 'border-white/25 bg-white/10 text-white/80 hover:bg-white/20'}`}>
                                <input type="radio" name="sexo" value="F" checked={inputSexo === 'F'} onChange={() => setInputSexo('F')} className="sr-only" />
                                <span className="text-pink-400 font-bold text-base leading-none mt-[1px]">♀️</span>
                                <span>Feminino</span>
                              </label>
                            </div>
                          </div>
                        </div>
                        <button type="submit" className="w-full h-[52px] bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all uppercase tracking-widest text-xs md:text-sm cursor-pointer flex items-center justify-center gap-1.5 btn-shimmer" id="btn-confirmar-presenca">
                          <span>Inserir na Lista</span>
                        </button>
                      </form>
                    </>
                  )}
                </>
              ) : (
                /* Sem pré-salvos: exibe o formulário completo direto */
                <>
                  <h2 className="text-sm md:text-lg font-semibold border-l-4 border-indigo-500 pl-3 uppercase tracking-wider text-white">
                    Adicionar nomes à lista (um por vez)
                  </h2>
                  <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1 w-full">
                        <label htmlFor="input-nome-participante" className="block text-[10px] md:text-xs uppercase tracking-widest text-indigo-300 mb-1.5 font-bold">Nome e Sobrenome</label>
                        <div className={`input-glow-wrapper ${(isInputFocused || inputNome.length > 0) ? 'is-active' : ''}`}>
                          <div className="input-inner">
                            <div className="relative">
                              <span className={`absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none transition-colors duration-300 ${isInputFocused || inputNome ? 'text-indigo-400' : 'text-white/40'}`}><User size={16} /></span>
                              <input
                                ref={inputRef}
                                id="input-nome-participante"
                                type="text"
                                required
                                value={inputNome}
                                onChange={(e) => setInputNome(e.target.value)}
                                onFocus={() => setIsInputFocused(true)}
                                onBlur={() => setIsInputFocused(false)}
                                placeholder="Ex: João Silva"
                                className="w-full pl-9 pr-4 h-[52px] md:h-[56px] bg-black/60 border-0 outline-none rounded-[11px] placeholder:text-white/20 text-sm md:text-base font-semibold text-white uppercase"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="w-full md:w-[260px] shrink-0">
                        <span className="block text-[10px] md:text-xs uppercase tracking-widest text-indigo-300 mb-1.5 font-bold">Gênero</span>
                        <div className="grid grid-cols-2 gap-2 h-[52px] md:h-[56px]" id="gender-selection-grid">
                          <label className={`flex items-center justify-center gap-1.5 rounded-xl border text-xs md:text-sm font-medium transition-all duration-150 cursor-pointer ${inputSexo === 'M' ? 'border-indigo-500/50 bg-indigo-500/20 text-white font-bold shadow-lg shadow-indigo-500/10' : 'border-white/25 bg-white/10 text-white/80 hover:bg-white/20'}`}>
                            <input type="radio" name="sexo" value="M" checked={inputSexo === 'M'} onChange={() => setInputSexo('M')} className="sr-only" />
                            <span className="text-blue-400 font-bold text-sm md:text-base leading-none mt-[1px]">♂️</span>
                            <span>Masculino</span>
                          </label>
                          <label className={`flex items-center justify-center gap-1.5 rounded-xl border text-xs md:text-sm font-medium transition-all duration-150 cursor-pointer ${inputSexo === 'F' ? 'border-pink-500/50 bg-pink-500/20 text-white font-bold shadow-lg shadow-pink-500/10' : 'border-white/25 bg-white/10 text-white/80 hover:bg-white/20'}`}>
                            <input type="radio" name="sexo" value="F" checked={inputSexo === 'F'} onChange={() => setInputSexo('F')} className="sr-only" />
                            <span className="text-pink-400 font-bold text-sm md:text-base leading-none mt-[1px]">♀️</span>
                            <span>Feminino</span>
                          </label>
                        </div>
                      </div>
                    </div>
                    <button type="submit" className="w-full h-[52px] bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all uppercase tracking-widest text-xs md:text-sm cursor-pointer flex items-center justify-center gap-1.5 btn-shimmer" id="btn-confirmar-presenca">
                      <span>Inserir na Lista</span>
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-10 md:py-12 bg-white/5 backdrop-blur-md rounded-2xl border border-dashed border-white/10 mx-auto mb-8 md:mb-12">
              <Calendar className="mx-auto text-indigo-300 mb-3" size={36} />
              <h3 className="font-semibold text-white text-sm md:text-base">Sem Evento Ativo</h3>
              <p className="text-indigo-200/65 text-[10px] md:text-xs mt-1">Crie um novo evento no painel administrativo para habilitar o envio de nomes.</p>
            </div>
          )}
 
          {/* Live List Registry Title & Search */}
          {activeEvent && (
            <div className="mb-8 animate-fade-in-up" id="guest-list-container" style={{ animationDelay: '0.25s' }}>
              {/* Unified List layout */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl" id="unified-list-card">
                <div className="bg-white/5 border-b border-white/10 py-3 px-4 flex justify-between items-center">
                  <span className="font-bold text-xs uppercase tracking-widest text-indigo-300 flex items-center gap-1.5">
                    <Users size={16} /> Lista de Participantes
                  </span>
                  <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono border border-indigo-500/20">
                    {filteredParticipants.length} {filteredParticipants.length === 1 ? 'nome' : 'nomes'}
                  </span>
                </div>
                
                <div className="p-1.5 space-y-1 divide-y divide-white/5">
                  {filteredParticipants.length > 0 ? (
                    (() => {
                      let devId = '';
                      if (typeof window !== 'undefined') {
                        devId = localStorage.getItem('gestor_eventos_device_id') || '';
                      }
                      return [...filteredParticipants].sort((a, b) => {
                        const aIsMine = a.device_id === devId;
                        const bIsMine = b.device_id === devId;
                        if (aIsMine && !bIsMine) return -1;
                        if (!aIsMine && bIsMine) return 1;
                        return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
                      }).map((p, index) => {
                        const isMine = p.device_id === devId;
                        return (
                          <div key={p.id} className="group flex justify-between items-center py-2.5 px-3 md:py-3 md:px-4 hover:bg-white/5 rounded-lg duration-150 transition-colors">
                            <div className="flex items-center gap-2 pr-2 overflow-hidden">
                              <span className="text-white/30 font-mono text-xs w-4 text-right flex-shrink-0">{index + 1}.</span>
                              <span className={`flex-shrink-0 font-black text-sm ${p.sexo === 'F' ? 'text-pink-400' : 'text-blue-400'}`} title={p.sexo === 'F' ? 'Feminino' : 'Masculino'}>
                                {p.sexo === 'F' ? '♀️' : '♂️'}
                              </span>
                              <span className="text-sm font-semibold text-white truncate uppercase">
                                {p.nome}
                              </span>
                            </div>
                            
                            {isMine && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleStartEdit(p)}
                                  className="p-2 text-indigo-300 bg-white/5 hover:text-white hover:bg-indigo-500/40 rounded-lg duration-150 transition-colors shadow-sm"
                                  title="Editar este registro"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={() => setDeletingParticipant({ id: p.id, nome: p.nome })}
                                  className="p-2 text-red-400 bg-white/5 hover:text-white hover:bg-red-500/60 rounded-lg duration-150 transition-colors shadow-sm"
                                  title="Remover"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <div className="text-center py-8 text-xs text-indigo-200/50 font-medium">
                      Nenhum convidado na lista.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Dynamic Pop-up User Edit Modal */}
        <AnimatePresence>
          {editingParticipant && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md" id="editing-overlay">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-[#0b1220] rounded-3xl max-w-sm w-full p-5 md:p-6 shadow-2xl border border-white/10 text-white"
              >
                <h3 className="text-sm font-semibold border-l-4 border-indigo-500 pl-3 uppercase tracking-wider text-white mb-4">Editar seu Registro</h3>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="edit-nome-input" className="block text-xs uppercase tracking-widest text-indigo-300 mb-1 font-bold">CORRIGIR NOME</label>
                    <input
                      id="edit-nome-input"
                      type="text"
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 font-medium transition-colors"
                    />
                  </div>

                  <div>
                    <span className="block text-xs uppercase tracking-widest text-indigo-300 mb-1.5 font-bold">RECLASSIFICAR SEXO</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditSexo('M')}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                          editSexo === 'M' 
                            ? 'border-indigo-500/50 bg-indigo-500/20 text-white shadow-lg' 
                            : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        ♂️ Masculino
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditSexo('F')}
                        className={`py-2.5 px-3 rounded-lg border text-xs font-bold transition-all ${
                          editSexo === 'F' 
                            ? 'border-pink-500/50 bg-pink-500/20 text-white shadow-lg' 
                            : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        ♀️ Feminino
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 mt-5 sm:justify-end text-xs font-bold">
                  <button
                    onClick={() => setEditingParticipant(null)}
                    className="w-full sm:w-auto px-4 py-2.5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Salvar Correção</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Styled Footer Block managed by settings in Admin */}
        <footer className="bg-indigo-600/10 backdrop-blur-md pt-10 pb-6 text-center text-indigo-200/80 border-t border-white/10" id="brand-footer">
          <div className="container mx-auto px-4 max-w-4xl flex flex-col items-center">
            
            {/* Titulo 2 */}
            <h2 className="text-xl md:text-2xl font-light text-white max-w-md mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {config?.titulo_2 || DEFAULT_CONFIG.titulo_2}
            </h2>

            {/* Logo Footer */}
            {config?.logo_url ? (
              <img 
                src={config.logo_url} 
                alt="Logo do Rodapé" 
                className="h-12 w-12 object-cover rounded-full border border-white/10 opacity-80"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/eventfallback/200/200';
                }}
              />
            ) : (
              <div className="h-10 w-10 border border-white/10 text-indigo-300 rounded-full flex items-center justify-center">
                <Users size={18} />
              </div>
            )}

            {/* Admin Access */}
            <a
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[10px] font-mono tracking-wider uppercase text-white/40 hover:text-white/70 transition-colors bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/10 mt-4"
            >
              Painel Admin
            </a>

            {/* Footer Bar Copyright */}
            <div className="w-full border-t border-white/5 pt-5 flex flex-col sm:flex-row justify-between items-center text-[11px] text-white/55 font-medium">
              <p id="copyright-text">{config?.copyright || DEFAULT_CONFIG.copyright}</p>
              <p className="font-mono tracking-widest text-[9px] uppercase mt-1 sm:mt-0">
                POWERED BY Jay Brelaz Dev
              </p>
            </div>

          </div>
        </footer>

        {/* Toast Alert Indicator */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`fixed bottom-4 right-4 z-50 text-xs font-bold px-4 py-3 rounded-xl shadow-lg border flex items-center gap-1.5 ${
                toast.type === 'success' 
                  ? 'bg-emerald-950/80 text-emerald-250 border-emerald-500/30 backdrop-blur-md' 
                  : 'bg-red-950/80 text-red-250 border-red-500/30 backdrop-blur-md'
              }`}
              id="toast-notification"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              {toast.message}
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
                className="bg-[#0b1220]/95 border border-white/10 rounded-3xl p-5 md:p-6 max-w-sm w-full shadow-2xl relative text-center text-white"
              >
                <div className="mx-auto w-11 h-11 md:w-12 md:h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
                  <AlertTriangle size={22} />
                </div>
                <h3 className="text-sm md:text-base font-extrabold text-white mb-2 uppercase tracking-wider">Remover Presença?</h3>
                <p className="text-[10px] md:text-xs text-indigo-200/70 mb-5 leading-relaxed">
                  Deseja realmente remover seu nome (&quot;<strong className="text-white font-bold">{deletingParticipant.nome}</strong>&quot;) desta lista?
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setDeletingParticipant(null)}
                    className="w-full sm:w-auto px-4 py-2.5 border border-white/10 bg-white/5 text-white/90 rounded-xl text-xs font-semibold hover:bg-white/10 duration-100 cursor-pointer"
                  >
                    Manter Presença
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

        {/* Non-blocking Confirm Modal for Clearing Suggestions Cache */}
        <AnimatePresence>
          {showClearConfirm && (
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
                className="bg-[#0b1220]/95 border border-white/10 rounded-3xl p-5 md:p-6 max-w-sm w-full shadow-2xl relative text-center text-white"
              >
                <div className="mx-auto w-11 h-11 md:w-12 md:h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                  <AlertTriangle size={22} />
                </div>
                <h3 className="text-sm md:text-base font-extrabold text-white mb-2 uppercase tracking-wider">Limpar Sugestões?</h3>
                <p className="text-[10px] md:text-xs text-indigo-200/70 mb-5 leading-relaxed">
                  Deseja limpar seus nomes sugeridos pré-salvos? Isto remove apenas os dados de preenchimento rápido do seu navegador, sem alterar a lista do evento.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="w-full sm:w-auto px-4 py-2.5 border border-white/10 bg-white/5 text-white/90 rounded-xl text-xs font-semibold hover:bg-white/10 duration-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClearConfirm(false);
                      confirmClearPreSaved();
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold duration-100 shadow-md cursor-pointer"
                  >
                    Limpar Cache
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    );
  }
