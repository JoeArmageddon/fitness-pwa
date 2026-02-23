'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Dumbbell, UtensilsCrossed, User, HeartPulse, BarChart3, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { href: '/',          label: 'Home',      icon: LayoutDashboard },
  { href: '/workout',   label: 'Workout',   icon: Dumbbell        },
  { href: '/nutrition', label: 'Nutrition', icon: UtensilsCrossed },
  { href: '/body',      label: 'Body',      icon: User            },
  { href: '/recovery',  label: 'Recovery',  icon: HeartPulse      },
  { href: '/analytics', label: 'Stats',     icon: BarChart3       },
  { href: '/program',   label: 'Program',   icon: Calendar        },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
      style={{
        background: 'rgba(8,8,12,0.92)',
        backdropFilter: 'blur(32px) saturate(200%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around h-[58px] px-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-[3px] flex-1 h-full',
                'transition-all duration-150 active:scale-[0.85]',
                'min-w-0 relative',
              )}
            >
              {/* Active background pill */}
              {active && (
                <span
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-blue-500/15 animate-scale-in"
                />
              )}

              <Icon
                size={20}
                strokeWidth={active ? 2.4 : 1.6}
                className={cn(
                  'relative z-10 transition-colors duration-150',
                  active ? 'text-[#0A84FF]' : 'text-white/35'
                )}
              />

              {/* Label: only show for active tab */}
              <span className={cn(
                'text-[9px] font-bold relative z-10 transition-all duration-150 leading-none',
                active ? 'text-[#0A84FF] opacity-100' : 'opacity-0 h-0 overflow-hidden'
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}