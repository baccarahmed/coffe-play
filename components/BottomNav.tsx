'use client';

import { useAuth } from '@/app/providers';
import { Gamepad2, ShoppingCart, Coffee, History, Menu, TrendingUp, Users, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

export function BottomNav() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = user?.role === 'admin';
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const workerItems = [
    { href: '/dashboard/sessions', icon: Gamepad2, label: 'Sessions' },
    { href: '/dashboard/sales', icon: ShoppingCart, label: 'Ventes' },
    { href: '/dashboard/inventory', icon: Coffee, label: 'Stock' },
    { href: '/dashboard/history', icon: History, label: 'Historique' },
  ];

  const adminItems = [
    { href: '/dashboard/sessions', icon: Gamepad2, label: 'Sessions' },
    { href: '/dashboard/sales', icon: ShoppingCart, label: 'Ventes' },
    { href: '/dashboard/inventory', icon: Coffee, label: 'Stock' },
    { href: '/dashboard/analytics', icon: TrendingUp, label: 'Analytics' },
    { href: '/dashboard/history', icon: History, label: 'Historique' },
    { href: '/dashboard/users', icon: Users, label: 'Utilisateurs' },
    { href: '/dashboard/settings', icon: Settings, label: 'Paramètres' },
  ];

  const items = isAdmin ? adminItems : workerItems;

  const mainItems = items.slice(0, 4);
  const moreItems = items.slice(4);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))' }}>
      <div className="flex justify-around items-center" style={{ height: 'var(--bottom-nav-height)' }}>
        {mainItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center p-2 transition-all ${isActive
                ? isAdmin
                  ? 'text-purple-400'
                  : 'text-blue-400'
                : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}

        {moreItems.length > 0 && (
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={`flex flex-col items-center justify-center p-2 transition-all ${pathname.startsWith('/dashboard/analytics') || pathname.startsWith('/dashboard/users') || pathname.startsWith('/dashboard/settings')
              ? isAdmin
                ? 'text-purple-400'
                : 'text-blue-400'
              : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Menu className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Plus</span>
          </button>
        )}
      </div>

      {/* Plus Menu Dropdown */}
      {showMoreMenu && (
        <div className="absolute bottom-16 left-4 right-4 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
          <div className="py-2">
            {moreItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMoreMenu(false)}
                  className={`flex items-center gap-3 px-4 py-3 transition-all ${isActive
                    ? isAdmin
                      ? 'bg-purple-900/30 text-purple-400'
                      : 'bg-blue-900/30 text-blue-400'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={() => {
                setShowMoreMenu(false);
                handleSignOut();
              }}
              className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-700 hover:text-red-300 w-full transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}