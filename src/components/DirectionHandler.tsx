import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const DirectionHandler = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Set direction on mount and when language changes
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    const isRTL = rtlLanguages.includes(i18n.language);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return null;
};

export default DirectionHandler;

