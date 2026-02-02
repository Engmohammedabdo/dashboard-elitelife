'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Users,
  Phone,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronRight,
  X
} from 'lucide-react';
import SidebarWrapper from './SidebarWrapper';
import PatientTimeline from './PatientTimeline';
import type { PatientProfile } from '@/types/database';

interface PatientsClientProps {
  initialPatients: PatientProfile[];
}

export default function PatientsClient({ initialPatients }: PatientsClientProps) {
  const locale = useLocale();
  const t = useTranslations();
  const isRTL = locale === 'ar';

  const [patients] = useState<PatientProfile[]>(initialPatients);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScore, setFilterScore] = useState<string>('all');
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);

  // Filter patients
  const filteredPatients = patients.filter(p => {
    const matchesSearch = searchQuery === '' ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.whatsapp_number?.includes(searchQuery);

    const matchesScore = filterScore === 'all' || p.reliability_score === filterScore;

    return matchesSearch && matchesScore;
  });

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

  return (
    <div className={`min-h-screen bg-gray-50/50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Sidebar */}
      <SidebarWrapper />

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isRTL ? 'mr-[260px]' : 'ml-[260px]'}`}>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">
              {isRTL ? 'المرضى' : 'Patients'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isRTL
                ? `${filteredPatients.length} مريض مسجل`
                : `${filteredPatients.length} registered patients`}
            </p>
          </div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm mb-6"
          >
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
                <option value="high">{isRTL ? 'موثوقية عالية' : 'High Reliability'}</option>
                <option value="medium">{isRTL ? 'موثوقية متوسطة' : 'Medium Reliability'}</option>
                <option value="low">{isRTL ? 'موثوقية منخفضة' : 'Low Reliability'}</option>
              </select>
            </div>
          </motion.div>

          {/* Patient Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredPatients.map((patient, index) => (
                <motion.div
                  key={patient.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedPatient(patient)}
                  className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-semibold text-primary">
                        {patient.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-gray-800 truncate">
                          {patient.name}
                        </h3>
                        {getScoreBadge(patient.reliability_score)}
                      </div>

                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                        <Phone className="w-3.5 h-3.5" />
                        <span dir="ltr">{patient.whatsapp_number}</span>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>
                          <strong className="text-gray-700">{patient.total_visits || 0}</strong>
                          {' '}{isRTL ? 'زيارات' : 'visits'}
                        </span>
                        <span>
                          <strong className="text-emerald-600">{patient.attended_count || 0}</strong>
                          {' '}{isRTL ? 'حضور' : 'attended'}
                        </span>
                        <span>
                          <strong className="text-red-600">{patient.noshow_count || 0}</strong>
                          {' '}{isRTL ? 'غياب' : 'no-show'}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredPatients.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>{isRTL ? 'لا يوجد مرضى' : 'No patients found'}</p>
            </div>
          )}
        </div>
      </main>

      {/* Patient Timeline Modal */}
      <AnimatePresence>
        {selectedPatient && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPatient(null)}
              className="fixed inset-0 bg-black/50 z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 sm:inset-8 lg:inset-16 z-50 overflow-auto"
            >
              <PatientTimeline
                patient={selectedPatient}
                onClose={() => setSelectedPatient(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
