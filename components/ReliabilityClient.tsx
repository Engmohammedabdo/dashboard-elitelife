'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import SidebarWrapper from './SidebarWrapper';
import ReliabilityScoreReport from './ReliabilityScoreReport';
import PatientTimeline from './PatientTimeline';
import type { PatientProfile } from '@/types/database';

export default function ReliabilityClient() {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);

  return (
    <div className={`min-h-screen bg-gray-50/50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Sidebar */}
      <SidebarWrapper />

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isRTL ? 'mr-[260px]' : 'ml-[260px]'}`}>
        <div className="p-6">
          <ReliabilityScoreReport onPatientClick={setSelectedPatient} />
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
