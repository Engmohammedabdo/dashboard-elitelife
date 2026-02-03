'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  MessageSquare, Clock, Calendar, Users, Zap, Target, Award, XCircle,
  ChevronDown, ChevronUp, Sparkles, BarChart3, PieChart, Activity,
  ThumbsUp, ThumbsDown, Wrench, Globe, RefreshCw, ArrowRight,
  Lightbulb, AlertCircle, Info, ExternalLink
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart
} from 'recharts';
import { analyzeAIPerformance, AIPerformanceMetrics, ProblemAnalysis, StrengthAnalysis } from '@/lib/ai-analytics';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AIPerformanceReport() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [metrics, setMetrics] = useState<AIPerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);
  const [expandedStrength, setExpandedStrength] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'problems' | 'strengths' | 'details'>('overview');

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeAIPerformance();
      setMetrics(data);
    } catch (err) {
      setError(isRTL ? 'فشل في تحميل البيانات' : 'Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'high': return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'medium': return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'low': return <Info className="w-5 h-5 text-blue-600" />;
      default: return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="relative">
            <Bot className="w-20 h-20 text-primary mx-auto animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          </div>
          <p className="mt-6 text-lg text-gray-600 font-medium">
            {isRTL ? 'جاري تحليل أداء الذكاء الاصطناعي...' : 'Analyzing AI Performance...'}
          </p>
          <p className="mt-2 text-sm text-gray-400">
            {isRTL ? 'يتم فحص جميع المحادثات' : 'Examining all conversations'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
          <p className="mt-4 text-lg text-gray-600">{error}</p>
          <button
            onClick={loadMetrics}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            {isRTL ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const resolutionData = [
    { name: isRTL ? 'حلها AI' : 'AI Resolved', value: metrics.resolved_by_ai, color: '#10b981' },
    { name: isRTL ? 'تدخل موظف' : 'Staff Help', value: metrics.resolved_by_staff, color: '#f59e0b' },
    { name: isRTL ? 'غير محلولة' : 'Unresolved', value: metrics.unresolved, color: '#ef4444' },
  ];

  const languageData = [
    { name: isRTL ? 'عربي' : 'Arabic', value: metrics.arabic_conversations, color: '#3b82f6' },
    { name: isRTL ? 'إنجليزي' : 'English', value: metrics.english_conversations, color: '#10b981' },
    { name: isRTL ? 'مختلط' : 'Mixed', value: metrics.mixed_conversations, color: '#8b5cf6' },
  ];

  const toolUsageData = Object.entries(metrics.tool_usage)
    .map(([name, count]) => ({ name: name.replace(/_/g, ' '), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const hourlyData = Object.entries(metrics.busiest_hours)
    .map(([hour, count]) => ({
      hour: `${hour}:00`,
      messages: count
    }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  // Calculate overall score
  const overallScore = Math.round(
    (metrics.resolution_rate * 0.4) +
    (metrics.booking_success_rate * 0.3) +
    ((100 - metrics.staff_intervention_rate) * 0.3)
  );

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return { ar: 'ممتاز', en: 'Excellent' };
    if (score >= 60) return { ar: 'جيد', en: 'Good' };
    if (score >= 40) return { ar: 'يحتاج تحسين', en: 'Needs Improvement' };
    return { ar: 'ضعيف', en: 'Poor' };
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {isRTL ? 'تقرير أداء الذكاء الاصطناعي' : 'AI Performance Report'}
              </h1>
              <p className="text-gray-500 mt-1">
                {isRTL ? 'تحليل شامل لأداء المساعد الذكي' : 'Comprehensive AI Assistant Analysis'}
              </p>
            </div>
          </div>
          <button
            onClick={loadMetrics}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            {isRTL ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </motion.div>

      {/* Overall Score Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-8"
      >
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8">
            <div className="flex items-center justify-between flex-wrap gap-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                    <circle
                      cx="64" cy="64" r="56" fill="none"
                      stroke={overallScore >= 80 ? '#10b981' : overallScore >= 60 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${overallScore * 3.52} 352`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                      {overallScore}%
                    </span>
                    <span className="text-xs text-gray-500">
                      {isRTL ? 'الدرجة الكلية' : 'Overall Score'}
                    </span>
                  </div>
                </div>
                <div>
                  <h2 className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                    {isRTL ? getScoreLabel(overallScore).ar : getScoreLabel(overallScore).en}
                  </h2>
                  <p className="text-gray-500 mt-1 max-w-md">
                    {isRTL
                      ? `تم تحليل ${metrics.total_conversations} محادثة و ${metrics.total_messages} رسالة`
                      : `Analyzed ${metrics.total_conversations} conversations and ${metrics.total_messages} messages`
                    }
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-white/80 rounded-2xl">
                  <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-xl mx-auto mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{metrics.resolution_rate.toFixed(0)}%</p>
                  <p className="text-xs text-gray-500">{isRTL ? 'نسبة الحل' : 'Resolution'}</p>
                </div>
                <div className="text-center p-4 bg-white/80 rounded-2xl">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-xl mx-auto mb-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{metrics.bookings_completed}</p>
                  <p className="text-xs text-gray-500">{isRTL ? 'حجوزات ناجحة' : 'Bookings'}</p>
                </div>
                <div className="text-center p-4 bg-white/80 rounded-2xl">
                  <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-xl mx-auto mb-2">
                    <Users className="w-5 h-5 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{metrics.staff_intervention_rate.toFixed(0)}%</p>
                  <p className="text-xs text-gray-500">{isRTL ? 'تدخل موظفين' : 'Staff Help'}</p>
                </div>
                <div className="text-center p-4 bg-white/80 rounded-2xl">
                  <div className="flex items-center justify-center w-10 h-10 bg-purple-100 rounded-xl mx-auto mb-2">
                    <Zap className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{metrics.total_tool_calls}</p>
                  <p className="text-xs text-gray-500">{isRTL ? 'استدعاء أدوات' : 'Tool Calls'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: 'overview', icon: BarChart3, label: { ar: 'نظرة عامة', en: 'Overview' } },
          { id: 'problems', icon: AlertTriangle, label: { ar: 'نقاط الضعف', en: 'Problems' }, count: metrics.problems.length },
          { id: 'strengths', icon: Award, label: { ar: 'نقاط القوة', en: 'Strengths' }, count: metrics.strengths.length },
          { id: 'details', icon: Activity, label: { ar: 'تفاصيل', en: 'Details' } },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-lg shadow-primary/30'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {isRTL ? tab.label.ar : tab.label.en}
            {tab.count !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Resolution Chart */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary" />
                {isRTL ? 'توزيع حالات المحادثات' : 'Conversation Resolution'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={resolutionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {resolutionData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Language Distribution */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                {isRTL ? 'توزيع اللغات' : 'Language Distribution'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={languageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {languageData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tool Usage */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-primary" />
                {isRTL ? 'استخدام الأدوات' : 'Tool Usage'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={toolUsageData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hourly Activity */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                {isRTL ? 'النشاط بالساعة' : 'Hourly Activity'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="messages" stroke="#10b981" fill="#10b98133" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'problems' && (
          <motion.div
            key="problems"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {metrics.problems.length === 0 ? (
              <div className="bg-green-50 rounded-2xl p-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-green-800">
                  {isRTL ? 'لا توجد مشاكل كبيرة!' : 'No Major Problems!'}
                </h3>
                <p className="text-green-600 mt-2">
                  {isRTL ? 'الـ AI يعمل بشكل جيد' : 'AI is performing well'}
                </p>
              </div>
            ) : (
              metrics.problems.map((problem, index) => (
                <ProblemCard
                  key={problem.id}
                  problem={problem}
                  index={index}
                  isExpanded={expandedProblem === problem.id}
                  onToggle={() => setExpandedProblem(expandedProblem === problem.id ? null : problem.id)}
                  isRTL={isRTL}
                  getSeverityColor={getSeverityColor}
                  getSeverityIcon={getSeverityIcon}
                />
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'strengths' && (
          <motion.div
            key="strengths"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {metrics.strengths.map((strength, index) => (
              <StrengthCard
                key={strength.id}
                strength={strength}
                index={index}
                isExpanded={expandedStrength === strength.id}
                onToggle={() => setExpandedStrength(expandedStrength === strength.id ? null : strength.id)}
                isRTL={isRTL}
              />
            ))}
          </motion.div>
        )}

        {activeTab === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <StatCard
              icon={MessageSquare}
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
              label={isRTL ? 'إجمالي الرسائل' : 'Total Messages'}
              value={metrics.total_messages}
            />
            <StatCard
              icon={Bot}
              iconColor="text-green-600"
              iconBg="bg-green-100"
              label={isRTL ? 'رسائل AI' : 'AI Messages'}
              value={metrics.total_ai_messages}
            />
            <StatCard
              icon={Users}
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
              label={isRTL ? 'رسائل المرضى' : 'Patient Messages'}
              value={metrics.total_patient_messages}
            />
            <StatCard
              icon={Target}
              iconColor="text-yellow-600"
              iconBg="bg-yellow-100"
              label={isRTL ? 'متوسط الرسائل/محادثة' : 'Avg Messages/Conv'}
              value={metrics.avg_messages_per_conversation.toFixed(1)}
            />
            <StatCard
              icon={Clock}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-100"
              label={isRTL ? 'متوسط المدة (دقيقة)' : 'Avg Duration (min)'}
              value={metrics.avg_conversation_duration_minutes}
            />
            <StatCard
              icon={Calendar}
              iconColor="text-pink-600"
              iconBg="bg-pink-100"
              label={isRTL ? 'محاولات الحجز' : 'Booking Attempts'}
              value={metrics.bookings_attempted}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staff Interventions Section */}
      {activeTab === 'problems' && metrics.staff_interventions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-yellow-600" />
            {isRTL ? 'تفاصيل تدخلات الموظفين' : 'Staff Intervention Details'}
          </h3>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">
                      {isRTL ? 'الجلسة' : 'Session'}
                    </th>
                    <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">
                      {isRTL ? 'الوقت' : 'Time'}
                    </th>
                    <th className="px-4 py-3 text-start text-sm font-semibold text-gray-600">
                      {isRTL ? 'رسالة الموظف' : 'Staff Message'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {metrics.staff_interventions.slice(0, 10).map((intervention, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        {intervention.session_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(intervention.timestamp).toLocaleString(isRTL ? 'ar-AE' : 'en-US')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        "{intervention.staff_message}"
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Sub-components
function ProblemCard({
  problem,
  index,
  isExpanded,
  onToggle,
  isRTL,
  getSeverityColor,
  getSeverityIcon
}: {
  problem: ProblemAnalysis;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  isRTL: boolean;
  getSeverityColor: (s: string) => string;
  getSeverityIcon: (s: string) => React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`bg-white rounded-2xl shadow-lg border-2 overflow-hidden ${getSeverityColor(problem.severity)}`}
    >
      <div
        className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="mt-1">{getSeverityIcon(problem.severity)}</div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-gray-800">
                  {isRTL ? problem.description_ar : problem.description_en}
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(problem.severity)}`}>
                  {problem.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {isRTL ? `${problem.count} حالة` : `${problem.count} occurrences`}
              </p>
            </div>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200"
          >
            <div className="p-5 bg-gray-50 space-y-4">
              {/* Root Cause */}
              <div className="flex gap-3">
                <div className="p-2 bg-red-100 rounded-lg h-fit">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-700 text-sm">
                    {isRTL ? 'السبب الجذري' : 'Root Cause'}
                  </h5>
                  <p className="text-sm text-gray-600 mt-1">
                    {isRTL ? problem.root_cause_ar : problem.root_cause_en}
                  </p>
                </div>
              </div>

              {/* Solution */}
              <div className="flex gap-3">
                <div className="p-2 bg-green-100 rounded-lg h-fit">
                  <Lightbulb className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-700 text-sm">
                    {isRTL ? 'الحل المقترح' : 'Suggested Solution'}
                  </h5>
                  <p className="text-sm text-gray-600 mt-1">
                    {isRTL ? problem.solution_ar : problem.solution_en}
                  </p>
                </div>
              </div>

              {/* Examples */}
              {problem.examples.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-700 text-sm mb-2">
                    {isRTL ? 'أمثلة' : 'Examples'}
                  </h5>
                  <div className="space-y-2">
                    {problem.examples.map((ex, i) => (
                      <div key={i} className="p-3 bg-white rounded-lg text-sm">
                        <span className="font-mono text-xs text-gray-400">{ex.session_id}</span>
                        <p className="text-gray-600 mt-1">"{ex.message}"</p>
                        <p className="text-xs text-gray-400 mt-1">{ex.context}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StrengthCard({
  strength,
  index,
  isExpanded,
  onToggle,
  isRTL
}: {
  strength: StrengthAnalysis;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  isRTL: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden"
    >
      <div
        className="p-5 cursor-pointer hover:bg-green-50/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-green-100 rounded-xl">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">
                {isRTL ? strength.description_ar : strength.description_en}
              </h4>
              <p className="text-sm text-green-600 mt-1">
                {isRTL ? `${strength.count} مرة` : `${strength.count} times`}
              </p>
            </div>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-green-200"
          >
            <div className="p-5 bg-green-50/50 space-y-4">
              {/* Impact */}
              <div className="flex gap-3">
                <div className="p-2 bg-green-100 rounded-lg h-fit">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h5 className="font-semibold text-gray-700 text-sm">
                    {isRTL ? 'التأثير الإيجابي' : 'Positive Impact'}
                  </h5>
                  <p className="text-sm text-gray-600 mt-1">
                    {isRTL ? strength.impact_ar : strength.impact_en}
                  </p>
                </div>
              </div>

              {/* Examples */}
              {strength.examples.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-700 text-sm mb-2">
                    {isRTL ? 'أمثلة' : 'Examples'}
                  </h5>
                  <div className="space-y-2">
                    {strength.examples.map((ex, i) => (
                      <div key={i} className="p-3 bg-white rounded-lg text-sm">
                        <span className="font-mono text-xs text-gray-400">{ex.session_id}</span>
                        <p className="text-gray-600 mt-1">"{ex.message}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function StatCard({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
      <div className="flex items-center gap-4">
        <div className={`p-3 ${iconBg} rounded-xl`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
