'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

let toastQueue: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

function notify() {
  listeners.forEach(l => l([...toastQueue]));
}

export function toast(message: string, type: Toast['type'] = 'info', duration = 3000) {
  const id = Math.random().toString(36).slice(2);
  toastQueue = [...toastQueue, { id, message, type, duration }];
  notify();
  if (duration > 0) {
    setTimeout(() => {
      toastQueue = toastQueue.filter(t => t.id !== id);
      notify();
    }, duration);
  }
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (t: Toast[]) => setToasts(t);
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  }, []);

  const dismiss = (id: string) => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    setToasts([...toastQueue]);
  };

  if (!toasts.length) return null;

  const configs = {
    success: { icon: <CheckCircle2 size={17} className="text-green-400 shrink-0" />, accent: 'border-green-500/30 bg-green-500/10' },
    error:   { icon: <AlertTriangle size={17} className="text-red-400 shrink-0" />,   accent: 'border-red-500/30 bg-red-500/10' },
    warning: { icon: <AlertTriangle size={17} className="text-orange-400 shrink-0" />, accent: 'border-orange-500/30 bg-orange-500/10' },
    info:    { icon: <Info size={17} className="text-blue-400 shrink-0" />,            accent: 'border-blue-500/30 bg-blue-500/10' },
  };

  return (
    <div className="fixed top-14 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm mx-auto">
      {toasts.map(t => {
        const { icon, accent } = configs[t.type];
        return (
          <div key={t.id}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-4 py-3.5 pointer-events-auto',
              'animate-fade-up border backdrop-blur-xl',
              'shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
              accent
            )}
            style={{ background: 'rgba(18,18,26,0.92)' }}
          >
            {icon}
            <p className="flex-1 text-sm font-semibold text-white">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-white/30 hover:text-white/60 transition-colors ml-1">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}