'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Plus, Settings, Users, Calendar, BarChart3 } from 'lucide-react';
import type { Doctor, DoctorSchedule, Department, Appointment } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { toLocalDateString } from '@/lib/utils';
import SidebarWrapper from './SidebarWrapper';
import TopBar from './TopBar';
import DoctorCard from './DoctorCard';
import DoctorFormModal from './DoctorFormModal';
import DoctorScheduleCalendar from './DoctorScheduleCalendar';
import Reports from './Reports';

interface SettingsClientProps {
  initialDoctors: Doctor[];
  initialSchedules: DoctorSchedule[];
  departments: Department[];
  appointments: Appointment[];
}

type Tab = 'doctors' | 'schedule' | 'reports';

export default function SettingsClient({
  initialDoctors,
  initialSchedules,
  departments,
  appointments
}: SettingsClientProps) {
  const t = useTranslations('settings');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const isRTL = locale === 'ar';

  // Get initial tab from URL
  const getInitialTab = (): Tab => {
    const tab = searchParams.get('tab');
    if (tab === 'schedule' || tab === 'doctors' || tab === 'reports') {
      return tab;
    }
    return 'doctors';
  };

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab());
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>(initialSchedules);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Update tab when URL changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'schedule' || tab === 'doctors' || tab === 'reports') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleAddDoctor = () => {
    setEditingDoctor(null);
    setShowModal(true);
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    setShowModal(true);
  };

  const handleSaveDoctor = (saved: Doctor) => {
    if (editingDoctor) {
      setDoctors((prev) =>
        prev.map((d) => (d.id === saved.id ? saved : d))
      );
    } else {
      setDoctors((prev) => [...prev, saved]);
    }
  };

  const refreshSchedules = useCallback(async () => {
    const { data, error } = await supabase
      .from('doctor_schedules')
      .select(`
        *,
        doctor:doctors(*)
      `)
      .gte('schedule_date', toLocalDateString(new Date()))
      .order('schedule_date', { ascending: true });

    if (!error && data) {
      setSchedules(data);
    }
  }, []);

  const tabs = [
    { id: 'doctors' as Tab, label: t('doctors'), icon: Users },
    { id: 'schedule' as Tab, label: t('schedule'), icon: Calendar },
    { id: 'reports' as Tab, label: t('reports'), icon: BarChart3 }
  ];

  return (
    <div className={`min-h-screen bg-gray-50/50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Sidebar */}
      <SidebarWrapper />

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isRTL ? 'mr-[260px]' : 'ml-[260px]'}`}>
        {/* Top Bar */}
        <TopBar />

        <div className="p-6">
          {/* Page Title with Tabs */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">{t('title')}</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200 bg-white rounded-t-xl px-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors
                    border-b-2 -mb-px
                    ${activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                    }
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-b-xl rounded-tr-xl p-6 shadow-sm border border-gray-100">
            {activeTab === 'doctors' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button
                    onClick={handleAddDoctor}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('addDoctor')}
                  </button>
                </div>

                <div className="space-y-4">
                  {doctors.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">{t('noDoctors')}</p>
                      <button
                        onClick={handleAddDoctor}
                        className="btn btn-primary"
                      >
                        {t('addDoctor')}
                      </button>
                    </div>
                  ) : (
                    doctors.map((doctor) => (
                      <DoctorCard
                        key={doctor.id}
                        doctor={doctor}
                        onEdit={() => handleEditDoctor(doctor)}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <DoctorScheduleCalendar
                doctors={doctors}
                schedules={schedules}
                onScheduleUpdate={refreshSchedules}
              />
            )}

            {activeTab === 'reports' && (
              <Reports
                appointments={appointments}
                departments={departments}
                doctors={doctors}
              />
            )}
          </div>
        </div>
      </main>

      {/* Doctor Form Modal */}
      {showModal && (
        <DoctorFormModal
          doctor={editingDoctor}
          onClose={() => setShowModal(false)}
          onSave={handleSaveDoctor}
        />
      )}
    </div>
  );
}
