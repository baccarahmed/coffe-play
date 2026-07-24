'use client';

import { useAuth } from '@/app/providers';
import { Gamepad2, Coffee, TrendingUp, Users, Settings, ShoppingCart, History } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const isAdmin = user?.role === 'admin';

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

  return (
    <div className={`w-64 border-r min-h-screen p-4 ${
      isAdmin 
        ? 'bg-gradient-to-b from-purple-900/50 to-slate-800 border-purple-700/50' 
        : 'bg-gradient-to-b from-blue-900/50 to-slate-800 border-blue-700/50'
    }`}>
      <div className="flex items-center gap-3 mb-8 px-2">
        <Gamepad2 className={`w-8 h-8 ${isAdmin ? 'text-purple-400' : 'text-blue-400'}`} />
        <h1 className="text-xl font-bold text-white">
          Coffee Play
        </h1>
      </div>
      <div className="mb-6 px-2">
        <div className={`px-4 py-3 rounded-xl border ${
          isAdmin 
            ? 'bg-purple-900/30 border-purple-700/30' 
            : 'bg-blue-900/30 border-blue-700/30'
        }`}>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Connecté en tant que</p>
          <p className="text-white font-semibold">{user?.fullName}</p>
          <p className={`text-xs ${isAdmin ? 'text-purple-400' : 'text-blue-400'} uppercase font-bold`}>
            {isAdmin ? 'Administrateur' : 'Employé'}
          </p>
        </div>
      </div>
      <nav className="space-y-2">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? isAdmin
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                    : 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
