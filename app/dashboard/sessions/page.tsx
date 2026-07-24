'use client';

import { useAuth } from '@/app/providers';
import { insforge } from '@/lib/insforge';
import { getGamePrice } from '@/lib/pricing';
import { Plus, StopCircle, Clock, CheckCircle2, RotateCcw, Goal, Gamepad2, Settings, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Station {
  id: string;
  name: string;
  status: 'available' | 'occupied' | 'maintenance';
  cafe_id?: string;
  type?: 'ps4' | 'ps5';
}

interface Cafe {
  id: string;
  name: string;
}

interface Game {
  id: string;
  name: string;
  billing_type?: 'duration' | 'match';
}

interface Session {
  id: string;
  station_id: string;
  game_id: string;
  worker_id: string;
  player_count: string;
  duration: '30min' | '1h' | null;
  total_price: number;
  start_time: string;
  end_time?: string | null;
  status: 'active' | 'completed' | 'canceled';
  match_count?: number;
  cafe_id?: string | null;
}

const CURRENCY = 'TND';

export default function SessionsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [stations, setStations] = useState<Station[]>([]);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [stationForm, setStationForm] = useState({ name: '', cafe_id: '', status: 'available' as 'available' | 'maintenance', type: 'ps5' as 'ps4' | 'ps5' });
  const [stationError, setStationError] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [playerCount, setPlayerCount] = useState<string>('2');
  const [duration, setDuration] = useState<'30min' | '1h'>('30min');
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timers, setTimers] = useState<Record<string, { remaining: number; total: number }>>({});
  const [estimatedPrice, setEstimatedPrice] = useState(0);

  // Helper to open modal with pre-selected station
  const openSessionModal = (stationId: string) => {
    setSelectedStation(stationId);
    // Reset other fields
    setSelectedGame('');
    setPlayerCount('2');
    setDuration('30min');
    setError(null);
    setIsModalOpen(true);
  };

  // Refetch when page gains focus (for worker pages)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimers: Record<string, { remaining: number; total: number }> = {};
      sessions.forEach(session => {
        if (session.status === 'active' && session.duration !== null && session.start_time) {
          const startTime = new Date(session.start_time).getTime();
          const durationMs = session.duration === '30min' ? 30 * 60 * 1000 : 60 * 60 * 1000;
          const elapsed = Date.now() - startTime;
          const remaining = Math.max(0, durationMs - elapsed);
          newTimers[session.id] = { remaining, total: durationMs };
        }
      });
      setTimers(newTimers);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessions]);

  const loadData = async () => {
    const [stationsRes, gamesRes, sessionsRes, cafesRes] = await Promise.all([
      insforge.database.from('stations').select('*'),
      insforge.database.from('games').select('*'),
      insforge.database.from('sessions').select('*'),
      insforge.database.from('cafes').select('*'),
    ]);
    setStations(stationsRes.data || []);
    setGames(gamesRes.data || []);
    // Convert player_count to string if it's number
    const sessionsData = sessionsRes.data?.map(session => ({
      ...session,
      player_count: String(session.player_count)
    })) || [];
    setSessions(sessionsData);
    setCafes(cafesRes.data || []);
  };

  const workerStations = user?.role === 'admin'
    ? stations
    : user?.cafeId
      ? stations.filter(s => {
          console.log('[Sessions] Comparing s.cafe_id:', s.cafe_id, 'with user.cafeId:', user.cafeId, 'types:', typeof s.cafe_id, typeof user.cafeId);
          return String(s.cafe_id) === String(user.cafeId);
        })
      : [];

  // Check for quickStart param and auto-open modal
  useEffect(() => {
    if (searchParams.get('quickStart') && stations.length > 0) {
      const firstAvailable = workerStations.find(s => s.status === 'available');
      if (firstAvailable) {
        openSessionModal(firstAvailable.id);
      } else {
        setIsModalOpen(true);
      }
      // Remove the quickStart param from URL to avoid re-opening on refresh
      router.replace('/dashboard/sessions', { scroll: false });
    }
  }, [searchParams, stations, workerStations, router]);

  // Station CRUD (admin only)
  const openStationModal = (station: Station | null = null) => {
    setStationError(null);
    if (station) {
      setEditingStation(station);
      setStationForm({
        name: station.name,
        cafe_id: station.cafe_id || (cafes[0]?.id ?? ''),
        status: station.status === 'occupied' ? 'available' : (station.status as 'available' | 'maintenance'),
        type: station.type || 'ps5',
      });
    } else {
      setEditingStation(null);
      setStationForm({
        name: '',
        cafe_id: user?.cafeId || cafes[0]?.id || '',
        status: 'available',
        type: 'ps5',
      });
    }
    setIsStationModalOpen(true);
  };

  const handleStationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStationError(null);
    if (!stationForm.name.trim() || !stationForm.cafe_id) {
      setStationError('Nom et café requis.');
      return;
    }

    if (editingStation) {
      const { error: updateError } = await insforge.database
        .from('stations')
        .update({ name: stationForm.name.trim(), cafe_id: stationForm.cafe_id, status: stationForm.status, type: stationForm.type })
        .eq('id', editingStation.id);
      if (updateError) {
        setStationError(`Erreur: ${updateError.message}`);
        return;
      }
    } else {
      const { error: insertError } = await insforge.database.from('stations').insert([{
        name: stationForm.name.trim(),
        cafe_id: stationForm.cafe_id,
        status: stationForm.status,
        type: stationForm.type,
      }]);
      if (insertError) {
        setStationError(`Erreur: ${insertError.message}`);
        return;
      }
    }
    setIsStationModalOpen(false);
    setEditingStation(null);
    setStationForm({ name: '', cafe_id: '', status: 'available', type: 'ps5' });
    loadData();
  };

  const handleDeleteStation = async (id: string) => {
    if (!confirm('Supprimer cette station ?')) return;
    // Check no active session on this station
    const active = sessions.find(s => s.station_id === id && s.status === 'active');
    if (active) {
      alert('Impossible de supprimer : une session est active sur cette station.');
      return;
    }
    const { error: delError } = await insforge.database.from('stations').delete().eq('id', id);
    if (delError) {
      alert(`Erreur: ${delError.message}`);
      return;
    }
    loadData();
  };

  // Determine pricing type for the currently selected game
  const selectedGameObj = games.find(g => g.id === selectedGame);
  const isPerMatch = selectedGameObj?.billing_type === 'match';

  // Recompute estimated price whenever game, players, duration, pricing type or selected station changes
  useEffect(() => {
    const updatePrice = async () => {
      if (!selectedGame) {
        setEstimatedPrice(0);
        return;
      }
      const game = games.find(g => g.id === selectedGame);
      if (!game) {
        setEstimatedPrice(0);
        return;
      }
      // Get station type from selected station
      const station = stations.find(s => s.id === selectedStation);
      const stationType = station?.type || 'ps5';
      // For duration-based pricing, use selected player count
      const dur = game.billing_type === 'match' ? 'per_match' : duration;
      const price = await getGamePrice(game.name, playerCount, dur, stationType);
      if (price !== null) {
        setEstimatedPrice(Number(price));
        return;
      }
      // Fallback price logic (PS5 prices are base, PS4 are slightly lower)
      const baseMultiplier = stationType === 'ps4' ? 0.8 : 1;
      if (game.billing_type === 'match') {
        setEstimatedPrice(Math.round(5 * baseMultiplier * 100) / 100);
      } else {
        // Duration-based: fixed price
        const base = duration === '30min' ? 15 : 25;
        setEstimatedPrice(Math.round(base * baseMultiplier * 100) / 100);
      }
    };
    updatePrice();
  }, [selectedGame, playerCount, duration, games, isPerMatch, selectedStation, stations]);

  // Pre-select first game if available when modal opens
  useEffect(() => {
    if (isModalOpen && games.length > 0 && !selectedGame) {
      setSelectedGame(games[0].id);
    }
  }, [isModalOpen, games, selectedGame]);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    if (!selectedStation) {
      setError('Veuillez sélectionner une station.');
      return;
    }
    if (!selectedGame) {
      setError('Veuillez sélectionner un jeu.');
      return;
    }

    const station = stations.find(s => s.id === selectedStation);
    const game = games.find(g => g.id === selectedGame);
    if (!game) {
      setError('Jeu introuvable.');
      return;
    }

    const usePerMatch = game.billing_type === 'match';

    const { data: inserted, error: insertError } = await insforge.database
      .from('sessions')
      .insert([{
        station_id: selectedStation,
        game_id: selectedGame,
        worker_id: user.id,
        cafe_id: station?.cafe_id ?? user.cafeId ?? null,
        player_count: playerCount,
        duration: usePerMatch ? null : duration,
        total_price: estimatedPrice,
        match_count: usePerMatch ? 0 : null,
        start_time: new Date().toISOString(),
        status: 'active',
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Insert session error:', insertError);
      setError(`Erreur lors du démarrage: ${insertError.message || 'inconnue'}`);
      return;
    }

    await insforge.database
      .from('stations')
      .update({ status: 'occupied' })
      .eq('id', selectedStation);

    setIsModalOpen(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    setSelectedStation('');
    setSelectedGame('');
    setPlayerCount('2');
    setDuration('30min');
    setEstimatedPrice(0);
    loadData();
  };

  const handleAddMatch = async (session: Session) => {
    // For per_match sessions: add a match and recalculate price
    const newMatchCount = (session.match_count || 0) + 1;
    // Get station type
    const station = stations.find(s => s.id === session.station_id);
    const stationType = station?.type || 'ps5';
    // unit price for per_match
    const unitPrice = await getGamePrice(
      games.find(g => g.id === session.game_id)?.name || '',
      session.player_count,
      'per_match',
      stationType
    );
    const pricePerMatch = unitPrice ?? 5;
    const newTotal = newMatchCount * pricePerMatch;
    await insforge.database.from('sessions').update({
      match_count: newMatchCount,
      total_price: newTotal,
    }).eq('id', session.id);
    loadData();
  };

  const handleProlongSession = async (session: Session) => {
    if (session.duration === null) return;
    if (!confirm('Prolonger la session de 30 minutes supplémentaires ?')) return;
    const newPrice = Number(session.total_price) + 10;
    await insforge.database.from('sessions').update({
      total_price: newPrice,
      duration: '1h'
    }).eq('id', session.id);
    loadData();
  };

  const handleStopSession = async (sessionId: string, stationId: string) => {
    await insforge.database.from('sessions').update({
      status: 'completed',
      end_time: new Date().toISOString()
    }).eq('id', sessionId);

    await insforge.database.from('stations').update({ status: 'available' }).eq('id', stationId);

    loadData();
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const renderTimer = (session: Session) => {
    if (session.duration === null) {
      return (
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 mb-2 shadow-lg shadow-emerald-900/40">
            <div>
              <p className="text-3xl font-bold text-white">{session.match_count || 0}</p>
              <p className="text-[10px] uppercase tracking-wider text-emerald-100">matchs</p>
            </div>
          </div>
        </div>
      );
    }
    const timer = timers[session.id];
    if (!timer) return null;
    const progress = timer.remaining / timer.total;
    const isLow = progress < 0.2;

    const circumference = 2 * Math.PI * 36;
    const offset = circumference * (1 - progress);

    return (
      <div className="relative w-24 h-24 mx-auto mb-4">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="48" cy="48" r="36" stroke="#334155" strokeWidth="8" fill="none" />
          <motion.circle
            cx="48"
            cy="48"
            r="36"
            stroke={isLow ? '#ef4444' : '#3b82f6'}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: 0 }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold ${isLow ? 'text-red-400' : 'text-white'}`}>
            {formatTime(timer.remaining)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-400" />
            Sessions de Jeu
          </h1>
          <p className="text-slate-400 mt-1">Gérez les stations de jeu</p>
        </div>
        <div className="flex gap-3">
          {user?.role === 'admin' && (
            <button
              onClick={() => openStationModal()}
              className="flex items-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-all border border-slate-600"
            >
              <Settings className="w-5 h-5" />
              Gérer les stations
            </button>
          )}
        </div>
      </div>

      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="fixed top-8 right-8 bg-emerald-500/20 border border-emerald-400 text-white px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3 z-50"
        >
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          <div>
            <p className="font-bold text-emerald-300">Session démarrée !</p>
            <p className="text-sm opacity-90">La session a été créée avec succès</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workerStations.map((station, index) => {
          const activeSession = sessions.find(s => s.station_id === station.id && s.status === 'active');
          const game = games.find(g => g.id === activeSession?.game_id);
          const isMatchSession = activeSession?.duration === null;

          return (
            <motion.div
              key={station.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              className={`rounded-2xl p-6 border-2 ${
                station.status === 'available'
                  ? 'bg-slate-800 border-cyan-500/50 shadow-lg shadow-cyan-900/20'
                  : station.status === 'occupied'
                    ? 'bg-slate-800 border-violet-500/50 shadow-lg shadow-violet-900/20'
                    : 'bg-slate-800 border-red-500/50 shadow-lg shadow-red-900/20'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{station.name}</h3>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${
                    station.type === 'ps5' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'
                  }`}>
                    {station.type?.toUpperCase() || 'PS5'}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  station.status === 'available'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : station.status === 'occupied'
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'bg-red-500/20 text-red-300'
                }`}>
                  {station.status === 'available' ? 'Disponible' : station.status === 'occupied' ? 'Occupée' : 'Maintenance'}
                </span>
              </div>

              {activeSession && game && (
                <div className="mb-6">
                  {renderTimer(activeSession)}
                  <div className="space-y-2 text-center">
                    <h4 className="font-bold text-cyan-300">{game.name}</h4>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">VS {activeSession.player_count || '1'} JOUEURS</span>
                      <span className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                        · {isMatchSession ? 'Par match' : activeSession.duration || (game?.billing_type === 'match' ? 'Par match' : '30min')}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-cyan-300">
                      {Number(activeSession.total_price).toFixed(2)} {CURRENCY}
                    </p>
                  </div>
                </div>
              )}

              {station.status === 'available' && (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
                  <p className="text-slate-400 mb-4">Prête pour une nouvelle session</p>
                  <button
                    onClick={() => openSessionModal(station.id)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-xl"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Démarrer une Session
                  </button>
                </div>
              )}

              {activeSession && (
                <div className="flex gap-2">
                  {isMatchSession ? (
                    <>
                      <button
                        onClick={() => handleAddMatch(activeSession)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all"
                      >
                        <Goal className="w-4 h-4" />
                        +1 Match
                      </button>
                      <button
                        onClick={() => handleStopSession(activeSession.id, station.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all"
                      >
                        <StopCircle className="w-4 h-4" />
                        Arrêter
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleProlongSession(activeSession)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl transition-all"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Prolonger
                      </button>
                      <button
                        onClick={() => handleStopSession(activeSession.id, station.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all"
                      >
                        <StopCircle className="w-4 h-4" />
                        Arrêter
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {workerStations.length === 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-10 text-center">
          <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-white mb-2">Aucune station disponible</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            {user?.role === 'admin'
              ? "Aucune station n'a encore été créée. Cliquez sur « Gérer les stations » pour en ajouter."
              : "Vous n'avez pas encore de café assigné, ou aucune station n'a été créée pour votre café. Contactez l'administrateur."}
          </p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-slate-800 rounded-2xl p-8 w-full max-w-md border border-slate-700 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-6">Démarrer une Session</h2>

            {error && (
              <div className="mb-4 bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleStartSession} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Station</label>
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                >
                  <option value="">Sélectionner une station</option>
                  {workerStations.filter(s => s.status === 'available').map(station => (
                    <option key={station.id} value={station.id}>
                      {station.name} ({station.type?.toUpperCase() || 'PS5'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Jeu</label>
                <select
                  value={selectedGame}
                  onChange={(e) => setSelectedGame(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                >
                  <option value="">Sélectionner un jeu</option>
                  {games.map(game => (
                    <option key={game.id} value={game.id}>
                      {game.name} {game.billing_type === 'match' ? '(par match)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Joueurs</label>
                <select
                  value={playerCount}
                  onChange={(e) => setPlayerCount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="1">1 Joueur</option>
                  <option value="2">2 Joueurs</option>
                </select>
              </div>

              {!isPerMatch && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Durée</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDuration('30min')}
                      className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                        duration === '30min'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      30 min
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuration('1h')}
                      className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                        duration === '1h'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      1 Heure
                    </button>
                  </div>
                </div>
              )}

              {isPerMatch && (
                <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-3 text-sm text-emerald-200">
                  <Goal className="w-4 h-4 inline mr-2" />
                  Ce jeu se facture <strong>par match</strong>. Le prix sera multiplié par le nombre de matchs joués.
                </div>
              )}

              {selectedGame && (
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <p className="text-slate-400 text-sm mb-1">
                    {isPerMatch ? 'Prix par match' : 'Prix estimé'}
                  </p>
                  <p className="text-3xl font-bold text-white">
                    {estimatedPrice.toFixed(2)} {CURRENCY}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setError(null); }}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all shadow-lg"
                >
                  Démarrer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Station management modal (admin) */}
      <AnimatePresence>
        {isStationModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-2xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Gamepad2 className="w-6 h-6 text-blue-400" />
                  {editingStation ? 'Modifier la station' : 'Gestion des Stations'}
                </h2>
                <button
                  onClick={() => { setIsStationModalOpen(false); setEditingStation(null); }}
                  className="text-slate-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              {stationError && (
                <div className="mb-3 bg-red-900/30 border border-red-700/50 rounded-lg p-2 text-sm text-red-300">
                  {stationError}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleStationSubmit} className="space-y-3 bg-slate-900/50 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
                  {editingStation ? 'Modifier' : 'Ajouter une station'}
                </h3>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Nom</label>
                  <input
                    type="text"
                    value={stationForm.name}
                    onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="ex: Station PS5 - 1"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Café</label>
                    <select
                      value={stationForm.cafe_id}
                      onChange={(e) => setStationForm({ ...stationForm, cafe_id: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    >
                      <option value="">Sélectionner</option>
                      {cafes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Type de Console</label>
                    <select
                      value={stationForm.type}
                      onChange={(e) => setStationForm({ ...stationForm, type: e.target.value as 'ps4' | 'ps5' })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="ps5">PS5</option>
                      <option value="ps4">PS4</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Statut</label>
                  <select
                    value={stationForm.status}
                    onChange={(e) => setStationForm({ ...stationForm, status: e.target.value as 'available' | 'maintenance' })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="available">Disponible</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  {editingStation && (
                    <button
                      type="button"
                      onClick={() => { setEditingStation(null); setStationForm({ name: '', cafe_id: cafes[0]?.id || '', status: 'available', type: 'ps5' }); setStationError(null); }}
                      className="px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                  >
                    {editingStation ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                </div>
              </form>

              {/* List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-700">
                {stations.length === 0 && (
                  <p className="text-slate-400 text-center py-6 text-sm">Aucune station. Ajoutez-en une.</p>
                )}
                {stations.map(station => {
                  const cafe = cafes.find(c => c.id === station.cafe_id);
                  return (
                    <div key={station.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-white font-semibold">{station.name}</p>
                        <p className="text-xs text-slate-400">
                          {cafe?.name || 'Sans café'} · {station.type?.toUpperCase() || 'PS5'} · {station.status === 'available' ? 'Disponible' : station.status === 'occupied' ? 'Occupée' : 'Maintenance'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openStationModal(station)}
                          className="p-2 text-blue-400 hover:bg-slate-700 rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStation(station.id)}
                          className="p-2 text-red-400 hover:bg-slate-700 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
