'use client';

import { useTranslations, useLocale } from 'next-intl';
import { MapPin, MessageCircle, Phone, Globe, Clock } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { Link } from '@/lib/navigation';
import type { Appointment, ClinicConfig } from '@/types/database';
import { formatDate, formatTime } from '@/lib/utils';

interface HeaderProps {
  nextAppointment?: Appointment | null;
  clinicConfig?: ClinicConfig;
}

export default function Header({ nextAppointment, clinicConfig }: HeaderProps) {
  const t = useTranslations();
  const locale = useLocale();

  const clinicName = locale === 'ar'
    ? (clinicConfig?.clinic_name_ar || 'مركز ايليت لايف الطبي')
    : (clinicConfig?.clinic_name_en || 'Elite Life Medical Centre');

  const phoneNumber = clinicConfig?.clinic_phone?.replace(/\s/g, '') || '';

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Logo and Clinic Name */}
          <div className="flex items-center gap-3">
            {clinicConfig?.logo_url ? (
              <img
                src={clinicConfig.logo_url}
                alt={clinicName}
                className="w-10 h-10 rounded-lg object-contain"
              />
            ) : (
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">EL</span>
              </div>
            )}
            <div>
              <Link href="/" className="text-lg font-bold text-primary">
                {clinicName}
              </Link>
              {clinicConfig?.working_hours_start && clinicConfig?.working_hours_end && (
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <Clock className="w-3 h-3" />
                  <span>{clinicConfig.working_hours_start} - {clinicConfig.working_hours_end}</span>
                </div>
              )}
            </div>
          </div>

          {/* Address */}
          {clinicConfig?.clinic_address && (
            <a
              href={clinicConfig.google_maps_link || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 text-text-secondary hover:text-primary transition-colors"
            >
              <MapPin className="w-4 h-4" />
              <span className="text-sm max-w-[200px] truncate">{clinicConfig.clinic_address}</span>
            </a>
          )}

          {/* Next Appointment */}
          <div className="hidden lg:block">
            <div className="bg-background rounded-lg px-4 py-2 border border-border">
              <p className="text-xs text-text-secondary mb-1">
                {t('dashboard.nextAppointment')}
              </p>
              {nextAppointment ? (
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(nextAppointment.date, locale)}
                  </p>
                  <p className="text-xs text-primary font-medium">
                    {formatTime(nextAppointment.time, locale)} - {nextAppointment.patient?.name}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">
                  {t('dashboard.noAppointments')}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher />

            {/* Phone */}
            {phoneNumber && (
              <a
                href={`tel:${phoneNumber}`}
                className="flex items-center justify-center w-9 h-9 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                aria-label="Call"
              >
                <Phone className="w-4 h-4" />
              </a>
            )}

            {/* WhatsApp */}
            {phoneNumber && (
              <a
                href={`https://wa.me/${phoneNumber.replace(/\+/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 bg-success text-white rounded-lg hover:bg-success/90 transition-colors"
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            )}

            {/* Instagram */}
            {clinicConfig?.instagram && (
              <a
                href={clinicConfig.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            )}

            {/* Website */}
            {clinicConfig?.website && (
              <a
                href={clinicConfig.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 bg-secondary/10 text-secondary rounded-lg hover:bg-secondary/20 transition-colors"
                aria-label="Website"
              >
                <Globe className="w-4 h-4" />
              </a>
            )}

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1 ms-2">
              <Link
                href="/"
                className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                href="/settings"
                className="px-3 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                {t('nav.settings')}
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
