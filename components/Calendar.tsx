'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDaysInMonth, getFirstDayOfMonth, isSameDay, toLocalDateString } from '@/lib/utils';
import type { Appointment } from '@/types/database';

interface CalendarProps {
  appointments: Appointment[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  compact?: boolean;
}

export default function Calendar({ appointments, selectedDate, onDateSelect, compact = false }: CalendarProps) {
  const t = useTranslations('calendar');
  const locale = useLocale();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);

  const months = t.raw('months') as string[];
  const daysShort = t.raw('daysShort') as string[];

  // Adjust first day for RTL (Saturday first for Arabic)
  const adjustedFirstDay = locale === 'ar' ? (firstDayOfMonth + 1) % 7 : firstDayOfMonth;

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const hasAppointments = (day: number): boolean => {
    const date = new Date(year, month, day);
    const dateStr = toLocalDateString(date);
    return appointments.some((apt) => apt.date === dateStr);
  };

  const isSelected = (day: number): boolean => {
    const date = new Date(year, month, day);
    return isSameDay(date, selectedDate);
  };

  const isToday = (day: number): boolean => {
    const date = new Date(year, month, day);
    const today = new Date();
    return isSameDay(date, today);
  };

  const renderDays = () => {
    const days = [];

    // Empty cells for days before the first day of month
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const hasApts = hasAppointments(day);
      const selected = isSelected(day);
      const todayDate = isToday(day);

      days.push(
        <button
          key={day}
          onClick={() => onDateSelect(new Date(year, month, day))}
          className={`relative h-10 w-full flex items-center justify-center rounded-lg text-sm font-medium transition-colors
            ${selected
              ? 'bg-primary text-white'
              : todayDate
                ? 'bg-secondary/20 text-secondary'
                : 'text-foreground hover:bg-gray-100'
            }
          `}
        >
          {day}
          {hasApts && !selected && (
            <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full" />
          )}
        </button>
      );
    }

    return days;
  };

  return (
    <div className={compact ? 'p-4' : 'card p-4'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={locale === 'ar' ? nextMonth : prevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {locale === 'ar' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
        <h2 className="text-lg font-semibold text-foreground">
          {months[month]} {year}
        </h2>
        <button
          onClick={locale === 'ar' ? prevMonth : nextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {locale === 'ar' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {(locale === 'ar' ? [...daysShort.slice(6), ...daysShort.slice(0, 6)] : daysShort).map((day, index) => (
          <div
            key={index}
            className="h-8 flex items-center justify-center text-xs font-medium text-text-secondary"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {renderDays()}
      </div>
    </div>
  );
}
