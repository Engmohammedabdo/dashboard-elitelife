'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Calendar,
  Loader2,
  Info
} from 'lucide-react';
import type { Patient, PatientProfile, Appointment, ReliabilityAnalytics } from '@/types/database';
import { supabase } from '@/lib/supabase';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface ReliabilityScoreReportProps {
  className?: string;
  onPatientClick?: (patient: PatientProfile) => void;
}

export default function ReliabilityScoreReport({
  className = '',
  onPatientClick
}: ReliabilityScoreReportProps) {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScore, setFilterScore] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'visits'>('score');

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Try to fetch from patient_profiles view first
      const { data: profilesData, error: profilesError } = await supabase
        .from('patient_profiles')
        .select('*');

      if (profilesError) {
        // Fallback to patients table
        const { data: patientsData } = await supabase
          .from('patients')
          .select('*');

        if (patientsData) {
          setPatients(patientsData as PatientProfile[]);
        }
      } else if (profilesData) {
        setPatients(profilesData);
      }

      // Fetch appointments for trend analysis
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: false })
        .limit(1000);

      if (appointmentsData) {
        setAppointments(appointmentsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate analytics
  const analytics: ReliabilityAnalytics = useMemo(() => {
    const high = patients.filter(p => p.reliability_score === 'high').length;
    const medium = patients.filter(p => p.reliability_score === 'medium').length;
    const low = patients.filter(p => p.reliability_score === 'low').length;

    // Calculate average attendance rate
    const patientsWithVisits = patients.filter(p => p.total_visits > 0);
    const avgRate = patientsWithVisits.length > 0
      ? Math.round(
          patientsWithVisits.reduce((sum, p) => {
            const attended = p.attended_count || 0;
            const total = p.appointment_count || p.total_visits || 1;
            return sum + (attended / total);
          }, 0) / patientsWithVisits.length * 100
        )
      : 0;

    // Calculate no-show trend (last 30 days)
    const last30Days: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const noShowCount = appointments.filter(
        a => a.date === dateStr && a.status === 'no_show'
      ).length;
      last30Days.push({ date: dateStr, count: noShowCount });
    }

    // Get at-risk patients (low reliability or many no-shows)
    const atRisk = patients
      .filter(p =>
        p.reliability_score === 'low' ||
        (p.noshow_count && p.noshow_count >= 2)
      )
      .sort((a, b) => (b.noshow_count || 0) - (a.noshow_count || 0))
      .slice(0, 10);

    return {
      total_patients: patients.length,
      high_reliability: high,
      medium_reliability: medium,
      low_reliability: low,
      avg_attendance_rate: avgRate,
      noshow_trend: last30Days,
      at_risk_patients: atRisk
    };
  }, [patients, appointments]);

  // Filter and sort patients
  const filteredPatients = useMemo(() => {
    let filtered = patients.filter(p => {
      const matchesSearch = searchQuery === '' ||
        p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.whatsapp_number?.includes(searchQuery);

      const matchesScore = filterScore === 'all' || p.reliability_score === filterScore;

      return matchesSearch && matchesScore;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'score':
          const scoreOrder = { high: 0, medium: 1, low: 2 };
          return (scoreOrder[a.reliability_score] || 1) - (scoreOrder[b.reliability_score] || 1);
        case 'visits':
          return (b.total_visits || 0) - (a.total_visits || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [patients, searchQuery, filterScore, sortBy]);

  // Pie chart data
  const pieData = [
    { name: isRTL ? 'عالي' : 'High', value: analytics.high_reliability, color: '#10B981' },
    { name: isRTL ? 'متوسط' : 'Medium', value: analytics.medium_reliability, color: '#F59E0B' },
    { name: isRTL ? 'منخفض' : 'Low', value: analytics.low_reliability, color: '#EF4444' }
  ];

  // Area chart data (weekly aggregated)
  const trendData = useMemo(() => {
    const weeks: { week: string; noShows: number; total: number }[] = [];
    const weekMap: Record<string, { noShows: number; total: number }> = {};

    analytics.noshow_trend.forEach((day, index) => {
      const weekNum = Math.floor(index / 7);
      const weekLabel = isRTL ? `أسبوع ${weekNum + 1}` : `Week ${weekNum + 1}`;

      if (!weekMap[weekLabel]) {
        weekMap[weekLabel] = { noShows: 0, total: 0 };
      }

      weekMap[weekLabel].noShows += day.count;
      const dayAppointments = appointments.filter(a => a.date === day.date);
      weekMap[weekLabel].total += dayAppointments.length;
    });

    Object.entries(weekMap).forEach(([week, data]) => {
      weeks.push({ week, noShows: data.noShows, total: data.total });
    });

    return weeks;
  }, [analytics.noshow_trend, appointments, isRTL]);

  const getScoreBadge = (score: string) => {
    switch (score) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
            <TrendingUp className="w-3 h-3" />
            {isRTL ? 'عالي' : 'High'}
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <TrendingDown className="w-3 h-3" />
            {isRTL ? 'منخفض' : 'Low'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            <Activity className="w-3 h-3" />
            {isRTL ? 'متوسط' : 'Medium'}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${className}`}>
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {isRTL ? 'تقرير موثوقية المرضى' : 'Patient Reliability Report'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isRTL
              ? 'تحليل معدل الحضور وموثوقية المرضى'
              : 'Analyze attendance rates and patient reliability'}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {isRTL ? 'تحديث' : 'Refresh'}
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-blue-500">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-800">{analytics.total_patients}</p>
            <p className="text-sm text-gray-500">{isRTL ? 'إجمالي المرضى' : 'Total Patients'}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-emerald-500">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center text-xs font-medium text-emerald-600">
              <ArrowUpRight className="w-3 h-3" />
              {analytics.avg_attendance_rate}%
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-800">{analytics.high_reliability}</p>
            <p className="text-sm text-gray-500">{isRTL ? 'موثوقية عالية' : 'High Reliability'}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="p-2 rounded-lg bg-amber-500 w-fit">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-800">{analytics.medium_reliability}</p>
            <p className="text-sm text-gray-500">{isRTL ? 'موثوقية متوسطة' : 'Medium Reliability'}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="p-2 rounded-lg bg-red-500">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            {analytics.low_reliability > 0 && (
              <div className="flex items-center text-xs font-medium text-red-600">
                <Info className="w-3 h-3 me-1" />
                {isRTL ? 'يحتاج متابعة' : 'Needs attention'}
              </div>
            )}
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-800">{analytics.low_reliability}</p>
            <p className="text-sm text-gray-500">{isRTL ? 'موثوقية منخفضة' : 'Low Reliability'}</p>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            {isRTL ? 'توزيع الموثوقية' : 'Reliability Distribution'}
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            {isRTL ? 'اتجاه عدم الحضور' : 'No-Show Trend'}
          </h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="noShowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="noShows"
                  stroke="#EF4444"
                  fillOpacity={1}
                  fill="url(#noShowGradient)"
                  name={isRTL ? 'لم يحضر' : 'No Shows'}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* At-Risk Patients */}
      {analytics.at_risk_patients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 rounded-xl p-5 border border-red-100"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            {isRTL ? 'مرضى يحتاجون متابعة' : 'At-Risk Patients'}
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analytics.at_risk_patients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => onPatientClick?.(patient)}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-red-100 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-sm font-semibold text-red-600">
                    {patient.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{patient.name}</p>
                  <p className="text-xs text-gray-500">
                    {patient.noshow_count || 0} {isRTL ? 'مرات غياب' : 'no-shows'}
                  </p>
                </div>
                {getScoreBadge(patient.reliability_score)}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Patient List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      >
        {/* Filters */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRTL ? 'بحث عن مريض...' : 'Search patients...'}
                className="w-full ps-10 pe-4 py-2.5 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={filterScore}
              onChange={(e) => setFilterScore(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">{isRTL ? 'جميع المستويات' : 'All Levels'}</option>
              <option value="high">{isRTL ? 'عالي' : 'High'}</option>
              <option value="medium">{isRTL ? 'متوسط' : 'Medium'}</option>
              <option value="low">{isRTL ? 'منخفض' : 'Low'}</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'score' | 'visits')}
              className="px-4 py-2.5 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="score">{isRTL ? 'ترتيب حسب الموثوقية' : 'Sort by Reliability'}</option>
              <option value="name">{isRTL ? 'ترتيب حسب الاسم' : 'Sort by Name'}</option>
              <option value="visits">{isRTL ? 'ترتيب حسب الزيارات' : 'Sort by Visits'}</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-start text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  {isRTL ? 'المريض' : 'Patient'}
                </th>
                <th className="text-start text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  {isRTL ? 'الموثوقية' : 'Reliability'}
                </th>
                <th className="text-start text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  {isRTL ? 'الزيارات' : 'Visits'}
                </th>
                <th className="text-start text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  {isRTL ? 'الحضور' : 'Attended'}
                </th>
                <th className="text-start text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  {isRTL ? 'الغياب' : 'No Shows'}
                </th>
                <th className="text-start text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
                  {isRTL ? 'آخر زيارة' : 'Last Visit'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPatients.slice(0, 50).map((patient, index) => (
                <motion.tr
                  key={patient.id}
                  initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02 }}
                  onClick={() => onPatientClick?.(patient)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {patient.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{patient.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {patient.whatsapp_number}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {getScoreBadge(patient.reliability_score)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {patient.total_visits || patient.appointment_count || 0}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-emerald-600 font-medium">
                      {patient.attended_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-medium ${
                      (patient.noshow_count || 0) > 0 ? 'text-red-600' : 'text-gray-400'
                    }`}>
                      {patient.noshow_count || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {patient.last_visit_date || patient.last_appointment_date
                      ? new Date(patient.last_visit_date || patient.last_appointment_date || '').toLocaleDateString(
                          locale === 'ar' ? 'ar-SA' : 'en-US',
                          { month: 'short', day: 'numeric', year: 'numeric' }
                        )
                      : '-'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPatients.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{isRTL ? 'لا يوجد مرضى' : 'No patients found'}</p>
          </div>
        )}

        {filteredPatients.length > 50 && (
          <div className="p-4 text-center text-sm text-gray-500 border-t border-gray-100">
            {isRTL
              ? `يظهر 50 من ${filteredPatients.length} مريض`
              : `Showing 50 of ${filteredPatients.length} patients`}
          </div>
        )}
      </motion.div>
    </div>
  );
}
