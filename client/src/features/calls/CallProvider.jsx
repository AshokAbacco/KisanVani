import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getSocket } from '../../services/socket';
import { callsApi } from '../../services';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { CallSession, openMedia } from './callSession';
import { playHangupTone, startRingback, startRingtone } from './ringtone';
import CallOverlay from './CallOverlay';

/**
 * Voice & video calls for the whole dashboard. Mounted once in DashboardLayout, so an incoming call
 * rings on every page (not only in Chat), and a call keeps going while the user moves around the app.
 *
 * ui.phase:
 *   outgoing     I am calling (status STARTING → CALLING → RINGING)
 *   incoming     someone is calling me
 *   connecting   answered, the audio/video connection is being set up
 *   connected    in the call
 *   reconnecting connection lost for a moment (refresh, network change); being restored
 *   ended        short "Call ended / Declined / No answer / Busy" screen before it closes
 */

const CallContext = createContext(null);
const STORE = 'kv_call'; // the call this tab is in, so a page refresh can rejoin it
const DEFAULT_ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
const END_SCREEN_MS = 2200;

const save = (info) => {
  try {
    if (info) sessionStorage.setItem(STORE, JSON.stringify(info));
    else sessionStorage.removeItem(STORE);
  } catch {
    /* storage unavailable: a refresh will simply end the call */
  }
};
const load = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORE) || 'null');
  } catch {
    return null;
  }
};

/** Server reply codes for call:start → what the end screen says. */
const START_FAILURE = { BUSY: 'BUSY', ALREADY_IN_CALL: 'ALREADY_IN_CALL', FORBIDDEN: 'FORBIDDEN', NOT_FOUND: 'FORBIDDEN', NETWORK: 'NETWORK', FAILED: 'NETWORK' };

let iceCache = null; // { promise, until }
const getIceServers = () => {
  if (!iceCache || iceCache.until < Date.now()) {
    const promise = callsApi
      .iceServers()
      .then((r) => (r?.iceServers?.length ? r.iceServers : DEFAULT_ICE))
      .catch(() => {
        iceCache = null; // try again next call
        return DEFAULT_ICE;
      });
    iceCache = { promise, until: Date.now() + 60 * 60 * 1000 };
  }
  return iceCache.promise;
};

const emptyMedia = { local: null, remote: null, micOn: true, camOn: true, remoteAudio: true, remoteVideo: true, cameraError: null, cameras: [], outputs: [], sinkId: '' };

export const CallProvider = ({ children }) => {
  const { t } = useI18n();
  const toast = useToast();
  const [ui, setUiState] = useState(null);
  const [media, setMedia] = useState(emptyMedia);
  const uiRef = useRef(null);
  const sessionRef = useRef(null);
  const toneRef = useRef(null);
  const endTimer = useRef(null);
  const failTimer = useRef(null);
  const cancelStart = useRef(false);

  const setUi = useCallback((next) => {
    const value = typeof next === 'function' ? next(uiRef.current) : next;
    uiRef.current = value;
    setUiState(value);
  }, []);

  const stopTone = useCallback(() => {
    toneRef.current?.();
    toneRef.current = null;
  }, []);

  /** Releases camera, microphone, connection and sounds. */
  const teardown = useCallback(() => {
    stopTone();
    clearTimeout(failTimer.current);
    sessionRef.current?.close();
    sessionRef.current = null;
    save(null);
    setMedia(emptyMedia);
  }, [stopTone]);

  const close = useCallback(() => {
    clearTimeout(endTimer.current);
    teardown();
    setUi(null);
  }, [setUi, teardown]);

  /** Shows the end screen for a moment, then closes. */
  const showEnded = useCallback(
    (endStatus, endReason, duration, error) => {
      const cur = uiRef.current;
      teardown();
      if (cur && cur.phase !== 'incoming') playHangupTone();
      setUi({ ...(cur || {}), phase: 'ended', endStatus, endReason: endReason || null, duration: duration ?? (cur?.answeredAt ? Math.round((Date.now() - cur.answeredAt) / 1000) : 0), error: error || null });
      clearTimeout(endTimer.current);
      endTimer.current = setTimeout(() => setUi((u) => (u?.phase === 'ended' ? null : u)), error ? END_SCREEN_MS * 2 : END_SCREEN_MS);
    },
    [setUi, teardown]
  );

  /** Lists cameras and speakers once permission is granted (labels are hidden before that). */
  const readDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const canChooseOutput = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;
      setMedia((m) => ({
        ...m,
        cameras: devices.filter((d) => d.kind === 'videoinput'),
        outputs: canChooseOutput ? devices.filter((d) => d.kind === 'audiooutput' && d.deviceId !== 'communications') : [],
      }));
    } catch {
      /* not supported */
    }
  }, []);

  const onSessionEvent = useCallback(
    (e) => {
      const cur = uiRef.current;
      if (!cur) return;
      switch (e.type) {
        case 'remote-stream':
          setMedia((m) => ({ ...m, remote: e.stream }));
          break;
        case 'connected':
          clearTimeout(failTimer.current);
          stopTone();
          setUi((u) => (u && ['connecting', 'reconnecting'].includes(u.phase) ? { ...u, phase: 'connected', answeredAt: u.answeredAt || Date.now() } : u));
          break;
        case 'unstable':
          setUi((u) => (u?.phase === 'connected' ? { ...u, phase: 'reconnecting' } : u));
          break;
        case 'failed': {
          // Ask the server to rebuild the connection (new ICE route). The caller asks at once,
          // the receiver only if the caller hasn't fixed it within a few seconds.
          setUi((u) => (u && u.phase !== 'ended' ? { ...u, phase: 'reconnecting' } : u));
          clearTimeout(failTimer.current);
          const ask = () => uiRef.current?.callId === cur.callId && getSocket().emit('call:restart', { callId: cur.callId });
          if (cur.isCaller) ask();
          else failTimer.current = setTimeout(ask, 4000);
          break;
        }
        case 'remote-media':
          setMedia((m) => ({ ...m, remoteAudio: e.audio, remoteVideo: e.video }));
          break;
        default:
          if (e.error) console.warn('[call]', e.error);
      }
    },
    [setUi, stopTone]
  );

  const newSession = useCallback(
    (callId, isCaller, mediaPromise) => {
      sessionRef.current?.close();
      const session = new CallSession({ socket: getSocket(), callId, isCaller, iceServers: getIceServers(), media: mediaPromise, onEvent: onSessionEvent });
      sessionRef.current = session;
      return session;
    },
    [onSessionEvent]
  );

  const applyLocalMedia = useCallback(
    ({ stream, cameraOff, cameraError }) => {
      setMedia((m) => ({ ...m, local: stream, camOn: !cameraOff, micOn: true, cameraError: cameraError || null }));
      if (cameraOff) sessionRef.current?.setVideo(false);
      readDevices();
    },
    [readDevices]
  );

  /* ───────── Placing a call ───────── */

  const startCall = useCallback(
    async ({ conversationId, partner, type }) => {
      if (uiRef.current && uiRef.current.phase !== 'ended') {
        toast.info(t('calls.alreadyInCall', 'You are already in a call.'));
        return;
      }
      clearTimeout(endTimer.current);
      cancelStart.current = false;
      setUi({ phase: 'outgoing', status: 'STARTING', type, isCaller: true, partner, conversationId, callId: null, answeredAt: null });

      let local;
      try {
        local = await openMedia(type);
      } catch (err) {
        showEnded('FAILED', 'MEDIA', 0, err.code);
        return;
      }
      if (cancelStart.current) {
        local.stream.getTracks().forEach((tr) => tr.stop());
        close();
        return;
      }
      setMedia((m) => ({ ...m, local: local.stream, camOn: !local.cameraOff, cameraError: local.cameraError || null }));
      readDevices();

      let res;
      try {
        res = await getSocket().timeout(15000).emitWithAck('call:start', { conversationId, type });
      } catch {
        res = { ok: false, code: 'NETWORK' };
      }
      if (cancelStart.current) {
        if (res.ok) getSocket().emit('call:hangup', { callId: res.call.id });
        local.stream.getTracks().forEach((tr) => tr.stop());
        close();
        return;
      }
      if (!res.ok) {
        local.stream.getTracks().forEach((tr) => tr.stop());
        showEnded(START_FAILURE[res.code] || 'NETWORK', res.code);
        return;
      }
      const session = newSession(res.call.id, true, Promise.resolve(local));
      if (local.cameraOff) session.setVideo(false);
      setUi((u) => ({ ...u, callId: res.call.id, status: res.call.status }));
      save({ callId: res.call.id, conversationId, type, isCaller: true, partner, answeredAt: null });
      stopTone();
      toneRef.current = startRingback();
    },
    [close, newSession, readDevices, setUi, showEnded, stopTone, t, toast]
  );

  /* ───────── Answering ───────── */

  const accept = useCallback(async () => {
    const cur = uiRef.current;
    if (!cur || cur.phase !== 'incoming') return;
    stopTone();
    setUi({ ...cur, phase: 'connecting' });
    const mediaPromise = openMedia(cur.type);
    // Ready before the server tells the caller, so the caller's offer can't arrive too early.
    const session = newSession(cur.callId, false, mediaPromise);
    session.connect(0);
    let local;
    try {
      local = await mediaPromise;
    } catch (err) {
      getSocket().emit('call:reject', { callId: cur.callId });
      showEnded('FAILED', 'MEDIA', 0, err.code);
      return;
    }
    applyLocalMedia(local);
    let res;
    try {
      res = await getSocket().timeout(10000).emitWithAck('call:accept', { callId: cur.callId });
    } catch {
      res = { ok: false, code: 'NETWORK' };
    }
    if (!res.ok) {
      if (res.code === 'ANSWERED_ELSEWHERE') close();
      else showEnded(res.code === 'NETWORK' ? 'NETWORK' : 'MISSED', res.code);
      return;
    }
    const answeredAt = Date.now();
    setUi((u) => (u ? { ...u, answeredAt } : u));
    save({ callId: cur.callId, conversationId: cur.conversationId, type: cur.type, isCaller: false, partner: cur.partner, answeredAt });
  }, [close, newSession, setUi, showEnded, stopTone, applyLocalMedia]);

  const decline = useCallback(() => {
    const cur = uiRef.current;
    if (!cur || cur.phase !== 'incoming') return;
    getSocket().emit('call:reject', { callId: cur.callId });
    close();
  }, [close]);

  const hangup = useCallback(() => {
    const cur = uiRef.current;
    if (!cur) return;
    if (cur.phase === 'ended') return close();
    if (!cur.callId) {
      cancelStart.current = true; // still starting: stopped once the server replies
      return close();
    }
    getSocket().emit('call:hangup', { callId: cur.callId });
    showEnded(cur.answeredAt ? 'ENDED' : 'CANCELLED', 'HANGUP');
  }, [close, showEnded]);

  /* ───────── In-call controls ───────── */

  const toggleMic = useCallback(() => {
    setMedia((m) => {
      sessionRef.current?.setAudio(!m.micOn);
      m.local?.getAudioTracks().forEach((tr) => (tr.enabled = !m.micOn));
      return { ...m, micOn: !m.micOn };
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setMedia((m) => {
      if (!m.local?.getVideoTracks().length) return m;
      sessionRef.current?.setVideo(!m.camOn);
      m.local.getVideoTracks().forEach((tr) => (tr.enabled = !m.camOn));
      return { ...m, camOn: !m.camOn };
    });
  }, []);

  const switchCamera = useCallback(async () => {
    const session = sessionRef.current;
    const cams = media.cameras;
    if (!session || cams.length < 2) return;
    const current = media.local?.getVideoTracks()[0]?.getSettings().deviceId;
    const next = cams[(cams.findIndex((c) => c.deviceId === current) + 1) % cams.length];
    try {
      const stream = await session.switchCamera(next.deviceId);
      setMedia((m) => ({ ...m, local: stream ? new MediaStream(stream.getTracks()) : m.local }));
    } catch {
      toast.error(t('calls.errors.switchCamera', 'Could not switch the camera.'));
    }
  }, [media.cameras, media.local, t, toast]);

  const cycleSpeaker = useCallback(() => {
    setMedia((m) => {
      if (m.outputs.length < 2) return m;
      const i = m.outputs.findIndex((o) => o.deviceId === (m.sinkId || 'default'));
      return { ...m, sinkId: m.outputs[(i + 1) % m.outputs.length].deviceId };
    });
  }, []);

  /* ───────── Server events ───────── */

  useEffect(() => {
    const s = getSocket();
    const mine = (callId) => uiRef.current?.callId === callId;

    const onIncoming = ({ call, caller }) => {
      const cur = uiRef.current;
      if (cur && cur.callId === call.id) return; // same call delivered twice
      if (cur && cur.phase !== 'ended') return; // the server already answers "busy"; never two calls
      clearTimeout(endTimer.current);
      setUi({ phase: 'incoming', callId: call.id, conversationId: call.conversationId, type: call.type, isCaller: false, partner: caller, answeredAt: null });
      stopTone();
      toneRef.current = startRingtone();
    };

    const onRinging = ({ callId }) => mine(callId) && setUi((u) => (u.phase === 'outgoing' ? { ...u, status: 'RINGING' } : u));

    const onAccepted = ({ callId, gen }) => {
      if (!mine(callId) || !uiRef.current.isCaller) return;
      stopTone();
      const answeredAt = Date.now();
      setUi((u) => ({ ...u, phase: 'connecting', answeredAt }));
      const stored = load();
      if (stored) save({ ...stored, answeredAt });
      sessionRef.current?.connect(gen);
    };

    const onElsewhere = ({ callId }) => mine(callId) && uiRef.current.phase === 'incoming' && close();
    const onSignal = (p) => mine(p.callId) && sessionRef.current?.handleSignal(p);

    const onRenegotiate = ({ callId, gen }) => {
      if (!mine(callId)) return;
      setUi((u) => (u.phase === 'connected' ? { ...u, phase: 'reconnecting' } : u));
      sessionRef.current?.connect(gen);
    };

    const onPeerReconnecting = ({ callId }) => mine(callId) && setUi((u) => (u.phase === 'connected' || u.phase === 'connecting' ? { ...u, phase: 'reconnecting' } : u));

    const onEnded = ({ callId, status, reason, duration }) => {
      if (!mine(callId)) return;
      const cur = uiRef.current;
      if (cur.phase === 'ended') return;
      if (cur.phase === 'incoming') return close(); // stopped ringing (missed / cancelled / answered on another device)
      showEnded(status, reason, duration);
    };

    // Another tab of mine (e.g. after a refresh elsewhere) took the call over.
    const onMoved = ({ callId }) => mine(callId) && close();

    /** After a page refresh or a socket reconnect: get back into the call. */
    const rejoin = async () => {
      const cur = uiRef.current;
      const stored = load();
      const info = cur?.callId && !['incoming', 'ended'].includes(cur.phase) ? { ...stored, ...cur } : !cur ? stored : null;
      if (!info?.callId) return;
      let res;
      try {
        res = await s.timeout(10000).emitWithAck('call:rejoin', { callId: info.callId });
      } catch {
        return; // will retry on the next reconnect
      }
      if (!res.ok) {
        if (uiRef.current?.callId === info.callId) showEnded('ENDED', 'DISCONNECTED');
        else save(null);
        return;
      }
      if (sessionRef.current?.callId === info.callId) return; // same page, socket came back: server renegotiates
      // Page was reloaded: open the camera/microphone again and wait for the server's renegotiation.
      const call = res.call;
      const mediaPromise = openMedia(call.type);
      newSession(call.id, call.isCaller, mediaPromise);
      const answeredAt = call.answeredAt ? info.answeredAt || new Date(call.answeredAt).getTime() : null;
      setUi({
        phase: call.status === 'ACCEPTED' ? 'reconnecting' : 'outgoing',
        status: call.status,
        callId: call.id,
        conversationId: call.conversationId,
        type: call.type,
        isCaller: call.isCaller,
        partner: call.partner,
        answeredAt,
      });
      if (call.status !== 'ACCEPTED') toneRef.current = startRingback();
      mediaPromise.then(applyLocalMedia, (err) => {
        s.emit('call:hangup', { callId: call.id });
        showEnded('FAILED', 'MEDIA', 0, err.code);
      });
    };

    s.on('call:incoming', onIncoming);
    s.on('call:ringing', onRinging);
    s.on('call:accepted', onAccepted);
    s.on('call:answered-elsewhere', onElsewhere);
    s.on('call:signal', onSignal);
    s.on('call:renegotiate', onRenegotiate);
    s.on('call:peer-reconnecting', onPeerReconnecting);
    s.on('call:ended', onEnded);
    s.on('call:moved', onMoved);
    s.on('connect', rejoin);
    if (s.connected) rejoin();
    return () => {
      s.off('call:incoming', onIncoming);
      s.off('call:ringing', onRinging);
      s.off('call:accepted', onAccepted);
      s.off('call:answered-elsewhere', onElsewhere);
      s.off('call:signal', onSignal);
      s.off('call:renegotiate', onRenegotiate);
      s.off('call:peer-reconnecting', onPeerReconnecting);
      s.off('call:ended', onEnded);
      s.off('call:moved', onMoved);
      s.off('connect', rejoin);
    };
  }, [close, newSession, setUi, showEnded, stopTone, applyLocalMedia]);

  // Signing out (or leaving the dashboard) ends the call properly.
  useEffect(
    () => () => {
      const cur = uiRef.current;
      if (cur?.callId && cur.phase !== 'ended') getSocket().emit(cur.phase === 'incoming' ? 'call:reject' : 'call:hangup', { callId: cur.callId });
      clearTimeout(endTimer.current);
      toneRef.current?.();
      sessionRef.current?.close();
      save(null);
    },
    []
  );

  const value = useMemo(
    () => ({ call: ui, media, startCall, accept, decline, hangup, toggleMic, toggleCamera, switchCamera, cycleSpeaker, inCall: !!ui && ui.phase !== 'ended' }),
    [ui, media, startCall, accept, decline, hangup, toggleMic, toggleCamera, switchCamera, cycleSpeaker]
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      <CallOverlay />
    </CallContext.Provider>
  );
};

export const useCall = () => useContext(CallContext);