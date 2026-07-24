'use client';

import { useAuth } from '@/app/providers';
import { insforge } from '@/lib/insforge';
import { TrendingUp, DollarSign, Users, Coffee, Gamepad2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Sector
} from 'recharts';

interface Session {
  id: string;
  total_price: number;
  start_time: string;
  cafe_id?: string;
  station_id?: string;
}

interface Sale {
  id: string;
  total_price: number;
  sale_time: string;
  cafe_id?: string;
}

const CURRENCY = 'TND';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cafes, setCafes] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    const [sessionsRes, salesRes, cafesRes, stationsRes] = await Promise.all([
      insforge.database.from('sessions').select('id, total_price, start_time, cafe_id, station_id'),
      insforge.database.from('sales').select('*'),
      insforge.database.from('cafes').select('*'),
      insforge.database.from('stations').select('*'),
    ]);
    // Filter data by user's cafe if worker
    if (user?.role === 'worker' && user?.cafeId) {
      const filteredSessions = (sessionsRes.data || []).filter(s => String(s.cafe_id) === String(user.cafeId));
      const filteredSales = (salesRes.data || []).filter(sale => String(sale.cafe_id) === String(user.cafeId));
      const filteredCafes = (cafesRes.data || []).filter(c => String(c.id) === String(user.cafeId));
      setSessions(filteredSessions);
      setSales(filteredSales);
      setCafes(filteredCafes);
    } else {
      setSessions(sessionsRes.data || []);
      setSales(salesRes.data || []);
      setCafes(cafesRes.data || []);
    }
    setStations(stationsRes.data || []);
  };

  const totalRevenue = sessions.reduce((sum, s) => sum + s.total_price, 0) + sales.reduce((sum, s) => sum + s.total_price, 0);
  const totalSessions = sessions.length;
  const totalSales = sales.length;

  const revenueByDay = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toISOString().split('T')[0];
    const daySessions = sessions.filter(s => s.start_time?.startsWith(dateStr));
    const daySales = sales.filter(s => s.sale_time?.startsWith(dateStr));
    return {
      name: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
      sessions: daySessions.reduce((sum, s) => sum + s.total_price, 0),
      sales: daySales.reduce((sum, s) => sum + s.total_price, 0),
      total: daySessions.reduce((sum, s) => sum + s.total_price, 0) + daySales.reduce((sum, s) => sum + s.total_price, 0)
    };
  });

  const revenueType = [
    { name: 'Sessions', value: sessions.reduce((sum, s) => sum + s.total_price, 0), color: '#3b82f6' },
    { name: 'Ventes', value: sales.reduce((sum, s) => sum + s.total_price, 0), color: '#10b981' }
  ];

  const COLORS = ['#3b82f6', '#10b981'];

  const renderActiveShape = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-midAngle * Math.PI / 180);
    const cos = Math.cos(-midAngle * Math.PI / 180);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 6} outerRadius={outerRadius + 10} fill={fill} />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#fff" fontSize="12">
          {payload.name}
        </text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#94a3b8" fontSize="11">
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      </g>
    );
  };

  const [activeIndex, setActiveIndex] = useState(0);
  const onPieEnter = (_: any, index: number) => setActiveIndex(index);

  const statsCards = [
    {
      icon: DollarSign,
      label: 'Revenu Total',
      value: `${totalRevenue.toFixed(2)} ${CURRENCY}`,
      color: 'from-blue-500 to-cyan-400',
    },
    {
      icon: Gamepad2,
      label: 'Sessions Totales',
      value: totalSessions.toString(),
      color: 'from-purple-500 to-pink-400',
    },
    {
      icon: Coffee,
      label: 'Ventes Totales',
      value: totalSales.toString(),
      color: 'from-green-500 to-emerald-400',
    },
    {
      icon: AlertTriangle,
      label: 'Alertes',
      value: '2',
      color: 'from-orange-500 to-red-400',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 mt-1">Vue d&apos;ensemble des performances</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-slate-400">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-6">Revenu par Jour</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueByDay} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6, fill: '#3b82f6' }} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="sessions" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4, fill: '#8b5cf6' }} />
                <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-6">Répartition Revenu</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  data={revenueType}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                >
                  {revenueType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cafes.map((cafe, index) => {
          const cafeSessions = sessions.filter(s => {
            const station = stations.find(st => st.id === s.station_id);
            return station?.cafe_id === cafe.id;
          });
          const cafeSales = sales.filter(s => s.cafe_id === cafe.id);
          const cafeRevenue = cafeSessions.reduce((sum, s) => sum + s.total_price, 0) + cafeSales.reduce((sum, s) => sum + s.total_price, 0);

          return (
            <motion.div
              key={cafe.id}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-slate-800 rounded-2xl p-6 border border-slate-700"
            >
              <h3 className="text-xl font-bold text-white mb-4">{cafe.name}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm mb-1">Revenu</p>
                  <p className="text-2xl font-bold text-white">{cafeRevenue.toFixed(2)} {CURRENCY}</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm mb-1">Sessions</p>
                  <p className="text-2xl font-bold text-white">{cafeSessions.length}</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-sm mb-1">Ventes</p>
                  <p className="text-2xl font-bold text-white">{cafeSales.length}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
