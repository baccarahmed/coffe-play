'use client';

import { useAuth } from '@/app/providers';
import { insforge } from '@/lib/insforge';
import { Plus, Coffee, CheckCircle2, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface Product {
  id: string;
  cafe_id: string;
  name: string;
  category: string;
  base_price: number;
  current_stock: number;
  alert_threshold: number;
}

interface Supplement {
  id: string;
  product_id: string;
  name: string;
  additional_price: number;
}

const CURRENCY = 'TND';

export default function SalesPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [cart, setCart] = useState<{ product: Product; supplements: Supplement[]; quantity: number }[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

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

  const loadData = async () => {
    const [productsRes, supplementsRes] = await Promise.all([
      insforge.database.from('products').select('*'),
      insforge.database.from('supplements').select('*'),
    ]);
    setProducts(productsRes.data || []);
    setSupplements(supplementsRes.data || []);
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, supplements: [], quantity: 1 }];
    });
  };

  const toggleSupplement = (productId: string, supplement: Supplement) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const isSelected = item.supplements.find(s => s.id === supplement.id);
        return {
          ...item,
          supplements: isSelected ? item.supplements.filter(s => s.id !== supplement.id) : [...item.supplements, supplement]
        };
      }
      return item;
    }));
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + change);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const productTotal = item.product.base_price * item.quantity;
      const supplementsTotal = item.supplements.reduce((sum, s) => sum + s.additional_price * item.quantity, 0);
      return total + productTotal + supplementsTotal;
    }, 0);
  };

  const handleCheckout = async () => {
    if (!user?.cafeId && user?.role !== 'admin') return;
    const total = calculateTotal();
    const cafeId = user?.cafeId || (cart[0]?.product?.cafe_id);

    for (const item of cart) {
      await insforge.database.from('sales').insert([{
        cafe_id: cafeId,
        worker_id: user.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.base_price,
        total_price: (item.product.base_price + item.supplements.reduce((sum, s) => sum + s.additional_price, 0)) * item.quantity,
        supplements: item.supplements,
      }]);

      await insforge.database.from('products').update({
        current_stock: item.product.current_stock - item.quantity
      }).eq('id', item.product.id);

      await insforge.database.from('inventory_movements').insert([{
        cafe_id: cafeId,
        product_id: item.product.id,
        worker_id: user.id,
        movement_type: 'out',
        quantity_change: -item.quantity,
        quantity_after: item.product.current_stock - item.quantity,
      }]);
    }

    setCart([]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
    loadData();
  };

  const visibleProducts = user?.role === 'admin'
    ? products
    : user?.cafeId
      ? products.filter(p => {
          console.log('[Sales] Comparing p.cafe_id:', p.cafe_id, 'with user.cafeId:', user.cafeId, 'types:', typeof p.cafe_id, typeof user.cafeId, 'equal:', p.cafe_id === user.cafeId, 'strict equal:', p.cafe_id === user.cafeId);
          return String(p.cafe_id) === String(user.cafeId);
        })
      : [];

  // Debug: log user and products state
  useEffect(() => {
    console.log('[Sales] user:', user);
    console.log('[Sales] products:', products);
    console.log('[Sales] products.map(p => ({cafe_id: p.cafe_id, type: typeof p.cafe_id})):', products.map(p => ({cafe_id: p.cafe_id, type: typeof p.cafe_id})));
    console.log('[Sales] visibleProducts:', visibleProducts);
  }, [user, products]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShoppingCart className="w-8 h-8 text-blue-400" />
          Ventes
        </h1>
        <p className="text-slate-400 mt-1">Enregistrez les ventes de produits</p>
      </div>

      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed top-6 right-6 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50"
        >
          <CheckCircle2 className="w-6 h-6" />
          <div>
            <p className="font-bold">Vente enregistrée !</p>
            <p className="text-sm opacity-90">La transaction a été complétée avec succès</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleProducts.length === 0 && (
              <div className="col-span-full bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
                <Coffee className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-white mb-1">Aucun produit disponible</h3>
                <p className="text-slate-400 text-sm">
                  {user?.role === 'admin'
                    ? "Aucun produit n'a encore été créé. Allez dans Stock pour en ajouter."
                    : "Aucun produit pour votre café. Demandez à l'administrateur d'en ajouter."}
                </p>
              </div>
            )}
            {visibleProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className={`bg-slate-800 rounded-2xl p-6 border-2 ${
                  product.current_stock <= product.alert_threshold 
                    ? 'border-red-500/50' 
                    : 'border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{product.name}</h3>
                    <p className="text-slate-400 text-sm">{product.category}</p>
                  </div>
                  <span className="text-2xl font-bold text-blue-400">
                    {Number(product.base_price).toFixed(2)} {CURRENCY}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    product.current_stock <= product.alert_threshold
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    Stock: {product.current_stock}
                  </span>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.current_stock === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                      product.current_stock === 0
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
                {supplements.filter(s => s.product_id === product.id).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <p className="text-xs text-slate-500 mb-2">Suppléments:</p>
                    <div className="flex flex-wrap gap-2">
                      {supplements.filter(s => s.product_id === product.id).map(sup => (
                        <span key={sup.id} className="px-2 py-1 bg-slate-700 text-slate-300 rounded-full text-xs">
                          {sup.name} (+{Number(sup.additional_price).toFixed(2)} {CURRENCY})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 sticky top-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Panier
            </h2>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <Coffee className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Panier vide</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
                  {cart.map((item, index) => (
                    <motion.div
                      key={item.product.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-slate-700 rounded-xl p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-white">{item.product.name}</p>
                          <p className="text-xs text-slate-400">{Number(item.product.base_price).toFixed(2)} {CURRENCY}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          &times;
                        </button>
                      </div>

                      {item.supplements.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.supplements.map(s => (
                            <span key={s.id} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="w-8 h-8 bg-slate-600 rounded-lg text-white hover:bg-slate-500"
                          >
                            -
                          </button>
                          <span className="text-white font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="w-8 h-8 bg-slate-600 rounded-lg text-white hover:bg-slate-500"
                          >
                            +
                          </button>
                        </div>
                        <p className="text-slate-300 font-semibold">
                          {(
                            (item.product.base_price + item.supplements.reduce((sum, s) => sum + s.additional_price, 0)) *
                            item.quantity
                          ).toFixed(2)} {CURRENCY}
                        </p>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-600">
                        <p className="text-xs text-slate-400 mb-2">Ajouter des suppléments:</p>
                        <div className="flex flex-wrap gap-2">
                          {supplements
                            .filter(s => s.product_id === item.product.id)
                            .map(sup => (
                              <button
                                key={sup.id}
                                onClick={() => toggleSupplement(item.product.id, sup)}
                                className={`px-3 py-1 rounded-full text-xs transition-all ${
                                  item.supplements.find(s => s.id === sup.id)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                }`}
                              >
                                {sup.name} (+{Number(sup.additional_price).toFixed(2)} {CURRENCY})
                              </button>
                            ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="border-t border-slate-700 pt-4 mb-6">
                  <div className="flex justify-between items-center text-xl font-bold text-white">
                    <span>Total</span>
                    <span>{calculateTotal().toFixed(2)} {CURRENCY}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  Enregistrer la vente
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
