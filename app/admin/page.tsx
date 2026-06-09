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
  Moon,
  Send,
  Download
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
  getSupabaseClient,
  generateId,
  formatDateBr,
  uploadImage
} from '@/lib/db';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'events' | 'branding'>('events');
  const [isDbConnected, setIsDbConnected] = useState(false);

  // PWA Install state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setIsInstalled(true));
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

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
  const [editNomesOcultos, setEditNomesOcultos] = useState('');

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
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Custom non-blocking confirmation dialog overlays
  const [deletingEvent, setDeletingEvent] = useState<{ id: string; numero: number } | null>(null);
  const [deletingParticipant, setDeletingParticipant] = useState<{ id: string; nome: string } | null>(null);
  const [showWebhookModal, setShowWebhookModal] = useState(false);
  const [sendingWebhook, setSendingWebhook] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Session-based toggle for overriding "Nova Oração" button visibility
  const [showCreateEventOverride, setShowCreateEventOverride] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('admin_show_create_override') === 'true';
    }
    return false;
  });

  const showCreateButton = (() => {
    if (showCreateEventOverride) return true;
    if (events.length === 0) return true;
    const last = events[0];
    const dt = new Date(last.data + 'T' + (last.hora_inicio || '20:00'));
    return new Date() >= dt;
  })();

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

  // Load all configurations & events list (used on initial load and branding changes)
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
      setEditNomesOcultos(brandCnf.nomes_ocultos || '');

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

  // Lightweight refresh: apenas atualiza a lista de eventos sem resetar selectedEventId
  // Usado exclusivamente pelo callback de real-time para evitar closure stale
  const refreshEventsOnly = async () => {
    try {
      const allEv = await listAllEventos();
      setEvents(allEv);
    } catch (e) {
      console.error('Erro ao atualizar lista de eventos em tempo real:', e);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStatsAndData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Auto-close create event form when button is not allowed
  useEffect(() => {
    if (!showCreateButton) {
      setShowCreateEventForm(false);
      setIsEditingEvent(false);
    }
  }, [showCreateButton]);

  // Real-time subscription for live updates (eventos + marca_config)
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;

    const channel = sb
      .channel('admin-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'eventos' },
        () => {
          // Usa refreshEventsOnly para não resetar o evento selecionado (closure stale)
          refreshEventsOnly();
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'config_marca' },
        () => {
          loadStatsAndData();
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update selected event whenever it exists
  const selectedEvent = events.find(e => e.id === selectedEventId);

  // Handle saving of branding configs
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedConfig: ConfigMarca = {
        ...config,
        titulo: editTitulo.trim() || DEFAULT_CONFIG.titulo,
        sub_titulo: editSubTitulo.trim() || DEFAULT_CONFIG.sub_titulo,
        titulo_2: editTitulo2.trim() || DEFAULT_CONFIG.titulo_2,
        logo_url: editLogoUrl.trim() || DEFAULT_CONFIG.logo_url,
        banner_url: editBannerUrl.trim() || DEFAULT_CONFIG.banner_url,
        copyright: editCopyright.trim() || DEFAULT_CONFIG.copyright,
        light_mode: editLightMode,
        nomes_ocultos: editNomesOcultos.trim()
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

    // Verifica duplicidade na lista completa (evento + fixos)
    const allNomesCheck = [
      ...selectedEvent.nomes,
      ...(config.nomes_fixo?.filter(fixo =>
        !selectedEvent.nomes.some(n => n.id === fixo.id)
      ) || [])
    ];
    const dup = allNomesCheck.some(p => p.id !== pId && p.nome.toLowerCase() === trimmed.toLowerCase());
    if (dup) {
      showToast("Outro participante já possui esse nome!", "error");
      return;
    }

    // Determina se o participante é fixo (pode estar só em config.nomes_fixo)
    const pInEvent = selectedEvent.nomes.find(p => p.id === pId);
    const pInFixo = config.nomes_fixo?.find(fp => fp.id === pId);
    const pToEdit = pInEvent || pInFixo;

    if (!pToEdit) return;

    // Atualiza no evento: se já está na lista do evento, atualiza; se for fixo ausente, adiciona
    let updatedNomes: typeof selectedEvent.nomes;
    if (pInEvent) {
      updatedNomes = selectedEvent.nomes.map(p =>
        p.id === pId ? { ...p, nome: trimmed, sexo: adminEditSexoValue } : p
      ).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    } else {
      // Fixo que não estava na lista do evento, adiciona com edição
      updatedNomes = [
        ...selectedEvent.nomes,
        { ...pToEdit, nome: trimmed, sexo: adminEditSexoValue }
      ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }

    const updatedEv = {
      ...selectedEvent,
      nomes: updatedNomes
    };

    try {
      const saved = await saveEvento(updatedEv);
      setEvents(events.map(ev => ev.id === saved.id ? saved : ev));

      // Se for fixo, atualiza também em marca_config
      if (pToEdit.isFixo) {
        const updatedConfig = {
          ...config,
          nomes_fixo: config.nomes_fixo?.map(fp =>
            fp.id === pId
              ? { ...fp, nome: trimmed, sexo: adminEditSexoValue }
              : fp
          )
        };
        await saveBrandingConfig(updatedConfig);
        setConfig(updatedConfig);
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

    let isFixoDeleted = false;
    let fixoParticipant = undefined;

    // Deleta das configurações globais se for um nome fixo
    if (config.nomes_fixo && config.nomes_fixo.some(p => p.id === pId)) {
      fixoParticipant = config.nomes_fixo.find(p => p.id === pId);
      const updatedFixo = config.nomes_fixo.filter(p => p.id !== pId);
      const updatedConfig = { ...config, nomes_fixo: updatedFixo };
      try {
        await saveBrandingConfig(updatedConfig);
        setConfig(updatedConfig);
        isFixoDeleted = true;
      } catch (err) {
        console.error("Erro ao remover nome fixo", err);
      }
    }

    let updatedNomes = [...selectedEvent.nomes];

    if (isFixoDeleted) {
      // Mantém no evento atual, mas remove a flag de fixo
      const existingIdx = updatedNomes.findIndex(p => p.id === pId);
      if (existingIdx >= 0) {
        updatedNomes[existingIdx] = { ...updatedNomes[existingIdx], isFixo: false };
      } else if (fixoParticipant) {
        updatedNomes.push({ ...fixoParticipant, isFixo: false });
        updatedNomes.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      }
    } else {
      // Se não era fixo, apenas remove da lista do evento
      updatedNomes = updatedNomes.filter(p => p.id !== pId);
    }

    const updatedEv = {
      ...selectedEvent,
      nomes: updatedNomes
    };

    try {
      const saved = await saveEvento(updatedEv);
      setEvents(events.map(ev => ev.id === saved.id ? saved : ev));
      showToast(isFixoDeleted ? "Nome removido dos fixos, mas mantido neste evento." : "Nome removido com sucesso.");
    } catch (err: any) {
      showToast(`Erro ao deletar participante: ${err.message || err}`, "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-700 flex items-center justify-center font-bold">
        <div className="text-center font-mono text-sm">
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
            <p className="text-sm text-indigo-300/80 mb-4">Insira o código de administrador para habilitar alterações no sistema.</p>
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
            <p className="text-sm text-white/40 italic">Dica de preview: Digite &quot;1234&quot;</p>
          </div>
        ) : (
          <div>
            {/* Dashboard Tabs Selection - scrollável horizontalmente no mobile */}
            <div className="flex items-center justify-between border-b border-white/10 mb-5 md:mb-8" id="admin-tabs">
              <div className="flex overflow-x-auto no-scrollbar">
                {[
                  { id: 'events', label: 'Listas de Orações', labelFull: 'Gerenciar Listas & Orações', icon: Calendar },
                  { id: 'branding', label: 'Config', labelFull: 'Configurações', icon: Layout }
                ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 py-2 md:py-2.5 px-2 md:px-3 text-xs font-bold border-b-2 transition-all cursor-pointer uppercase tracking-widest whitespace-nowrap shrink-0 ${isSelected
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

              {/* Install PWA Icon */}
              {deferredPrompt && !isInstalled && (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center justify-center p-2 text-indigo-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer ml-4 shrink-0"
                  title="Instalar App"
                >
                  <Download size={18} />
                </button>
              )}
            </div>

            {/* Content Switcher */}
            <div className="space-y-6">

              {/* TAB 1: LISTAS E GESTÃO DE PARTICIPANTES */}
              {activeTab === 'events' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-8" id="tab-events-root">

                  {/* Left panel: List of events */}
                  <div className="lg:col-span-4 space-y-3 md:space-y-4 animate-fade-in-up lg:sticky lg:top-5 lg:self-start">
                    <div className="pb-3">
                      <div className={`bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg bg-white/10 shadow-lg px-5 py-3 mb-3 ${!showCreateButton ? 'hidden lg:block' : ''}`}>
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-indigo-300">Orações</h4>
                          {showCreateButton && (
                            <button
                              onClick={() => {
                                setShowCreateEventForm(!showCreateEventForm);
                                if (showCreateEventForm) setIsEditingEvent(false);
                              }}
                              className={`bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-1 px-3 rounded-lg border border-indigo-500/50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md ${showCreateEventForm ? 'bg-indigo-700' : ''}`}
                            >
                              {showCreateEventForm ? <Calendar size={12} /> : <Plus size={12} />}
                              <span>{showCreateEventForm ? "Fechar" : "Nova Oração"}</span>
                            </button>
                          )}
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
                            className="bg-black/40 p-4 rounded-xl border border-white/10 mb-4 space-y-4 overflow-hidden text-sm"
                          >
                            <div className="flex justify-center text-white mb-2">
                              <h3 className="text-base font-bold uppercase tracking-wider text-indigo-300">{isEditingEvent ? "Editar Oração" : "Escolha a Data da Oração"}</h3>
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
                                  className="bg-white/5 hover:bg-white/10 text-white/90 font-semibold py-2 px-3 rounded-lg transition-colors border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer text-sm shrink-0"
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
                                className="w-1/2 bg-white/10 hover:bg-white/20 text-white/80 font-semibold py-3 px-3 rounded-lg transition-colors border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer text-sm"
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
                                  className={`snap-start shrink-0 w-[calc(20%-4px)] lg:w-full min-w-[62px] lg:min-w-0 aspect-[5/4] lg:aspect-auto rounded-lg border transition-all cursor-pointer flex flex-col lg:flex-row items-center justify-center lg:justify-between text-center lg:text-left p-0.5 lg:px-4 lg:py-3 relative overflow-hidden mt-2 lg:mt-0 first:ml-3 lg:first:ml-0 ${isSelected
                                    ? 'border-violet-400 bg-violet-500/25 ring-2 ring-violet-400/50 scale-[1.02] lg:scale-[1.01]'
                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                                    }`}
                                  onClick={() => setSelectedEventId(ev.id)}
                                >
                                  <span className="font-mono text-base lg:text-sm font-black text-white leading-none">
                                    #{ev.numero}
                                  </span>
                                  <span className="text-[9px] font-bold text-white/70 leading-tight mt-0 lg:mt-0">
                                    {new Date(ev.data + 'T00:00:00').toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit', year: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })
                          ) : (
                            <div className="w-full text-center py-8 text-sm text-indigo-200/50">
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
                            <span className="text-base md:text-xl font-bold text-violet-400 font-mono">
                              ORAÇÃO #{selectedEvent.numero}
                            </span>
                            <h3 className="text-xs md:text-sm font-bold text-white mt-1 capitalize">
                              {formatDateBr(selectedEvent.data).replace(/ de \d{4}/, '')}
                            </h3>
                            <p className="text-sm text-indigo-200/60 flex items-center gap-1.5 mt-1 font-medium">
                              <Clock size={13} className="text-indigo-300" />
                              Início: {(selectedEvent.hora_inicio || '20:00').slice(0, 5)}
                            </p>
                          </div>

                          <div className="bg-indigo-500/10 px-3 md:px-4 py-2 rounded-xl text-center border border-indigo-500/20 min-w-[64px]">
                            <span className="block text-base font-black text-white font-mono leading-none">{selectedEvent.nomes.length + (config.nomes_fixo?.filter(fixo => !selectedEvent.nomes.some(n => n.id === fixo.id)).length || 0)}</span>
                            <span className="text-[10px] md:text-xs uppercase font-bold text-indigo-300/80 tracking-wide mt-1 block">Nomes</span>
                          </div>
                        </div>

                        {/* Fast manual insert form */}
                        <div className="flex gap-2 mb-3">
                          <button
                            type="button"
                            onClick={() => setShowAddNomeForm(!showAddNomeForm)}
                            className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-sm font-bold py-2 px-4 rounded-xl border border-indigo-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>{showAddNomeForm ? "Fechar" : "Adicionar Nome"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleEditEvent}
                            className="bg-white/10 hover:bg-white/20 text-white/80 text-sm font-bold px-4 rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10 shrink-0 cursor-pointer"
                            title="Editar data e horário desta oração"
                          >
                            <Edit size={14} />
                            <span className="hidden sm:inline">Editar dados</span>
                          </button>
                        </div>

                        {showAddNomeForm && (
                          <form onSubmit={handleAdminAddParticipant} className="mb-5 flex flex-col gap-2">
                            <label className="block text-sm font-bold text-indigo-300 uppercase tracking-widest pl-1">Inserir nome na lista</label>
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
                                  className={`flex-1 flex items-center justify-center gap-1 text-sm font-bold rounded-lg duration-100 cursor-pointer ${adminAddSexo === 'M' ? 'bg-indigo-600 text-white shadow' : 'text-white/40 hover:text-white'}`}
                                >
                                  ♂️ <span className="ml-0.5">Masc.</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAdminAddSexo('F')}
                                  className={`flex-1 flex items-center justify-center gap-1 text-sm font-bold rounded-lg duration-100 cursor-pointer ${adminAddSexo === 'F' ? 'bg-pink-500/80 text-white shadow' : 'text-white/40 hover:text-white'}`}
                                >
                                  ♀️ <span className="ml-0.5">Fem.</span>
                                </button>
                              </div>
                              <button
                                type="submit"
                                className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-sm font-bold px-4 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 uppercase tracking-wider cursor-pointer border border-indigo-500/20 shrink-0"
                              >
                                <Plus size={16} />
                                <span>Adicionar</span>
                              </button>
                            </div>
                          </form>
                        )}

                        {/* List items representation */}
                        <div className="flex flex-col gap-1.5 mb-3">
                          <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest pl-1 mt-5">Lista de Intercessados</h4>

                          {/* Filters */}
                          <div className="flex bg-black/40 p-1 border border-white/10 rounded-lg overflow-x-auto w-full no-scrollbar">
                            {(['all', 'M', 'F', 'fixo'] as const).map(type => (
                              <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`flex-1 py-1 px-1.5 text-[10px] font-bold rounded uppercase tracking-wider duration-100 cursor-pointer whitespace-nowrap text-center min-w-[40px] ${filterType === type ? 'bg-indigo-500 text-white shadow' : 'text-white/40 hover:text-white'}`}
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
                            const nomesOcultosArr = config.nomes_ocultos
                              ? config.nomes_ocultos.split('\n').map(n => n.trim().toLowerCase()).filter(Boolean)
                              : [];
                            const filteredNomes = allNomes.filter(p => {
                              if (filterType === 'fixo') return p.isFixo;
                              if (filterType === 'M') return p.sexo === 'M';
                              if (filterType === 'F') return p.sexo === 'F';
                              return true;
                            }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

                            return filteredNomes.length > 0 ? (
                              filteredNomes.map((p, idx) => {
                                const isEditing = adminEditingParticipantId === p.id;
                                const isSelected = selectedRowId === p.id;
                                const isOculto = nomesOcultosArr.includes(p.nome.trim().toLowerCase());
                                return (
                                  <div
                                    key={p.id}
                                    onClick={() => !isEditing && setSelectedRowId(isSelected ? null : p.id)}
                                    className={`relative p-2 flex justify-between items-center text-xs hover:bg-white/5 transition-all cursor-pointer overflow-hidden ${isSelected ? 'py-4 bg-white/5' : ''}`}
                                  >
                                    {isEditing ? (
                                      <div className="flex flex-wrap items-center gap-2 flex-grow" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="text"
                                          value={adminEditNomeValue}
                                          onChange={(e) => setAdminEditNomeValue(e.target.value)}
                                          className="px-3 py-2 bg-black/50 border border-white/10 text-white rounded text-sm font-semibold focus:outline-none focus:border-indigo-500 min-w-[250px] w-full sm:w-auto"
                                        />
                                        <select
                                          value={adminEditSexoValue}
                                          onChange={(e) => setAdminEditSexoValue(e.target.value as 'M' | 'F')}
                                          className="p-1 px-2.5 bg-black border border-white/10 rounded text-sm font-medium text-white focus:outline-none h-full"
                                        >
                                          <option value="M">♂️ Masculino</option>
                                          <option value="F">♀️ Feminino</option>
                                        </select>
                                        <button
                                          onClick={() => saveEditedParticipant(p.id)}
                                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-1 px-2.5 rounded cursor-pointer"
                                        >
                                          Salvar
                                        </button>
                                        <button
                                          onClick={() => setAdminEditingParticipantId(null)}
                                          className="bg-white/10 hover:bg-white/20 text-white/80 text-sm font-medium py-1 px-2 rounded border border-white/10 cursor-pointer"
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-2 min-w-0 pr-4">
                                          <span className="font-mono text-xs text-indigo-300 font-bold w-4 shrink-0">
                                            {idx + 1}
                                          </span>
                                          <span className="shrink-0 text-xs" title={p.sexo === 'F' ? 'Feminino' : 'Masculino'}>{p.sexo === 'F' ? '♀️' : '♂️'}</span>
                                          <span className="font-semibold text-white uppercase text-xs">
                                            {p.nome}
                                          </span>
                                          {isOculto && (
                                            <span className="text-[8px] uppercase tracking-wider bg-amber-500/30 text-amber-200 px-1 py-0.5 rounded font-bold border border-amber-500/30 shrink-0 ml-1">
                                              Oculto
                                            </span>
                                          )}
                                          {p.isFixo && (
                                            <span className="text-[8px] uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-1 py-0.5 rounded font-bold border border-indigo-500/30 shrink-0 ml-1">
                                              Fixo
                                            </span>
                                          )}

                                        </div>

                                        <div className={`absolute right-0 top-0 bottom-0 flex items-stretch transition-transform duration-300 ${isSelected ? 'translate-x-0' : 'translate-x-full'}`}>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); startEditingParticipant(p); }}
                                            className="px-4 flex items-center justify-center transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white"
                                            title="Editar nome ou sexo"
                                          >
                                            <Edit size={14} />
                                          </button>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setDeletingParticipant({ id: p.id, nome: p.nome }); }}
                                            className="px-4 flex items-center justify-center transition-all cursor-pointer bg-red-600 hover:bg-red-500 text-white"
                                            title="Deletar participante"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-12 text-sm text-indigo-200/50">
                                Nenhum participante encontrado com os filtros atuais.
                              </div>
                            );
                          })()}
                        </div>

                        {/* Botão Enviar Lista */}
                        {config.copyright && (
                          <div className="flex justify-center mt-6">
                            <button
                              onClick={() => setShowWebhookModal(true)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-500/40 text-white text-sm font-bold rounded-lg transition-all shadow-lg cursor-pointer"
                            >
                              <Send size={15} />
                              Enviar lista de nomes no Grupo
                            </button>
                          </div>
                        )}

                        <div className="flex justify-between items-center mt-6">
                          <button
                            onClick={() => setDeletingEvent({ id: selectedEvent.id, numero: selectedEvent.numero })}
                            className="text-sm font-bold text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1.5 px-1 cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>

                          <a
                            href={`/${selectedEvent.numero}`}
                            target="_blank"
                            className="text-sm font-bold text-indigo-400/60 hover:text-indigo-400 border border-indigo-400/20 hover:border-indigo-400/40 rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye size={14} />
                            Visualizar página
                          </a>
                        </div>

                      </div>
                    ) : (
                      <div className="bg-white/5 border border-dashed border-white/10 rounded-3xl p-8 text-center text-indigo-205/60 text-sm">
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
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-wider pl-3 border-l-4 border-indigo-500">Customização Visual da Marca</h3>
                    <p className="text-sm text-indigo-200/60 mt-1 font-medium">Todas as modificações são refletidas instantaneamente na página de inscrição pública dos participantes.</p>
                  </div>

                  <form onSubmit={handleSaveBranding} className="space-y-4 text-sm font-semibold">



                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Title */}
                      <div>
                        <label htmlFor="title-field" className="block text-indigo-300 mb-1 uppercase tracking-widest text-xs">TÍTULO PRINCIPAL</label>
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
                        <label htmlFor="subtitle-field" className="block text-indigo-300 mb-1 uppercase tracking-widest text-xs">SUBTÍTULO</label>
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
                      <label htmlFor="title2-field" className="block text-indigo-300 mb-1 uppercase tracking-widest text-xs">TEXTO DE DESTAQUE DO RODAPÉ</label>
                      <textarea
                        id="title2-field"
                        required
                        value={editTitulo2}
                        onChange={(e) => setEditTitulo2(e.target.value)}
                        placeholder="Ex: Não perca a melhor página de sexta!"
                        rows={3}
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium resize-none"
                      />
                    </div>

                    {/* Webhook Lista */}
                    <div>
                      <label htmlFor="copyright-field" className="block text-indigo-300 mb-1 uppercase tracking-widest text-xs">Webhook Lista</label>
                      <input
                        id="copyright-field"
                        type="url"
                        value={editCopyright}
                        onChange={(e) => setEditCopyright(e.target.value)}
                        placeholder="Ex: https://webhook.site/seu-id"
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div className="border-t border-white/10 pt-4"></div>

                    {/* Nomes Ocultos */}
                    <div>
                      <label htmlFor="nomes-ocultos-field" className="block text-indigo-300 mb-1 uppercase tracking-widest text-xs">Nomes Ocultos (Webhook)</label>
                      <textarea
                        id="nomes-ocultos-field"
                        value={editNomesOcultos}
                        onChange={(e) => setEditNomesOcultos(e.target.value)}
                        placeholder="Insira um nome por linha que não deve ser enviado no payload do Webhook&#10;Ex:&#10;João Silva&#10;Maria Santos"
                        rows={4}
                        className="w-full px-3 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-medium resize-y"
                      />
                      <p className="text-[10px] text-indigo-200/50 mt-1 font-normal">Esses nomes continuarão aparecendo na lista pública e no admin com a tag <span className="text-amber-300 font-semibold">[oculto]</span>, mas serão removidos do total e da lista de nomes no payload enviado ao Webhook.</p>
                    </div>

                    <div className="border-t border-white/10 pt-4"></div>

                    {/* Session toggle: Forçar exibição do botão Nova Oração */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-indigo-300 uppercase tracking-widest text-xs font-bold">Habilitar Nova Oração</label>
                          <p className="text-[10px] text-indigo-200/50 mt-0.5 font-normal">Exibe o botão de criar nova oração mesmo se a data do último evento ainda não passou.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newVal = !showCreateEventOverride;
                            setShowCreateEventOverride(newVal);
                            sessionStorage.setItem('admin_show_create_override', String(newVal));
                          }}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer shrink-0 ${showCreateEventOverride ? 'bg-indigo-500' : 'bg-white/20'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${showCreateEventOverride ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-4"></div>

                    {/* Aparência da Página: Logo and Banner Upload */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                      <label className="block text-indigo-300 mb-2 uppercase tracking-widest text-xs">Aparência da Página (Banner e Logo)</label>
                      <div className="relative w-full h-28 md:h-48 rounded-xl border-2 border-dashed border-white/20 bg-black/20 overflow-visible group/main mb-12">
                        
                        {/* Banner Upload Area (Background) */}
                        <div 
                          className="absolute inset-0 z-0 flex flex-col items-center justify-center hover:bg-white/5 transition-colors overflow-hidden rounded-xl"
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
                          <label htmlFor="banner-upload-input" className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer text-center w-full h-full">
                            {editBannerUrl ? (
                              <div className="relative w-full h-full group/banner">
                                <img src={editBannerUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/banner:opacity-100 flex items-start justify-end p-3 transition-opacity">
                                  <div className="bg-black/50 p-2 rounded-lg backdrop-blur-md text-white flex items-center gap-2">
                                    <Edit size={14} /> <span className="text-xs font-bold uppercase tracking-widest">Editar Banner</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-white/55 h-full w-full">
                                <Plus size={20} className="mb-1 text-indigo-400" />
                                <span className="text-sm font-bold">Upload Banner</span>
                                <span className="text-sm text-white/45">Fundo da página</span>
                              </div>
                            )}
                          </label>
                        </div>

                        {/* Logo Upload Area (Overlay Foreground) */}
                        <div 
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10"
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
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
                          <label htmlFor="logo-upload-input" className="block relative w-24 h-24 md:w-28 md:h-28 cursor-pointer group/logo shadow-2xl rounded-full">
                            {editLogoUrl ? (
                              <>
                                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl"></div>
                                <img src={editLogoUrl} alt="Logo Preview" className="w-full h-full object-cover rounded-full border-4 border-[#0b1220] bg-slate-950 relative z-10" />
                                <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover/logo:opacity-100 flex items-center justify-center transition-opacity z-20">
                                  <Edit size={18} className="text-white" />
                                </div>
                              </>
                            ) : (
                              <div className="w-full h-full rounded-full border-4 border-dashed border-indigo-500/40 text-indigo-300 flex flex-col items-center justify-center shadow-2xl relative z-10">
                                <Plus size={20} className="mb-1 text-indigo-400 group-hover/logo:scale-110 transition-transform" />
                                <span className="text-[10px] font-bold uppercase">Logo</span>
                              </div>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-end gap-4">
                      <button
                        type="submit"
                        className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold py-3 px-6 rounded-xl shadow-lg border border-indigo-500/20 hover:shadow-indigo-500/10 transition-all flex items-center justify-center gap-1.5 text-sm tracking-widest uppercase cursor-pointer"
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
      <footer className="bg-white/5 backdrop-blur-md border-t border-white/10 py-4 text-center text-sm text-indigo-200/50 font-medium">
        <p>Painel de Controle - Cadeia de Oração IVAS</p>
      </footer>

      {/* Admin Toast Alert Indicator */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-4 right-4 z-50 text-sm font-bold px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-1.5 backdrop-blur-xl ${toast.type === 'success'
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
              <h3 className="text-base font-extrabold text-white mb-2 uppercase tracking-wider">Remover Oração #{deletingEvent.numero}?</h3>
              <p className="text-sm text-indigo-200/70 mb-5 md:mb-6 leading-relaxed">
                ATENÇÃO: Deseja realmente remover a Oração #{deletingEvent.numero}? Isso irá excluir permanentemente todos os nomes registrados na lista. Esta ação é irreversível.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setDeletingEvent(null)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-white/10 bg-white/5 text-white/90 rounded-xl text-sm font-semibold hover:bg-white/10 duration-100 cursor-pointer"
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
                  className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold duration-100 shadow-md cursor-pointer"
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
              <h3 className="text-base font-extrabold text-white mb-2 uppercase tracking-wider"> Remover nome?</h3>
              <p className="text-sm text-indigo-200/70 mb-5 md:mb-6 leading-relaxed">
                Deseja mesmo remover &quot;<strong className="text-white font-bold">{deletingParticipant.nome}</strong>&quot; da lista de presença?
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setDeletingParticipant(null)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-white/10 bg-white/5 text-white/90 rounded-xl text-sm font-semibold hover:bg-white/10 duration-100 cursor-pointer"
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
                  className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold duration-100 shadow-md cursor-pointer"
                >
                  Confirmar Remoção
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal: Enviar Lista via Webhook */}
        {showWebhookModal && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b1220]/95 border border-white/10 rounded-3xl p-5 md:p-6 max-w-sm w-full shadow-2xl relative text-center"
            >
              <div className="mx-auto w-11 h-11 md:w-12 md:h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
                <Send size={20} />
              </div>
              <h3 className="text-base font-extrabold text-white mb-2 uppercase tracking-wider">Enviar Lista no Grupo?</h3>
              <p className="text-sm text-indigo-200/70 mb-1 leading-relaxed">
                Oração <strong className="text-white">#{selectedEvent.numero}</strong> — {new Date(selectedEvent.data + 'T00:00:00').toLocaleDateString('pt-BR')}
              </p>
              <p className="text-xs text-indigo-200/50 mb-5">
                {(() => {
                  const all = [
                    ...(config.nomes_fixo?.filter(f => !selectedEvent.nomes.some(n => n.id === f.id)) || []),
                    ...selectedEvent.nomes
                  ];
                  const nomesOcultosArr = config.nomes_ocultos
                    ? config.nomes_ocultos.split('\n').map(n => n.trim().toLowerCase()).filter(Boolean)
                    : [];
                  const allFiltered = all.filter(p => !nomesOcultosArr.includes(p.nome.trim().toLowerCase()));
                  const m = allFiltered.filter(p => p.sexo === 'M').length;
                  const f = allFiltered.filter(p => p.sexo === 'F').length;
                  return `${allFiltered.length} nomes • ${m} irmãos • ${f} irmãs`;
                })()}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowWebhookModal(false)}
                  disabled={sendingWebhook}
                  className="w-full sm:w-auto px-4 py-2.5 border border-white/10 bg-white/5 text-white/90 rounded-xl text-sm font-semibold hover:bg-white/10 duration-100 cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={sendingWebhook}
                  onClick={async () => {
                    if (!config.copyright) return;
                    setSendingWebhook(true);
                    const all = [
                      ...(config.nomes_fixo?.filter(f => !selectedEvent.nomes.some(n => n.id === f.id)) || []).map(p => ({ ...p, isFixo: true })),
                      ...selectedEvent.nomes
                    ];
                    const nomesOcultosArr = config.nomes_ocultos
                      ? config.nomes_ocultos.split('\n').map(n => n.trim().toLowerCase()).filter(Boolean)
                      : [];
                    const allFiltered = all.filter(p => !nomesOcultosArr.includes(p.nome.trim().toLowerCase()));
                    const masculino = allFiltered.filter(p => p.sexo === 'M').map(p => p.nome);
                    const feminino = allFiltered.filter(p => p.sexo === 'F').map(p => p.nome);
                    const payload = {
                      evento: {
                        numero: selectedEvent.numero,
                        data: new Date(selectedEvent.data + 'T00:00:00').toLocaleDateString('pt-BR'),
                        hora_inicio: selectedEvent.hora_inicio,
                        total: allFiltered.length,
                      },
                      masculino,
                      feminino,
                    };
                    try {
                      const res = await fetch('/api/webhook-proxy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ webhookUrl: config.copyright, payload }),
                      });
                      if (!res.ok) {
                        const err = await res.json().catch(() => ({}));
                        throw new Error(err.error || `HTTP ${res.status}`);
                      }
                      showToast('Lista enviada com sucesso! ✅');
                    } catch (err: any) {
                      showToast(`Falha ao enviar: ${err.message || 'erro desconhecido'}`, 'error');
                    } finally {
                      setSendingWebhook(false);
                      setShowWebhookModal(false);
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold duration-100 shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingWebhook ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></span> Enviando...</>
                  ) : (
                    <><Send size={14} /> Confirmar Envio</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

