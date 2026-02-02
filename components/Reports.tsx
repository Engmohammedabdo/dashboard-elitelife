'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { BarChart3, TrendingUp, Users, Calendar, Clock, Star, AlertTriangle } from 'lucide-react';
import type { Appointment, Department, Doctor } from '@/types/database';
import { toLocalDateString } from '@/lib/utils';

interface ReportsProps {
  appointments: Appointment[];
  departments: Department[];
  doctors: Doctor[];
}

export default function Reports({ appointments, departments, doctors }: ReportsProps) {
  const t = useTranslations('reports');
  const locale = useLocale();

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    const now = new Date();
    const todayStr = toLocalDateString(now);

    // Time-based filters
    const thisMonth = appointments.filter((a) => {
      const aptDate = new Date(a.date);
      return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
    });

    const lastMonth = appointments.filter((a) => {
      const aptDate = new Date(a.date);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return aptDate.getMonth() === lastMonthDate.getMonth() && aptDate.getFullYear() === lastMonthDate.getFullYear();
    });

    const thisWeek = appointments.filter((a) => {
      const aptDate = new Date(a.date);
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return aptDate >= weekAgo && aptDate <= now;
    });

    // Attendance rate
    const completedAppts = appointments.filter((a) => a.status === 'completed' || a.attended);
    const totalScheduled = appointments.filter((a) => a.status !== 'cancelled');
    const attendanceRate = totalScheduled.length > 0
      ? Math.round((completedAppts.length / totalScheduled.length) * 100)
      : 0;

    // No-show rate
    const noShows = appointments.filter((a) => a.status === 'no_show');
    const noShowRate = totalScheduled.length > 0
      ? Math.round((noShows.length / totalScheduled.length) * 100)
      : 0;

    // Cancellation rate
    const cancelled = appointments.filter((a) => a.status === 'cancelled');
    const cancellationRate = appointments.length > 0
      ? Math.round((cancelled.length / appointments.length) * 100)
      : 0;

    // Average appointments per day (this month)
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const avgPerDay = thisMonth.length > 0 ? (thisMonth.length / daysInMonth).toFixed(1) : '0';

    // Growth compared to last month
    const growth = lastMonth.length > 0
      ? Math.round(((thisMonth.length - lastMonth.length) / lastMonth.length) * 100)
      : thisMonth.length > 0 ? 100 : 0;

    // Top performing department
    const deptStats = departments.map((dept) => ({
      department: dept,
      count: appointments.filter((a) => a.department_id === dept.id).length
    })).sort((a, b) => b.count - a.count);

    // Top doctor by appointments
    const doctorStats = doctors.map((doc) => ({
      doctor: doc,
      count: appointments.filter((a) => a.doctor_id === doc.id).length,
      attended: appointments.filter((a) => a.doctor_id === doc.id && a.attended).length
    })).sort((a, b) => b.count - a.count);

    // Appointments by day of week
    const byDayOfWeek = Array(7).fill(0);
    appointments.forEach((a) => {
      const day = new Date(a.date).getDay();
      byDayOfWeek[day]++;
    });

    // Peak hours
    const byHour: Record<string, number> = {};
    appointments.forEach((a) => {
      const hour = a.time.split(':')[0];
      byHour[hour] = (byHour[hour] || 0) + 1;
    });
    const peakHour = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0]?.[0] || '10';

    // Reminder effectiveness
    const remindedAppts = appointments.filter((a) => a.reminder_sent_24h || a.reminder_sent_today);
    const remindedAttended = remindedAppts.filter((a) => a.attended);
    const reminderEffectiveness = remindedAppts.length > 0
      ? Math.round((remindedAttended.length / remindedAppts.length) * 100)
      : 0;

    return {
      thisMonth: thisMonth.length,
      lastMonth: lastMonth.length,
      thisWeek: thisWeek.length,
      attendanceRate,
      noShowRate,
      cancellationRate,
      avgPerDay,
      growth,
      topDepartment: deptStats[0],
      topDoctor: doctorStats[0],
      doctorStats,
      deptStats,
      byDayOfWeek,
      peakHour,
      reminderEffectiveness,
      pendingReminders: appointments.filter((a) => {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = toLocalDateString(tomorrow);
        return (
          (a.date === tomorrowStr && !a.reminder_sent_24h) ||
          (a.date === todayStr && !a.reminder_sent_today)
        ) && a.status !== 'cancelled';
      }).length
    };
  }, [appointments, departments, doctors]);

  const weekDays = locale === 'ar'
    ? ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{analytics.thisMonth}</p>
          <p className="text-xs text-text-secondary">{t('thisMonth')}</p>
          {analytics.growth !== 0 && (
            <p className={`text-xs mt-1 ${analytics.growth > 0 ? 'text-success' : 'text-red-500'}`}>
              {analytics.growth > 0 ? '+' : ''}{analytics.growth}% {t('vsLastMonth')}
            </p>
          )}
        </div>

        <div className="card p-4 text-center">
          <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <p className="text-2xl font-bold text-foreground">{analytics.attendanceRate}%</p>
          <p className="text-xs text-text-secondary">{t('attendanceRate')}</p>
        </div>

        <div className="card p-4 text-center">
          <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{analytics.noShowRate}%</p>
          <p className="text-xs text-text-secondary">{t('noShowRate')}</p>
        </div>

        <div className="card p-4 text-center">
          <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-2">
            <Clock className="w-5 h-5 text-secondary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{analytics.avgPerDay}</p>
          <p className="text-xs text-text-secondary">{t('avgPerDay')}</p>
        </div>
      </div>

      {/* Department & Doctor Performance */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Department Stats */}
        <div className="card p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {t('byDepartment')}
          </h3>
          <div className="space-y-3">
            {analytics.deptStats.map((stat) => {
              const maxCount = analytics.deptStats[0]?.count || 1;
              const percentage = (stat.count / maxCount) * 100;
              const deptName = locale === 'ar' ? stat.department.name_ar : stat.department.name_en;

              return (
                <div key={stat.department.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{deptName}</span>
                    <span className="text-text-secondary">{stat.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Doctor Stats */}
        <div className="card p-4">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-secondary" />
            {t('byDoctor')}
          </h3>
          <div className="space-y-3">
            {analytics.doctorStats.slice(0, 5).map((stat) => {
              const maxCount = analytics.doctorStats[0]?.count || 1;
              const percentage = (stat.count / maxCount) * 100;
              const attendanceRate = stat.count > 0 ? Math.round((stat.attended / stat.count) * 100) : 0;
              const doctorName = locale === 'ar' ? stat.doctor.name_ar : stat.doctor.name_en;

              return (
                <div key={stat.doctor.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{doctorName}</span>
                    <span className="text-text-secondary">
                      {stat.count} ({attendanceRate}% {t('attended')})
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Weekly Distribution */}
      <div className="card p-4">
        <h3 className="font-semibold text-foreground mb-3">{t('weeklyDistribution')}</h3>
        <div className="flex items-end justify-between h-32 gap-2">
          {analytics.byDayOfWeek.map((count, index) => {
            const maxCount = Math.max(...analytics.byDayOfWeek, 1);
            const height = (count / maxCount) * 100;

            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '100px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-primary rounded-t-lg transition-all"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <p className="text-xs text-text-secondary mt-2">{weekDays[index]}</p>
                <p className="text-xs font-medium text-foreground">{count}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm text-text-secondary mb-1">{t('peakHour')}</p>
          <p className="text-xl font-bold text-foreground">{analytics.peakHour}:00</p>
        </div>

        <div className="card p-4">
          <p className="text-sm text-text-secondary mb-1">{t('cancellationRate')}</p>
          <p className="text-xl font-bold text-foreground">{analytics.cancellationRate}%</p>
        </div>

        <div className="card p-4">
          <p className="text-sm text-text-secondary mb-1">{t('reminderEffectiveness')}</p>
          <p className="text-xl font-bold text-foreground">{analytics.reminderEffectiveness}%</p>
        </div>
      </div>

      {/* Pending Reminders Alert */}
      {analytics.pendingReminders > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0" />
          <div>
            <p className="font-medium text-foreground">{t('pendingReminders')}</p>
            <p className="text-sm text-text-secondary">
              {analytics.pendingReminders} {t('appointmentsNeedReminder')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
