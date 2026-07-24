'use client';

import { Sidebar } from '@/components/Sidebar';
import { BottomNav } from '@/components/BottomNav';
import { useAuth } from '@/app/providers';
import { insforge } from '@/lib/insforge';
import { LogOut, Store, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Station {
  id: string;
  cafe_id?: string;
  status: 'available' | 'occupied' | 'maintenance';
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';
  const [cafeName, setCafeName] = useState<string | null>(null);
  const [stations, setStations] = useState<Station[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadCafeName = async () => {
      if (user?.cafeId) {
        const { data } = await insforge.database.from('cafes').select('name').eq('id', user.cafeId).maybeSingle();
        setCafeName(data?.name ?? null);
      } else {
        setCafeName(null);
      }
    };
    loadCafeName();
  }, [user]);

  useEffect(() => {
    const loadStations = async () => {
      const { data } = await insforge.database.from('stations').select('*');
      setStations(data || []);
    };
    if (user) {
      loadStations();
    }
  }, [user]);

  const workerStations = isAdmin
    ? stations
    : user?.cafeId
      ? stations.filter(s => String(s.cafe_id) === String(user.cafeId))
      : [];

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleFabClick = () => {
    router.push('/dashboard/sessions?quickStart=true');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row">
      {/* Sidebar: cachée sur mobile, visible sur md+ */}
      <div className="hidden md:block w-64 border-r min-h-screen p-4 bg-gradient-to-b from-slate-900 to-slate-800 border-slate-700">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col w-full">
        <header className={`border-b px-6 py-4 flex justify-between items-center ${
          isAdmin
            ? 'bg-gradient-to-r from-purple-900/40 to-slate-800 border-purple-700/30'
            : 'bg-gradient-to-r from-blue-900/40 to-slate-800 border-blue-700/30'
        }`}>
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
              Welcome back, {user.fullName}
              {isAdmin && (
                <span className="px-3 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full font-bold uppercase">
                  Admin
                </span>
              )}
            </h2>
            <p className={`text-sm flex items-center gap-2 ${isAdmin ? 'text-slate-400' : 'text-blue-300'}`}>
              {isAdmin ? (
                'Vue consolidée des deux cafés'
              ) : (
                <>
                  <Store className="w-3.5 h-3.5" />
                  {cafeName ? `Café assigné : ${cafeName}` : 'Aucun café assigné — contactez l\u2019administrateur'}
                </>
              )}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all border border-slate-600"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Déconnexion</span>
          </button>
        </header>
        <main className="flex-1 p-6 overflow-auto pb-6 md:pb-6" style={{ paddingBottom: 'calc(1.5rem + var(--bottom-nav-height) + env(safe-area-inset-bottom))' }}>{children}</main>
        <BottomNav />
      </div>
      {/* Floating Action Button */}
      <button
        onClick={handleFabClick}
        className="fixed right-6 w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-2xl flex items-center justify-center transition-all z-50"
        style={{ bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom) + 1rem)' }}
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}
