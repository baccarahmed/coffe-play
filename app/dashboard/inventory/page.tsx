'use client';

import { useAuth } from '@/app/providers';
import { insforge } from '@/lib/insforge';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Product {
  id: string;
  cafe_id: string;
  name: string;
  category: 'beverage' | 'supplement';
  base_price: number;
  current_stock: number;
  alert_threshold: number;
  is_active: boolean;
}

interface Cafe {
  id: string;
  name: string;
}

const CURRENCY = 'TND';

export default function InventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [selectedCafeId, setSelectedCafeId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'beverage' as 'beverage' | 'supplement',
    base_price: 0,
    current_stock: 0,
    alert_threshold: 10,
  });

  useEffect(() => {
    if (user) {
      loadCafes();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCafeId) loadProducts();
  }, [selectedCafeId]);

  // Refetch when page gains focus (for worker/admin pages)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (selectedCafeId) {
          loadProducts();
        }
        loadCafes();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedCafeId]);

  const loadCafes = async () => {
    const { data } = await insforge.database.from('cafes').select('*');
    setCafes(data || []);
    // Choose default cafe: admin without cafeId can pick; worker locked to their cafe
    if (user?.role === 'admin' && data && data.length > 0) {
      setSelectedCafeId((prev) => prev || data[0].id);
    } else if (user?.cafeId) {
      setSelectedCafeId(user.cafeId);
    }
  };

  const loadProducts = async () => {
    const { data, error: queryError } = await insforge.database
      .from('products')
      .select('*')
      .eq('cafe_id', selectedCafeId);
    if (queryError) {
      console.error('Error loading products:', queryError);
      setError('Erreur lors du chargement des produits');
    }
    setProducts(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) return;
    if (!selectedCafeId) {
      setError('Veuillez sélectionner un café.');
      return;
    }

    if (editingProduct) {
      const { error: updateError } = await insforge.database
        .from('products')
        .update(formData)
        .eq('id', editingProduct.id);
      if (updateError) {
        setError(`Erreur: ${updateError.message}`);
        return;
      }
    } else {
      const { error: insertError } = await insforge.database.from('products').insert([
        {
          ...formData,
          cafe_id: selectedCafeId,
        },
      ]);
      if (insertError) {
        setError(`Erreur: ${insertError.message}`);
        return;
      }
    }

    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'beverage',
      base_price: 0,
      current_stock: 0,
      alert_threshold: 10,
    });
    loadProducts();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      base_price: Number(product.base_price),
      current_stock: product.current_stock,
      alert_threshold: product.alert_threshold,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      const { error: delError } = await insforge.database.from('products').delete().eq('id', id);
      if (delError) {
        setError(`Erreur: ${delError.message}`);
        return;
      }
      loadProducts();
    }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Inventaire</h1>
        <div className="flex items-center gap-3">
          {user?.role === 'admin' && cafes.length > 1 && (
            <select
              value={selectedCafeId}
              onChange={(e) => setSelectedCafeId(e.target.value)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              {cafes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            disabled={!selectedCafeId}
          >
            <Plus className="w-5 h-5" />
            Ajouter un Produit
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700/50 rounded-xl p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-700">
              <tr>
                <th className="text-left px-6 py-4 text-slate-300 font-medium">Nom</th>
                <th className="text-left px-6 py-4 text-slate-300 font-medium">Catégorie</th>
                <th className="text-left px-6 py-4 text-slate-300 font-medium">Prix</th>
                <th className="text-left px-6 py-4 text-slate-300 font-medium">Stock</th>
                <th className="text-left px-6 py-4 text-slate-300 font-medium">Seuil d'alerte</th>
                <th className="text-left px-6 py-4 text-slate-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Aucun produit pour ce café. Cliquez sur "Ajouter un Produit" pour commencer.
                  </td>
                </tr>
              )}
              {products.map((product, index) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:bg-slate-700/50"
                >
                  <td className="px-6 py-4 text-white">{product.name}</td>
                  <td className="px-6 py-4 text-slate-300 capitalize">
                    {product.category === 'beverage' ? 'Boisson' : 'Supplément'}
                  </td>
                  <td className="px-6 py-4 text-white">{Number(product.base_price).toFixed(2)} {CURRENCY}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.current_stock <= product.alert_threshold
                          ? 'bg-red-600 text-white'
                          : 'bg-green-600 text-white'
                      }`}
                    >
                      {product.current_stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{product.alert_threshold}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-slate-600 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-slate-600 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards - hidden on desktop */}
      <div className="md:hidden space-y-4 p-4">
        {products.length === 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
            <p className="text-slate-400">Aucun produit pour ce café. Cliquez sur "Ajouter un Produit" pour commencer.</p>
          </div>
        )}
        {products.map((product, index) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="bg-slate-800 rounded-xl p-4 border border-slate-700"
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-white font-semibold text-lg">{product.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                product.category === 'beverage' ? 'bg-blue-500/20 text-blue-300' : 'bg-orange-500/20 text-orange-300'
              }`}>
                {product.category === 'beverage' ? 'Boisson' : 'Supplément'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <span className="text-slate-400 text-sm block">Prix</span>
                <span className="text-white font-medium">{Number(product.base_price).toFixed(2)} {CURRENCY}</span>
              </div>
              <div>
                <span className="text-slate-400 text-sm block">Seuil d'alerte</span>
                <span className="text-white font-medium">{product.alert_threshold}</span>
              </div>
            </div>
            <div className="mb-3">
              <span className="text-slate-400 text-sm block">Stock</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  product.current_stock <= product.alert_threshold
                    ? 'bg-red-600 text-white'
                    : 'bg-green-600 text-white'
                }`}
              >
                {product.current_stock}
              </span>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={() => handleEdit(product)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Modifier
              </button>
              <button
                onClick={() => handleDelete(product.id)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700"
          >
            <h2 className="text-xl font-bold text-white mb-6">
              {editingProduct ? 'Modifier le Produit' : 'Ajouter un Produit'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nom</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Catégorie</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as 'beverage' | 'supplement' })
                  }
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="beverage">Boisson</option>
                  <option value="supplement">Supplément</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Prix ({CURRENCY})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Stock</label>
                <input
                  type="number"
                  min="0"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Seuil d'alerte</label>
                <input
                  type="number"
                  min="0"
                  value={formData.alert_threshold}
                  onChange={(e) => setFormData({ ...formData, alert_threshold: Number(e.target.value) })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProduct(null);
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {editingProduct ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
