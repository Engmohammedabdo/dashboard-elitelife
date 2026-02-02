'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight, Plus, Clock, X, Check } from 'lucide-react';
import type { Doctor, DoctorSchedule } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { toLocalDateString } from '@/lib/utils';

interface DoctorScheduleCalendarProps {
  doctors: Doctor[];
  schedules: DoctorSchedule[];
  onScheduleUpdate: () => void;
}

export default function DoctorScheduleCalendar({
  doctors,
  schedules,
  onScheduleUpdate
}: DoctorScheduleCalendarProps) {
  const t = useTranslations();
  const locale = useLocale();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDoctor, setSelectedDoctor] = useState<string | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state for adding schedule
  const [formDoctor, setFormDoctor] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('17:00');

  // Get days in month
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];

    // Add padding for first week
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push(d);
    }

    // Add all days in month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add padding for last week
    const endPadding = 6 - lastDay.getDay();
    for (let i = 1; i <= endPadding; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  }, [currentMonth]);

  // Filter schedules by doctor
  const filteredSchedules = useMemo(() => {
    if (selectedDoctor === 'all') return schedules;
    return schedules.filter((s) => s.doctor_id === selectedDoctor);
  }, [schedules, selectedDoctor]);

  // Get schedules for a specific date
  const getSchedulesForDate = (date: Date) => {
    const dateStr = toLocalDateString(date);
    return filteredSchedules.filter((s) => s.schedule_date === dateStr);
  };

  // Navigate months
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Handle day click
  const handleDayClick = (date: Date) => {
    // Only allow clicking on future or today's dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date >= today) {
      setSelectedDate(date);
      setShowAddModal(true);
      setFormDoctor(selectedDoctor === 'all' ? '' : selectedDoctor);
    }
  };

  // Add schedule
  const handleAddSchedule = async () => {
    if (!selectedDate || !formDoctor) return;

    setLoading(true);
    try {
      const dateStr = toLocalDateString(selectedDate);

      const { error } = await supabase
        .from('doctor_schedules')
        .upsert({
          doctor_id: formDoctor,
          schedule_date: dateStr,
          start_time: formStartTime,
          end_time: formEndTime,
          slot_duration_minutes: 30,
          is_available: true
        }, {
          onConflict: 'doctor_id,schedule_date'
        });

      if (error) throw error;

      setShowAddModal(false);
      setSelectedDate(null);
      onScheduleUpdate();
    } catch (error) {
      console.error('Error adding schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  // Remove schedule
  const handleRemoveSchedule = async (scheduleId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('doctor_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      onScheduleUpdate();
    } catch (error) {
      console.error('Error removing schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle availability
  const handleToggleAvailability = async (schedule: DoctorSchedule) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('doctor_schedules')
        .update({ is_available: !schedule.is_available })
        .eq('id', schedule.id);

      if (error) throw error;
      onScheduleUpdate();
    } catch (error) {
      console.error('Error toggling availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = locale === 'ar'
    ? ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthName = currentMonth.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="card p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t('schedule.title')}
        </h2>

        {/* Doctor Filter */}
        <select
          value={selectedDoctor}
          onChange={(e) => setSelectedDoctor(e.target.value)}
          className="form-input px-3 py-1.5 text-sm"
        >
          <option value="all">{t('schedule.allDoctors')}</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {locale === 'ar' ? doctor.name_ar : doctor.name_en}
            </option>
          ))}
        </select>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-medium text-foreground">{monthName}</h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Week days header */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="p-2 text-center text-sm font-medium text-text-secondary"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {daysInMonth.map((date, index) => {
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          const isToday = date.toDateString() === new Date().toDateString();
          const daySchedules = getSchedulesForDate(date);
          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <div
              key={index}
              onClick={() => !isPast && handleDayClick(date)}
              className={`
                min-h-[80px] p-1 border border-border rounded-lg cursor-pointer
                transition-colors
                ${!isCurrentMonth ? 'bg-gray-50 opacity-50' : 'bg-white'}
                ${isToday ? 'ring-2 ring-primary' : ''}
                ${isPast ? 'cursor-not-allowed opacity-40' : 'hover:border-primary/50'}
              `}
            >
              <div className="text-sm font-medium text-text-secondary mb-1">
                {date.getDate()}
              </div>

              {/* Show schedules */}
              <div className="space-y-1">
                {daySchedules.slice(0, 2).map((schedule) => {
                  const doctor = doctors.find((d) => d.id === schedule.doctor_id);
                  const doctorName = locale === 'ar' ? doctor?.name_ar : doctor?.name_en;

                  return (
                    <div
                      key={schedule.id}
                      onClick={(e) => e.stopPropagation()}
                      className={`
                        text-xs p-1 rounded truncate flex items-center gap-1
                        ${schedule.is_available
                          ? 'bg-success/10 text-success'
                          : 'bg-gray-100 text-text-secondary line-through'
                        }
                      `}
                    >
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{doctorName}</span>
                      <button
                        onClick={() => handleToggleAvailability(schedule)}
                        className="ms-auto flex-shrink-0"
                        title={schedule.is_available ? 'Mark unavailable' : 'Mark available'}
                      >
                        {schedule.is_available ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  );
                })}
                {daySchedules.length > 2 && (
                  <div className="text-xs text-text-secondary text-center">
                    +{daySchedules.length - 2} {t('schedule.more')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Schedule Modal */}
      {showAddModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {t('schedule.addSchedule')}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-text-secondary">
                {selectedDate.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div className="space-y-4">
              {/* Doctor Select */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('schedule.selectDoctor')}
                </label>
                <select
                  value={formDoctor}
                  onChange={(e) => setFormDoctor(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">{t('schedule.selectDoctorPlaceholder')}</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {locale === 'ar' ? doctor.name_ar : doctor.name_en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('schedule.startTime')}
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t('schedule.endTime')}
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="form-input w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddSchedule}
                disabled={!formDoctor || loading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? t('common.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
