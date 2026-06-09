'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Não exibe se já foi dispensado antes
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    // Detecta se já está instalado como PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Pequeno delay para não ser invasivo logo ao abrir
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setShow(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!show || installed) return null;

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
      role="dialog"
      aria-label="Instalar aplicativo"
    >
      <div className="bg-[#0b1220]/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 animate-fade-in-up">
        {/* Ícone */}
        <div className="shrink-0 w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/admin-icon-192.png" alt="App icon" className="w-7 h-7 rounded-lg" />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white leading-tight">Instalar painel</p>
          <p className="text-[10px] text-indigo-300/70 leading-tight mt-0.5 truncate">
            Acesse o admin direto da tela inicial
          </p>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstall}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <Download size={12} />
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="text-white/40 hover:text-white/70 transition-colors p-1 cursor-pointer"
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
