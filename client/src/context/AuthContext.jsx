import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services';
import { onSessionExpired, refreshSession, setAccessToken } from '../services/api';
import { closeSocket } from '../services/socket';

const AuthContext = createContext(null);

// A non-secret hint that a refresh cookie probably exists, so signed-out visitors skip the restore call.
const HINT = 'kv_has_session';
const setHint = (on) => {
  try {
    if (on) localStorage.setItem(HINT, '1');
    else localStorage.removeItem(HINT);
  } catch {
    /* storage unavailable */
  }
};
const hasHint = () => {
  try {
    return localStorage.getItem(HINT) === '1';
  } catch {
    return true;
  }
};

/**
 * Session lifecycle:
 *  - on load, try a silent refresh (httpOnly cookie) to restore the session
 *  - the access token is kept in memory only
 *  - the user's role always comes from the server response, never from local state
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | authenticated | anonymous
  const [expired, setExpired] = useState(false);

  const clear = useCallback(() => {
    setHint(false);
    setAccessToken(null);
    closeSocket();
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!hasHint()) {
      setStatus('anonymous');
      onSessionExpired(() => {
        setExpired(true);
        clear();
      });
      return undefined;
    }
    refreshSession()
      .then((session) => {
        if (cancelled) return;
        setUser(session.user);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        setHint(false);
        setStatus('anonymous');
      });
    onSessionExpired(() => {
      setExpired(true);
      clear();
    });
    return () => {
      cancelled = true;
    };
  }, [clear]);

  const startSession = useCallback((session) => {
    setHint(true);
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
    setExpired(false);
    return session.user;
  }, []);

  const login = useCallback(async (body) => startSession(await authApi.login(body)), [startSession]);

  const register = useCallback(
    async (body) => {
      const res = await authApi.register(body);
      if (res.pendingApproval) return res;
      startSession(res);
      return res;
    },
    [startSession]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clear();
    }
  }, [clear]);

  const reloadUser = useCallback(async () => {
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);

  const value = useMemo(
    () => ({ user, status, expired, isAuthenticated: status === 'authenticated', login, register, logout, setUser, reloadUser, startSession }),
    [user, status, expired, login, register, logout, reloadUser, startSession]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
