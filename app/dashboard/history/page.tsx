'use client';

import { useAuth } from '@/app/providers';
import { insforge } from '@/lib/insforge';
import { Gamepad2, ShoppingCart, History, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Session {
  id: string;
  station_id: string;
  game_id: string;
  total_price: number;
  start_time: string;
  end_time?: string;
  status: string;
  duration?: '30min' | '1h' | 'per_match';
  match_count?: number;
  cafe_id?: string;
}

interface Sale {
  id: string;
  product_id: string;
  total_price: number;
  sale_time: string;
  quantity: number;
  cafe_id?: string;
}

const CURRENCY = 'TND';

export default function HistoryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'sessions' | 'sales'>('sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    const [sessionsRes, salesRes, stationsRes, productsRes, gamesRes] = await Promise.all([
      insforge.database.from('sessions').select('*').order('start_time', { ascending: false }),
      insforge.database.from('sales').select('*').order('sale_time', { ascending: false }),
      insforge.database.from('stations').select('*'),
      insforge.database.from('products').select('*'),
      insforge.database.from('games').select('*'),
    ]);
    // Filter data by user's cafe
    if (user?.role === 'worker' && user?.cafeId) {
      const filteredSessions = (sessionsRes.data || []).filter(s => String(s.cafe_id) === String(user.cafeId));
      const filteredSales = (salesRes.data || []).filter(sale => String(sale.cafe_id) === String(user.cafeId));
      setSessions(filteredSessions);
      setSales(filteredSales);
    } else {
      setSessions(sessionsRes.data || []);
      setSales(salesRes.data || []);
    }
    setStations(stationsRes.data || []);
    setProducts(productsRes.data || []);
    setGames(gamesRes.data || []);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <History className="w-8 h-8 text-purple-400" />
            Historique
          </h1>
          <p className="text-slate-400 mt-1">Suivi des sessions et ventes</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-all">
          <Download className="w-4 h-4" />
          Exporter
        </button>
      </div>

      <div className="flex gap-4 mb-8 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-4 px-6 font-semibold transition-all ${
            activeTab === 'sessions'
              ? 'text-blue-400 border-b-2 border-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Sessions
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`pb-4 px-6 font-semibold transition-all ${
            activeTab === 'sales'
              ? 'text-green-400 border-b-2 border-green-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Ventes
        </button>
      </div>

      {activeTab === 'sessions' && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="text-left px-6 py-4 text-slate-300 font-medium">Station</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-medium">Jeu</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-medium">Date</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-medium">Prix</th>
                  <th className="text-left px-6 py-4 text-slate-300 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {sessions.map((session, index) => {
                  const station = stations.find(s => s.id === session.station_id);
                  const game = games.find(g => g.id === session.game_id);
                  return (
                    <motion.tr
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-slate-700/50"
                    >
                      <td className="px-6 py-4 text-white">{station?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-300">{game?.name || 'N/A'}</td>
                      <td className="px-6 py-4 text-slate-400">{formatDate(session.start_time)}</td>
                      <td className="px-6 py-4 text-white font-semibold">{session.total_price.toFixed(2)} {CURRENCY}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          session.status === 'active'
                            ? 'bg-blue-500/20 text-blue-400'
                            : session.status === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {session.status === 'active' ? 'En cours' : session.status === 'completed' ? 'Terminée' : 'Annulée'}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards - hidden on desktop */}
          <div className="md:hidden space-y-4 p-4">
            {sessions.map((session, index) => {
              const station = stations.find(s => s.id === session.station_id);
              const game = games.find(g => g.id === session.game_id);
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-slate-700/50 rounded-xl p-4 border border-slate-600"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-1">{station?.name || 'N/A'}</h3>
                      <p className="text-slate-400 text-sm">{game?.name || 'N/A'}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      session.status === 'active'
                        ? 'bg-blue-500/20 text-blue-400'
                        : session.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {session.status === 'active' ? 'En cours' : session.status === 'completed' ? 'Terminée' : 'Annulée'}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-600">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Date:</span>
                      <span className="text-white text-sm">{formatDate(session.start_time)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-slate-400 text-sm">Prix:</span>
                      <span className="text-white font-semibold">{session.total_price.toFixed(2)} {CURRENCY}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead className="bg-slate-700">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-300 font-medium">Produit</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-medium">Quantité</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-slate-300 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {sales.map((sale, index) => {
                  const product = products.find(p => p.id === sale.product_id);
                  return (
                    <motion.tr
                      key={sale.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-slate-700/50"
                    >
                      <td className="px-4 py-3 text-white">{product?.name || 'N/A'}</td>
                      <td className="px-4 py-3 text-slate-300">{sale.quantity}</td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(sale.sale_time)}</td>
                      <td className="px-4 py-3 text-white font-semibold">{Number(sale.total_price).toFixed(2)} {CURRENCY}</td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards - hidden on desktop */}
          <div className="md:hidden space-y-4 p-4">
            {sales.map((sale, index) => {
              const product = products.find(p => p.id === sale.product_id);
              return (
                <motion.div
                  key={sale.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-slate-700/50 rounded-xl p-4 border border-slate-600"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-white font-semibold text-lg mb-1">{product?.name || 'N/A'}</h3>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-600 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Quantité:</span>
                      <span className="text-white text-sm">{sale.quantity}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Date:</span>
                      <span className="text-white text-sm">{formatDate(sale.sale_time)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Total:</span>
                      <span className="text-white font-semibold">{Number(sale.total_price).toFixed(2)} {CURRENCY}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
