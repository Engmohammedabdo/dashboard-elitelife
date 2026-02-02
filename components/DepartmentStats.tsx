'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Building2, TrendingUp } from 'lucide-react';
import type { Department } from '@/types/database';

interface DepartmentStat {
  department: Department;
  total: number;
  completed: number;
  pending: number;
}

interface DepartmentStatsProps {
  stats: DepartmentStat[];
}

export default function DepartmentStats({ stats }: DepartmentStatsProps) {
  const t = useTranslations();
  const locale = useLocale();

  // Filter out departments with no appointments
  const activeStats = stats.filter((s) => s.total > 0);

  if (activeStats.length === 0) {
    return null;
  }

  // Calculate totals
  const totalAppointments = activeStats.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t('departmentStats.title')}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {activeStats.map((stat) => {
          const departmentName = locale === 'ar' ? stat.department.name_ar : stat.department.name_en;
          const completionRate = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
          const share = totalAppointments > 0 ? Math.round((stat.total / totalAppointments) * 100) : 0;

          return (
            <div
              key={stat.department.id}
              className="bg-background rounded-lg p-3 border border-border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-foreground text-sm truncate flex-1">
                  {departmentName}
                </h3>
                <span className="text-xs text-text-secondary bg-gray-100 px-2 py-0.5 rounded-full ms-2">
                  {share}%
                </span>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-primary">{stat.total}</p>
                  <p className="text-xs text-text-secondary">{t('departmentStats.appointments')}</p>
                </div>
                <div className="text-end">
                  <div className="flex items-center gap-1 text-success">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-sm font-medium">{completionRate}%</span>
                  </div>
                  <p className="text-xs text-text-secondary">{t('departmentStats.completionRate')}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-success rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>

              {/* Breakdown */}
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-success">
                  {stat.completed} {t('departmentStats.completed')}
                </span>
                <span className="text-warning">
                  {stat.pending} {t('departmentStats.pending')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
