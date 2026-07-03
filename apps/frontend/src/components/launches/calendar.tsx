'use client';

import { useCalendar } from '@gitroom/frontend/components/launches/calendar.context';
import i18next from 'i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/he';
import 'dayjs/locale/ru';
import 'dayjs/locale/zh';
import 'dayjs/locale/fr';
import 'dayjs/locale/es';
import 'dayjs/locale/pt';
import 'dayjs/locale/de';
import 'dayjs/locale/it';
import 'dayjs/locale/ja';
import 'dayjs/locale/ko';
import 'dayjs/locale/ar';
import 'dayjs/locale/tr';
import 'dayjs/locale/vi';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { extend } from 'dayjs';

import {
  DayView,
  WeekView,
  MonthView,
  ListView,
} from './calendar-views';

// Re-export all extracted pieces so existing importers still work
export { DayView, WeekView, MonthView, ListView } from './calendar-views';
export { CalendarColumn } from './calendar-column';
export { CalendarItem, usePostActions } from './calendar-item';
export {
  CopyDebug,
  Duplicate,
  Preview,
  Statistics,
  DeletePost,
  SetSelectionModal,
} from './calendar-icons';

// Re-export helpers used by other modules
export { hours, convertTimeFormatBasedOnLocality } from './calendar-views';

// Extend dayjs with necessary plugins
extend(isSameOrAfter);
extend(isSameOrBefore);
extend(localizedFormat);

// Initialize language
const updateDayjsLocale = () => {
  const currentLanguage = i18next.resolvedLanguage || 'en';
  dayjs.locale(currentLanguage);
};

// Set dayjs locale whenever i18next language changes
i18next.on('languageChanged', () => {
  updateDayjsLocale();
});

// Initial setup
updateDayjsLocale();

export const Calendar = () => {
  const { display } = useCalendar();
  return (
    <>
      {display === 'list' ? (
        <ListView />
      ) : display === 'day' ? (
        <DayView />
      ) : display === 'week' ? (
        <WeekView />
      ) : (
        <MonthView />
      )}
    </>
  );
};
