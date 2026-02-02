'use client';

import { Toaster, toast } from 'sonner';
import { useLocale } from 'next-intl';

// Export toast for use in other components
export { toast };

// Sound utility
const playSound = (type: 'success' | 'error' | 'info' | 'warning') => {
  if (typeof window !== 'undefined') {
    // Create audio context for generating sounds
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different frequencies for different notification types
      const frequencies: Record<string, number[]> = {
        success: [523.25, 659.25, 783.99], // C5, E5, G5 - pleasant chord
        error: [220, 196], // A3, G3 - descending
        info: [440, 523.25], // A4, C5 - ascending
        warning: [392, 392, 392], // G4 repeated
      };

      const durations: Record<string, number> = {
        success: 0.15,
        error: 0.2,
        info: 0.1,
        warning: 0.12,
      };

      const freqs = frequencies[type] || frequencies.info;
      const duration = durations[type] || 0.1;

      let time = audioContext.currentTime;

      freqs.forEach((freq, index) => {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();

        osc.connect(gain);
        gain.connect(audioContext.destination);

        osc.frequency.value = freq;
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.start(time);
        osc.stop(time + duration);

        time += duration * 0.8;
      });
    } catch (e) {
      // Audio not supported or blocked
      console.log('Audio notification not available');
    }
  }
};

// Custom notification functions with sound
export const notify = {
  success: (message: string, description?: string) => {
    playSound('success');
    toast.success(message, {
      description,
      duration: 4000,
    });
  },

  error: (message: string, description?: string) => {
    playSound('error');
    toast.error(message, {
      description,
      duration: 5000,
    });
  },

  info: (message: string, description?: string) => {
    playSound('info');
    toast.info(message, {
      description,
      duration: 4000,
    });
  },

  warning: (message: string, description?: string) => {
    playSound('warning');
    toast.warning(message, {
      description,
      duration: 4000,
    });
  },

  // Appointment notifications with sound
  appointmentBooked: (patientName: string, time?: string) => {
    playSound('success');
    toast.success('حجز جديد! 🎉', {
      description: time ? `${patientName} حجز موعد الساعة ${time}` : `${patientName} حجز موعد جديد`,
      duration: 5000,
    });
  },

  appointmentCancelled: (patientName: string) => {
    playSound('warning');
    toast.error('تم إلغاء الحجز', {
      description: `${patientName} ألغى الموعد`,
      duration: 5000,
    });
  },

  appointmentUpdated: (patientName: string) => {
    playSound('info');
    toast.info('تم تعديل الحجز', {
      description: `تم تحديث موعد ${patientName}`,
      duration: 4000,
    });
  },

  attendanceConfirmed: (patientName: string) => {
    playSound('success');
    toast.success('تم تأكيد الحضور ✅', {
      description: `${patientName} حضر الموعد`,
      duration: 4000,
    });
  },

  noShow: (patientName: string) => {
    playSound('warning');
    toast.warning('لم يحضر المريض', {
      description: `${patientName} لم يحضر الموعد`,
      duration: 4000,
    });
  },

  // Silent notification (no sound)
  silent: (type: 'success' | 'error' | 'info' | 'warning', message: string, description?: string) => {
    toast[type](message, {
      description,
      duration: 4000,
    });
  },
};

export default function NotificationProvider() {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <Toaster
      position={isRTL ? 'top-left' : 'top-right'}
      expand={true}
      richColors
      closeButton
      dir={isRTL ? 'rtl' : 'ltr'}
      toastOptions={{
        style: {
          fontFamily: 'inherit',
        },
        classNames: {
          toast: 'rounded-xl shadow-lg border-0',
          title: 'font-semibold',
          description: 'text-sm opacity-80',
        },
      }}
    />
  );
}
