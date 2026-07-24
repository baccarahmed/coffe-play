'use client';

import { useAuth } from '@/app/providers';
import { insforge } from '@/lib/insforge';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface GamePrice {
  id: string;
  game_name: string;
  player_count: string;
  duration: string;
  station_type: 'ps4' | 'ps5';
  price: number;
  created_at?: string;
  updated_at?: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [gamePrices, setGamePrices] = useState<GamePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<GamePrice | null>(null);
  const [formData, setFormData] = useState({
    game_name: '',
    player_count: '2',
    duration: '30min',
    station_type: 'ps5' as 'ps4' | 'ps5',
    price: 0,
  });

  // Récupérer tous les prix des jeux
  const loadGamePrices = async () => {
    setLoading(true);
    try {
      const { data, error } = await insforge.database
        .from('game_prices')
        .select('*')
        .order('game_name')
        .order('player_count')
        .order('duration');

      if (error) {
        console.error('Erreur de récupération des prix :', error);
        return;
      }

      setGamePrices(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGamePrices();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.price < 0) {
      alert('Le prix ne peut pas être négatif');
      return;
    }

    try {
      const { data, error } = await insforge.database
        .from('game_prices')
        .upsert([{
          ...formData,
          price: formData.price
        }], { onConflict: 'game_name,player_count,duration,station_type' })
        .select()
        .single();

      if (error) {
        alert(`Erreur : ${error.message}`);
        return;
      }

      // Recharger la liste
      await loadGamePrices();

      // Fermer la modale
      setIsModalOpen(false);
      setEditingPrice(null);
      setFormData({
        game_name: '',
        player_count: '2',
        duration: '30min',
        station_type: 'ps5',
        price: 0,
      });

    } catch (error) {
      console.error('Erreur :', error);
      alert('Erreur lors de la sauvegarde du prix');
    }
  };

  const handleEdit = (price: GamePrice) => {
    setEditingPrice(price);
    setFormData({
      game_name: price.game_name,
      player_count: price.player_count,
      duration: price.duration,
      station_type: price.station_type,
      price: price.price,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette entrée de prix ?')) {
      const { error } = await insforge.database
        .from('game_prices')
        .delete()
        .eq('id', id);

      if (error) {
        alert(`Erreur : ${error.message}`);
        return;
      }

      await loadGamePrices();
    }
  };

  const getUniqueGames = () => {
    return Array.from(new Set(gamePrices.map(p => p.game_name))).sort();
  };

  const getAvailableCombinaisons = (gameName: string) => {
    return gamePrices
      .filter(p => p.game_name === gameName)
      .map(p => `${p.player_count}-${p.duration}`);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Configuration des Tarifs</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Ajouter un Tarif
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-white text-lg">Chargement...</div>
        </div>
      ) : (
        <>
          {/* Desktop Table - hidden on mobile */}
          <div className="hidden md:block">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="text-left px-6 py-4 text-slate-300 font-medium">Jeu</th>
                    <th className="text-left px-6 py-4 text-slate-300 font-medium">Console</th>
                    <th className="text-left px-6 py-4 text-slate-300 font-medium">Joueurs</th>
                    <th className="text-left px-6 py-4 text-slate-300 font-medium">Durée</th>
                    <th className="text-left px-6 py-4 text-slate-300 font-medium">Prix</th>
                    <th className="text-left px-6 py-4 text-slate-300 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {gamePrices.map((price, index) => (
                    <motion.tr
                      key={price.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-slate-700/50"
                    >
                      <td className="px-6 py-4 text-white">{price.game_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          price.station_type === 'ps5' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'
                        }`}>
                          {price.station_type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300">{price.player_count}</td>
                      <td className="px-6 py-4 text-slate-300">{price.duration}</td>
                      <td className="px-6 py-4 text-white font-semibold">{price.price.toFixed(2)} TND</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(price)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-600 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(price.id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-600 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {gamePrices.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                        Aucune configuration de tarif trouvée. Cliquez sur "Ajouter un Tarif" pour commencer.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards - hidden on desktop */}
          <div className="md:hidden space-y-4 p-4">
            {gamePrices.length === 0 && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
                <p className="text-slate-400">Aucune configuration de tarif trouvée. Cliquez sur "Ajouter un Tarif" pour commencer.</p>
              </div>
            )}
            {gamePrices.map((price, index) => (
              <motion.div
                key={price.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-800 rounded-xl p-4 border border-slate-700"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-white font-semibold text-lg">{price.game_name}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    price.station_type === 'ps5' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'
                  }`}>
                    {price.station_type.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <span className="text-slate-400 text-sm block">Joueurs</span>
                    <span className="text-white font-medium">{price.player_count}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm block">Durée</span>
                    <span className="text-white font-medium">{price.duration}</span>
                  </div>
                </div>
                <div className="mb-3">
                  <span className="text-slate-400 text-sm block">Prix</span>
                  <span className="text-white font-semibold text-lg">{price.price.toFixed(2)} TND</span>
                </div>
                <div className="flex gap-2 pt-2 border-t border-slate-700">
                  <button
                    onClick={() => handleEdit(price)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(price.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Modale */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700"
            >
              <h2 className="text-xl font-bold text-white mb-6">
                {editingPrice ? 'Modifier le Tarif' : 'Ajouter un Tarif'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nom du Jeu
                  </label>
                  <select
                    value={formData.game_name}
                    onChange={(e) => setFormData({ ...formData, game_name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="">Sélectionnez un jeu</option>
                    {['FIFA', 'Mortal Kombat', 'UFC', 'GTA V'].map(game => (
                      <option key={game} value={game}>{game}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Type de Tarification
                  </label>
                  <select
                    value={formData.game_name ? (formData.game_name === 'FIFA' ? 'match' : 'duration') : 'duration'}
                    onChange={(e) => {
                      const selectedGame = e.target.value;
                      if (selectedGame === 'FIFA') {
                        // For FIFA: only match-based pricing
                        // Set player_count to 1 automatically
                        setFormData({
                          ...formData,
                          game_name: 'FIFA',
                          player_count: '1'
                        });
                      } else {
                        // For other games: duration-based pricing
                        setFormData({
                          ...formData,
                          game_name: selectedGame,
                          player_count: formData.player_count === '4' ? '2' : formData.player_count || '1'
                        });
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="duration">Durée (Mortal Kombat, UFC, GTA V)</option>
                    <option value="match">Match (FIFA)</option>
                  </select>
                </div>

                {(formData.game_name !== 'FIFA' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nombre de Joueurs
                    </label>
                    <select
                      value={formData.player_count}
                      onChange={(e) => setFormData({ ...formData, player_count: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    >
                      <option value="1">1 Joueur</option>
                      <option value="2">2 Joueurs</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nombre de Matches (pour le type Match de FIFA)
                    </label>
                    <select
                      value={formData.player_count}
                      onChange={(e) => setFormData({ ...formData, player_count: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    >
                      <option value="1">1 Match</option>
                      <option value="2">2 Matches</option>
                    </select>
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Type de Console
                  </label>
                  <select
                    value={formData.station_type}
                    onChange={(e) => setFormData({ ...formData, station_type: e.target.value as 'ps4' | 'ps5' })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    <option value="ps5">PS5</option>
                    <option value="ps4">PS4</option>
                  </select>
                </div>
                
                {(formData.game_name !== 'FIFA' ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Durée
                    </label>
                    <select
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    >
                      <option value="30min">30 min</option>
                      <option value="1h">1 Heure</option>
                    </select>
                  </div>
                ) : (
                  <div className="bg-slate-600/50 p-4 rounded-lg border border-slate-500">
                    <div className="text-sm text-slate-400 font-medium mb-1">
                      Type de Tarification: Match (FIFA)
                    </div>
                    <div className="text-xs text-slate-500">
                      Prix par match par joueur selon la console sélectionnée
                    </div>
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Prix (TND)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    {(formData.game_name === 'FIFA' || formData.game_name === '')
                      ? 'Prix par match de 1 joueur'
                      : (formData.player_count === '1' ? 'Prix pour 1 joueur par durée' : 'Prix pour 2 joueurs par durée')
                    }
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingPrice(null);
                    }}
                    className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {editingPrice ? 'Mettre à jour' : 'Ajouter'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}