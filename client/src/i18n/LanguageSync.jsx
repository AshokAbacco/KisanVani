import { useEffect, useRef } from 'react';
import { hasStoredLang, useI18n } from './index';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services';

/**
 * Keeps one language across the website, the auth screens and the dashboards.
 *
 * All pickers (website navbar, dashboard header, account settings) only call setLang(); this
 * component does the rest:
 *  - On sign-in / session restore: if a language was picked in this browser, it wins and is
 *    saved to the profile; otherwise the language saved on the profile is applied.
 *  - While signed in: every change is saved to the profile, so it follows the user to other devices.
 *
 * Renders nothing. Must sit inside both <I18nProvider> and <AuthProvider>.
 */
const LanguageSync = () => {
  const { lang, setLang } = useI18n();
  const { user, setUser } = useAuth();
  const reconciledFor = useRef(null);

  const userId = user?.id;
  const profileLang = user?.preferredLanguage;

  useEffect(() => {
    if (!userId) {
      reconciledFor.current = null;
      return;
    }
    if (reconciledFor.current !== userId) {
      reconciledFor.current = userId;
      if (!hasStoredLang() && profileLang && profileLang !== lang) {
        setLang(profileLang);
        return;
      }
    }
    if (profileLang !== lang) {
      authApi
        .updateMe({ preferredLanguage: lang })
        .then((me) => me && setUser(me))
        .catch(() => {
          /* offline or rejected: the choice still applies in this browser */
        });
    }
  }, [userId, profileLang, lang, setLang, setUser]);

  return null;
};

export default LanguageSync;
