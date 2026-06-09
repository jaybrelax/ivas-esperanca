import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types representing our data models
export interface Participant {
  id: string;
  nome: string;
  sexo: 'M' | 'F';
  criado_em: string;
  device_id: string;
  isFixo?: boolean;
}

export interface Evento {
  id: string;
  numero: number;
  data: string;
  hora_inicio: string;
  nomes: Participant[];
  created_at?: string;
}

export interface ConfigMarca {
  titulo: string;
  sub_titulo: string;
  titulo_2: string;
  logo_url: string;
  banner_url?: string;
  copyright: string;
  nomes_fixo?: Participant[];
  light_mode?: boolean;
  nomes_ocultos?: string;
}

// Default values for brand configuration
export const DEFAULT_CONFIG: ConfigMarca = {
  titulo: "Cadeia de Oração",
  sub_titulo: "Virtude da Esperança",
  titulo_2: "Carregando lista...",
  logo_url: "https://tptwonotfxzevqswuhvg.supabase.co/storage/v1/object/public/img/branding/1780529469016-yjawbm.png", // Default beautiful placeholder
  banner_url: "https://tptwonotfxzevqswuhvg.supabase.co/storage/v1/object/public/img/branding/1780530541280-jbwqn3.webp", // Default beautiful banner placeholder
  copyright: "© 2026 Todos os direitos reservados. IVAS.",
  nomes_fixo: [],
  light_mode: false,
  nomes_ocultos: ""
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseClient: SupabaseClient | null = null;
let isInitAttemptFailed = false;

// Initialize Supabase only if credentials are valid and provided
export function getSupabase(): SupabaseClient | null {
  if (isInitAttemptFailed) return null;
  
  if (!supabaseClient && supabaseUrl && supabaseAnonKey) {
    const isUrlPlaceholder = supabaseUrl === 'undefined' || supabaseUrl === 'null' || !supabaseUrl.startsWith('http');
    const isKeyPlaceholder = supabaseAnonKey === 'undefined' || supabaseAnonKey === 'null';
    
    if (isUrlPlaceholder || isKeyPlaceholder) {
      console.warn("Supabase configuration consists of unconfigured placeholder values. Falling back to local storage sandbox.");
      isInitAttemptFailed = true;
      return null;
    }
    
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    } catch (e) {
      console.error("Critical error while instantiating Supabase client:", e);
      isInitAttemptFailed = true;
      return null;
    }
  }
  return supabaseClient;
}

export const isSupabaseConfigured = (): boolean => {
  return getSupabase() !== null;
};

export const getSupabaseClient = (): SupabaseClient | null => {
  return getSupabase();
};

// Upload image to Supabase Storage bucket "img" and return public URL
export async function uploadImage(file: File, folder: string = 'branding'): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;

  const ext = file.name.split('.').pop() || 'png';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

  const { data, error } = await sb.storage
    .from('img')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Failed to upload image to Supabase Storage:', error);
    return null;
  }

  const { data: urlData } = sb.storage.from('img').getPublicUrl(fileName);
  return urlData?.publicUrl || null;
}

// Database Query general Promise Timeout wrapper to guarantee sandbox fallback under 2.2 seconds
export function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, timeoutMs: number = 2200, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[DATA ENGINE] database call reached threshold of ${timeoutMs}ms, resolving with storage fallback.`);
      resolve(fallback);
    }, timeoutMs);
  });
  
  // Wrap any PromiseLike as a standard Promise to make Promise.race completely happy
  const standardPromise = Promise.resolve(promise);
  
  return Promise.race([
    standardPromise.then((val) => {
      clearTimeout(timer);
      return val;
    }),
    timeoutPromise
  ]);
}

// Help helper for date conversions
export function formatDateBr(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Quick generator for a unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

// Generate default upcoming Friday helper
export function getNextFridayDate(from: Date = new Date()): { dateStr: string; nextFriday: Date } {
  const resultDate = new Date(from);
  const dayOfWeek = resultDate.getDay(); // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat
  
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  
  // If it's already Friday, we check if we should look at the next one
  // In typical systems, if it's Friday and past the hours, we go to next Friday
  if (daysUntilFriday === 0) {
    const hours = resultDate.getHours();
    if (hours >= 22) { // past Friday 10 PM, transition to next week
      daysUntilFriday = 7;
    }
  }
  
  resultDate.setDate(resultDate.getDate() + daysUntilFriday);
  const year = resultDate.getFullYear();
  const month = String(resultDate.getMonth() + 1).padStart(2, '0');
  const day = String(resultDate.getDate()).padStart(2, '0');
  
  return {
    dateStr: `${year}-${month}-${day}`,
    nextFriday: resultDate
  };
}

// LOCAL MOCK STATE ENGINE (when Supabase is not connected)
// Runs primarily client-side. We use localStorage.
const LOCAL_STORAGE_EVENTS_KEY = 'gestor_eventos_eventlist';
const LOCAL_STORAGE_CONFIG_KEY = 'gestor_eventos_configuracoes';

function getLocalEvents(): Evento[] {
  if (typeof window === 'undefined') {
    // SSR safe mock
    const ssrMock: Evento[] = [
      {
        id: 'mock-1',
        numero: 1,
        data: getNextFridayDate().dateStr,
        hora_inicio: '19:00',
        nomes: [
          { id: '1', nome: 'Thiago Brelaz', sexo: 'M', criado_em: new Date().toISOString(), device_id: 'default' },
          { id: '2', nome: 'Ana Souza', sexo: 'F', criado_em: new Date().toISOString(), device_id: 'default' },
          { id: '3', nome: 'Bárbara Martins', sexo: 'F', criado_em: new Date().toISOString(), device_id: 'default' },
        ]
      }
    ];
    return ssrMock;
  }
  const stored = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { console.error(e); }
  }
  
  // Create first initial Friday event as standard seed
  const initialFriday = getNextFridayDate().dateStr;
  const initial: Evento[] = [
    {
      id: 'mock-initial',
      numero: 1,
      data: initialFriday,
      hora_inicio: '20:00',
      nomes: [
        { id: 'p1', nome: 'Carlos Oliveira', sexo: 'M', criado_em: new Date().toISOString(), device_id: 'seed' },
        { id: 'p2', nome: 'Mariana Costa', sexo: 'F', criado_em: new Date().toISOString(), device_id: 'seed' },
        { id: 'p3', nome: 'Danielle Lima', sexo: 'F', criado_em: new Date().toISOString(), device_id: 'seed' },
        { id: 'p4', nome: 'Rodrigo Silva', sexo: 'M', criado_em: new Date().toISOString(), device_id: 'seed' }
      ]
    }
  ];
  localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(initial));
  return initial;
}

function saveLocalEvents(events: Evento[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(events));
  }
}

function getLocalConfig(): ConfigMarca {
  if (typeof window === 'undefined') {
    return DEFAULT_CONFIG;
  }
  const stored = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { console.error(e); }
  }
  return DEFAULT_CONFIG;
}

function saveLocalConfig(config: ConfigMarca) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
  }
}

// EXPORTED UNIFIED API (AUTOMATIC FALLBACK OR REAL SUPABASE)

// Fetch branding configuration
export async function fetchBrandingConfig(): Promise<ConfigMarca> {
  const sb = getSupabase();
  if (sb) {
    try {
      const queryPromise = sb
        .from('config_marca')
        .select('*')
        .eq('id', 'default')
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.warn("Error fetching config_marca, falling back to local or standard seed.", error);
            return getLocalConfig();
          }
          if (data) {
            return {
              titulo: data.titulo || DEFAULT_CONFIG.titulo,
              sub_titulo: data.sub_titulo || DEFAULT_CONFIG.sub_titulo,
              titulo_2: data.titulo_2 || DEFAULT_CONFIG.titulo_2,
              logo_url: data.logo_url || DEFAULT_CONFIG.logo_url,
              banner_url: data.banner_url || DEFAULT_CONFIG.banner_url,
              copyright: data.copyright || DEFAULT_CONFIG.copyright,
              nomes_fixo: (typeof data.nomes_fixo === 'string' ? JSON.parse(data.nomes_fixo) : data.nomes_fixo) || [],
              light_mode: data.light_mode || false,
              nomes_ocultos: data.nomes_ocultos || "",
            };
          }
          return getLocalConfig();
        });
        
      return await withTimeout(queryPromise, 2200, getLocalConfig());
    } catch (err) {
      console.error("Supabase config query failed, returning local fallback", err);
    }
  }
  return getLocalConfig();
}

// Save brand configuration
export async function saveBrandingConfig(config: ConfigMarca): Promise<boolean> {
  const sb = getSupabase();
  if (sb) {
    try {
      // Check if row exists first
      const { data: checkData, error: checkError } = await sb
        .from('config_marca')
        .select('id')
        .eq('id', 'default');
        
      if (checkError) {
        console.error(`Tabela 'config_marca' do Supabase não encontrada: ${checkError.message}`);
      } else {
        let result;
        if (checkData && checkData.length > 0) {
          result = await sb
            .from('config_marca')
            .update({
              titulo: config.titulo,
              sub_titulo: config.sub_titulo,
              logo_url: config.logo_url,
              banner_url: config.banner_url,
              titulo_2: config.titulo_2,
              copyright: config.copyright,
              nomes_fixo: config.nomes_fixo,
              light_mode: config.light_mode,
              nomes_ocultos: config.nomes_ocultos,
              updated_at: new Date().toISOString()
            })
            .eq('id', 'default');
        } else {
          result = await sb
            .from('config_marca')
            .insert({
              id: 'default',
              titulo: config.titulo,
              sub_titulo: config.sub_titulo,
              logo_url: config.logo_url,
              banner_url: config.banner_url,
              titulo_2: config.titulo_2,
              copyright: config.copyright,
              nomes_fixo: config.nomes_fixo || [],
              light_mode: config.light_mode || false,
              nomes_ocultos: config.nomes_ocultos || ""
            });
        }
        
        if (result.error) {
          console.error("Failed to commit settings to Supabase config_marca:", result.error);
        } else {
          return true;
        }
      }
    } catch (err) {
      console.error("Error setting configuration, writing to local storage instead", err);
    }
  }
  saveLocalConfig(config);
  return true;
}

// Fetch all events sorted by Friday sequence & date
export async function listAllEventos(): Promise<Evento[]> {
  const sb = getSupabase();
  if (sb) {
    try {
      const queryPromise = sb
        .from('eventos')
        .select('*')
        .order('data', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            return data.map((ev: any) => ({
              id: ev.id,
              numero: ev.numero,
              data: ev.data,
              hora_inicio: ev.hora_inicio || '20:00',
              nomes: (typeof ev.nomes === 'string' ? JSON.parse(ev.nomes) : ev.nomes) || [] // double safeguards JSON content
            }));
          }
          console.warn("Failed to find 'eventos' table inside Supabase, using Local Storage list instead.", error);
          return getLocalEvents().sort((a, b) => b.data.localeCompare(a.data));
        });
        
      return await withTimeout(queryPromise, 2200, getLocalEvents().sort((a, b) => b.data.localeCompare(a.data)));
    } catch (err) {
      console.error("Supabase events list query failed, reading from local state fallbacks", err);
    }
  }
  return getLocalEvents().sort((a, b) => b.data.localeCompare(a.data));
}

// Fetch the next logical target event
export async function getNextActiveEvento(): Promise<Evento | null> {
  const list = await listAllEventos();
  if (list.length === 0) return null;
  
  // Try to find an event with a date in the future or today
  const todayStr = new Date().toISOString().split('T')[0];
  const active = list
    .filter(ev => ev.data >= todayStr)
    .sort((a, b) => a.data.localeCompare(b.data)); // closest date first
    
  if (active.length > 0) {
    return active[0];
  }
  // Fallback: return the latest one if no future event exists
  return list[0] || null;
}

// Save or Update whole Evento object
export async function saveEvento(evento: Evento): Promise<Evento> {
  const sb = getSupabase();
  if (sb) {
    if (evento.id && !evento.id.startsWith('mock-') && evento.id.length > 10) {
      // Update existing live event
      const { data, error } = await sb
        .from('eventos')
        .update({
          data: evento.data,
          hora_inicio: evento.hora_inicio,
          nomes: evento.nomes // Supabase supports direct JSON upload or stringified JSON
        })
        .eq('id', evento.id)
        .select()
        .single();
        
      if (error) {
        console.error("Failed to update Supabase row:", error);
        throw new Error(`Erro ao atualizar Supabase: ${error.message} (${error.code || ''})`);
      }
      
      if (data) {
        return {
          id: data.id,
          numero: data.numero,
          data: data.data,
          hora_inicio: data.hora_inicio,
          nomes: typeof data.nomes === 'string' ? JSON.parse(data.nomes) : data.nomes
        };
      }
    } else {
      // Insert new target event
      const { data, error } = await sb
        .from('eventos')
        .insert([{
          numero: evento.numero,
          data: evento.data,
          hora_inicio: evento.hora_inicio,
          nomes: evento.nomes
        }])
        .select()
        .single();
        
      if (error) {
        console.error("Failed to insert Supabase row:", error);
        throw new Error(`Erro ao inserir no Supabase: ${error.message} (${error.code || ''})`);
      }
      
      if (data) {
        return {
          id: data.id,
          numero: data.numero,
          data: data.data,
          hora_inicio: data.hora_inicio,
          nomes: typeof data.nomes === 'string' ? JSON.parse(data.nomes) : data.nomes
        };
      }
    }
  } else {
    // Local storage management fallback
    const current = getLocalEvents();
    const existingIdx = current.findIndex(e => e.id === evento.id);
    
    if (existingIdx >= 0) {
      current[existingIdx] = evento;
    } else {
      // Generate new seq number
      const maxNum = current.reduce((max, e) => e.numero > max ? e.numero : max, 0);
      evento.id = evento.id || 'mock-' + generateId();
      evento.numero = evento.numero || (maxNum + 1);
      current.push(evento);
    }
    
    saveLocalEvents(current);
  }
  return evento;
}

// Add participant to an event
export async function addParticipantToEvento(eventoId: string, name: string, gender: 'M' | 'F', deviceId: string): Promise<Evento | null> {
  const events = await listAllEventos();
  const target = events.find(e => e.id === eventoId);
  if (!target) return null;
  
  const formattedName = name.trim();
  if (!formattedName) return target;
  
  // Avoid duplicate names in the same list (case insensitive verification)
  const isDuplicate = target.nomes.some(p => p.nome.toLowerCase() === formattedName.toLowerCase());
  if (isDuplicate) {
    throw new Error('Este nome já está registrado na lista deste evento!');
  }
  
  const newParticipant: Participant = {
    id: generateId(),
    nome: formattedName,
    sexo: gender,
    criado_em: new Date().toISOString(),
    device_id: deviceId
  };
  
  // Automatically order alphabetically right before saving
  const newNomesList = [...target.nomes, newParticipant].sort((a, b) => 
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  );
  
  const updatedEvent = {
    ...target,
    nomes: newNomesList
  };
  
  return await saveEvento(updatedEvent);
}

// Edit an existing participant
export async function editParticipantInEvento(eventoId: string, participantId: string, updatedName: string, updatedGender: 'M' | 'F'): Promise<Evento | null> {
  const events = await listAllEventos();
  const target = events.find(e => e.id === eventoId);
  if (!target) return null;
  
  const formattedName = updatedName.trim();
  if (!formattedName) return target;
  
  // Check if renaming causes collision with another person
  const hasCollision = target.nomes.some(p => 
    p.id !== participantId && p.nome.toLowerCase() === formattedName.toLowerCase()
  );
  if (hasCollision) {
    throw new Error('Outro participante já está registrado com este nome!');
  }
  
  const newNomesList = target.nomes.map(p => {
    if (p.id === participantId) {
      return {
        ...p,
        nome: formattedName,
        sexo: updatedGender
      };
    }
    return p;
  }).sort((a, b) => 
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })
  );
  
  const updatedEvent = {
    ...target,
    nomes: newNomesList
  };
  
  return await saveEvento(updatedEvent);
}

// Delete participant from event
export async function removeParticipantFromEvento(eventoId: string, participantId: string): Promise<Evento | null> {
  const events = await listAllEventos();
  const target = events.find(e => e.id === eventoId);
  if (!target) return null;
  
  const newNomesList = target.nomes.filter(p => p.id !== participantId);
  
  const updatedEvent = {
    ...target,
    nomes: newNomesList
  };
  
  return await saveEvento(updatedEvent);
}

// Delete whole event in administrative setting
export async function deleteEvento(eventoId: string): Promise<boolean> {
  const sb = getSupabase();
  if (sb) {
    try {
      if (!eventoId.startsWith('mock-')) {
        const { error } = await sb
          .from('eventos')
          .delete()
          .eq('id', eventoId);
          
        if (error) {
          console.error(`Erro ao deletar no Supabase: ${error.message}`);
        } else {
          return true;
        }
      }
    } catch (err) {
      console.error("Supabase connection issue while deleting event", err);
    }
  }
  
  const events = getLocalEvents();
  const updated = events.filter(e => e.id !== eventoId);
  saveLocalEvents(updated);
  return true;
}

// Quick generator to auto-create standard next Friday event
export async function createNextFridayEvento(fixedHour: string = '20:00'): Promise<Evento> {
  const events = await listAllEventos();
  
  // Calculate next Friday
  const { dateStr } = getNextFridayDate();
  
  // Check if event with this date already exists to prevent duplicate fridays
  const alreadyExists = events.find(e => e.data === dateStr);
  if (alreadyExists) {
    return alreadyExists;
  }
  
  const maxNum = events.reduce((max, e) => e.numero > max ? e.numero : max, 0);
  
  const newEvent: Evento = {
    id: 'mock-' + generateId(), // Will be updated by real DB sequence if active
    numero: maxNum + 1,
    data: dateStr,
    hora_inicio: fixedHour,
    nomes: []
  };
  
  return await saveEvento(newEvent);
}
