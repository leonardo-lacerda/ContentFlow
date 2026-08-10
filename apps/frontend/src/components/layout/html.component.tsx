'use client';
import { FC, ReactNode, useEffect, useState } from 'react';
import { useTranslationSettings } from '@gitroom/react/translation/get.transation.service.client';
import {
  cookieName,
  fallbackLng,
  languages,
} from '@gitroom/react/translation/i18n.config';

const getInitialLanguage = () => {
  if (typeof document === 'undefined') return fallbackLng;
  const cookieLanguage = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.split('=')[1];
  const detected = cookieLanguage || navigator.language || fallbackLng;
  const baseLanguage = detected.split('-')[0];
  return languages.includes(detected)
    ? detected
    : languages.includes(baseLanguage)
      ? baseLanguage
      : fallbackLng;
};

export const HtmlComponent: FC = () => {
  const settings = useTranslationSettings();
  const [dir, setDir] = useState(settings.dir());

  useEffect(() => {
    const language = getInitialLanguage();
    if (settings.language !== language) {
      void settings.changeLanguage(language);
    }
  }, [settings]);

  useEffect(() => {
    settings.on('languageChanged', (lng) => {
      setDir(settings.dir());
    });
  }, []);

  useEffect(() => {
    const htmlElement = document.querySelector('html');
    if (htmlElement) {
      htmlElement.setAttribute('dir', dir);
    }
  }, [dir]);

  return null;
};
