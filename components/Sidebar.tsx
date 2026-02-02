'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/lib/navigation';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  BarChart3,
  Bell,
  X,
  MessageCircle,
  Users,
  Activity
} from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

interface SidebarProps {
  notificationCount?: number;
  onNotificationClick?: () => void;
}

export default function Sidebar({ notificationCount = 0, onNotificationClick }: SidebarProps) {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [collapsed, setCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const isRTL = locale === 'ar';
  const currentTab = searchParams.get('tab');

  // Sample notifications
  const notifications: Notification[] = [
    {
      id: '1',
      title: isRTL ? 'حجز جديد' : 'New Booking',
      message: isRTL ? 'محمد أحمد حجز موعد الساعة 3:00 م' : 'Mohamed Ahmed booked at 3:00 PM',
      time: isRTL ? 'منذ 5 دقائق' : '5 min ago',
      read: false
    },
    {
      id: '2',
      title: isRTL ? 'تذكير' : 'Reminder',
      message: isRTL ? 'لديك 3 مواعيد اليوم' : 'You have 3 appointments today',
      time: isRTL ? 'منذ ساعة' : '1 hour ago',
      read: true
    }
  ];

  const isSettingsPage = pathname?.includes('settings');

  const isConversationsPage = pathname?.includes('conversations');
  const isPatientsPage = pathname?.includes('patients');
  const isReliabilityPage = pathname?.includes('reliability');

  const menuItems = [
    {
      href: '/',
      icon: LayoutDashboard,
      label: t('dashboard'),
      active: pathname === '/' || pathname === `/${locale}` || pathname === '' || (!isSettingsPage && !isConversationsPage && !isPatientsPage && !isReliabilityPage)
    },
    {
      href: '/conversations',
      icon: MessageCircle,
      label: t('conversations'),
      active: isConversationsPage
    },
    {
      href: '/patients',
      icon: Users,
      label: t('patients'),
      active: isPatientsPage
    },
    {
      href: '/reliability',
      icon: Activity,
      label: t('reliability'),
      active: isReliabilityPage
    },
    {
      href: '/settings?tab=schedule',
      icon: Calendar,
      label: t('schedule'),
      active: isSettingsPage && currentTab === 'schedule'
    },
    {
      href: '/settings?tab=doctors',
      icon: UserCog,
      label: t('doctors'),
      active: isSettingsPage && (currentTab === 'doctors' || (!currentTab))
    },
    {
      href: '/settings?tab=reports',
      icon: BarChart3,
      label: t('reports'),
      active: isSettingsPage && currentTab === 'reports'
    }
  ];

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 260 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`
          fixed top-0 ${isRTL ? 'right-0' : 'left-0'} h-screen
          bg-white border-${isRTL ? 'l' : 'r'} border-gray-100
          flex flex-col z-40 shadow-sm
        `}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-light rounded-xl flex items-center justify-center flex-shrink-0">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <h1 className="font-bold text-lg text-gray-800 whitespace-nowrap">Elite Life</h1>
                  <p className="text-xs text-gray-400 whitespace-nowrap">Medical Centre</p>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <p className={`text-xs font-medium text-gray-400 uppercase tracking-wider mb-3 ${collapsed ? 'text-center' : 'px-3'}`}>
            {collapsed ? '•••' : t('navigation')}
          </p>

          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
                ${item.active
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${item.active ? 'text-primary' : ''}`} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="font-medium whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          ))}
        </nav>

        {/* Notifications */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => setShowNotifications(true)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            <div className="relative">
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-medium whitespace-nowrap"
                >
                  {t('notifications')}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Collapse Button */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all
              ${collapsed ? 'justify-center' : ''}
            `}
          >
            {isRTL ? (
              collapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />
            ) : (
              collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />
            )}
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-medium whitespace-nowrap"
                >
                  {t('collapse')}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Notifications Panel */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-black/20 z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: isRTL ? 300 : -300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 300 : -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`
                fixed top-0 ${isRTL ? 'right-[260px]' : 'left-[260px]'} h-screen w-80
                bg-white shadow-xl z-50 flex flex-col
              `}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">{t('notifications')}</h2>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Notifications List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">{isRTL ? 'لا توجد إشعارات' : 'No notifications'}</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`
                        p-3 rounded-xl border transition-colors cursor-pointer
                        ${notif.read
                          ? 'bg-white border-gray-100 hover:bg-gray-50'
                          : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h3 className={`font-medium ${notif.read ? 'text-gray-700' : 'text-primary'}`}>
                          {notif.title}
                        </h3>
                        {!notif.read && (
                          <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notif.message}</p>
                      <p className="text-xs text-gray-400">{notif.time}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-4 border-t border-gray-100">
                  <button className="w-full py-2 text-sm text-primary hover:text-primary/80 font-medium">
                    {isRTL ? 'تحديد الكل كمقروء' : 'Mark all as read'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
