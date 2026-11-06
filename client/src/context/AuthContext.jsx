import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services';
import { isSignedOutError, onSessionExpired, refreshSession, setAccessToken } from '../services/api';
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
  const [waking, setWaking] = useState(false); // restoring, but the server has not answered yet

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
    // Restore the session. If the server is asleep or unreachable, keep waiting and retry instead of
    // signing the user out; only a real 401/403 from the server ends the session.
    const RETRY_DELAYS_MS = [3000, 5000, 10000, 15000, 20000];
    let timer = null;
    const restore = (attempt = 0) =>
      refreshSession()
        .then((session) => {
          if (cancelled) return;
          setWaking(false);
          setUser(session.user);
          setStatus('authenticated');
        })
        .catch((err) => {
          if (cancelled) return;
          if (isSignedOutError(err)) {
            setHint(false);
            setWaking(false);
            setStatus('anonymous');
          } else {
            // Server asleep, restarting or offline: keep showing "waking up" and keep trying (every 20 s
            // after the first few tries). The user is never sent to the sign-in page for this.
            setWaking(true);
            timer = setTimeout(() => restore(attempt + 1), RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
          }
        });
    restore();
    onSessionExpired(() => {
      setExpired(true);
      clear();
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
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
    () => ({ user, status, expired, waking, isAuthenticated: status === 'authenticated', login, register, logout, setUser, reloadUser, startSession }),
    [user, status, expired, waking, login, register, logout, reloadUser, startSession]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);