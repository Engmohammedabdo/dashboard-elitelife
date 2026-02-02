'use client';

import { useTranslations } from 'next-intl';
import { Calendar, CheckCircle, Clock, UserCheck, CalendarClock, Bell, UserX, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  todayTotal?: number;
  upcoming?: number;
  needsReminder?: number;
  noShow?: number;
}

export default function StatsCards({
  total,
  confirmed,
  pending,
  completed,
  todayTotal = 0,
  upcoming = 0,
  needsReminder = 0,
  noShow = 0
}: StatsCardsProps) {
  const t = useTranslations('dashboard');

  // Primary stats (always shown)
  const primaryStats = [
    {
      label: t('totalBookings'),
      value: total,
      icon: Calendar,
      color: 'bg-primary',
      textColor: 'text-primary'
    },
    {
      label: t('confirmed'),
      value: confirmed,
      icon: CheckCircle,
      color: 'bg-success',
      textColor: 'text-success'
    },
    {
      label: t('pending'),
      value: pending,
      icon: Clock,
      color: 'bg-warning',
      textColor: 'text-warning'
    },
    {
      label: t('completed'),
      value: completed,
      icon: UserCheck,
      color: 'bg-secondary',
      textColor: 'text-secondary'
    }
  ];

  // Secondary stats (shown in smaller cards)
  const secondaryStats = [
    {
      label: t('todayAppointments'),
      value: todayTotal,
      icon: CalendarClock,
      color: 'bg-blue-500',
      textColor: 'text-blue-500'
    },
    {
      label: t('upcoming'),
      value: upcoming,
      icon: TrendingUp,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-500'
    },
    {
      label: t('needsReminder'),
      value: needsReminder,
      icon: Bell,
      color: 'bg-orange-500',
      textColor: 'text-orange-500',
      highlight: needsReminder > 0
    },
    {
      label: t('noShow'),
      value: noShow,
      icon: UserX,
      color: 'bg-red-500',
      textColor: 'text-red-500',
      highlight: noShow > 0
    }
  ];

  return (
    <div className="space-y-4">
      {/* Primary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {primaryStats.map((stat) => (
          <div
            key={stat.label}
            className="card p-4 flex flex-col items-center justify-center text-center"
          >
            <div className={`w-12 h-12 ${stat.color} bg-opacity-10 rounded-full flex items-center justify-center mb-3`}>
              <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
            <p className="text-sm text-text-secondary">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {secondaryStats.map((stat) => (
          <div
            key={stat.label}
            className={`card p-3 flex items-center gap-3 ${
              stat.highlight ? 'ring-2 ring-offset-1 ring-warning/50' : ''
            }`}
          >
            <div className={`w-10 h-10 ${stat.color} bg-opacity-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
              <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-text-secondary truncate">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
