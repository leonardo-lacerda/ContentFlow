import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next/initReactI18next';
import { fallbackLng, languages, defaultNS } from './i18n.config';
const runsOnServerSide = typeof window === 'undefined';

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(
    resourcesToBackend((language: any, namespace: any) => {
      return import(`./locales/${language}/${namespace}.json`);
    })
  )
  .init({
    supportedLngs: languages,
    fallbackLng,
    // Keep the first client render identical to SSR. The persisted/browser
    // language is applied by HtmlComponent immediately after hydration.
    lng: fallbackLng,
    fallbackNS: defaultNS,
    defaultNS,
    detection: {
      // Automatic detection runs before hydration and can make the client
      // render a different language than SSR. HtmlComponent applies the
      // persisted/browser language after hydration instead.
      order: [],
    },
    preload: runsOnServerSide ? languages : [],
  });

export default i18next;
