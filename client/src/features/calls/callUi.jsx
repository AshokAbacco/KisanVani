import { useCallback, useEffect, useRef, useState } from 'react';
import { initials } from '../../utils/format';
import { translate } from '../../i18n';

/** mm:ss, or h:mm:ss for long calls. */
export const formatDuration = (sec) => {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

/** Live call timer from the moment the call was answered. */
export const useDuration = (answeredAt, running) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!answeredAt || !running) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [answeredAt, running]);
  return answeredAt ? Math.max(0, Math.floor((now - answeredAt) / 1000)) : 0;
};

/** Large round photo, or initials on a soft gradient. */
export const CallAvatar = ({ person, size = 'h-28 w-28', text = 'text-3xl', pulse = false }) => (
  <span className="relative inline-grid place-items-center">
    {pulse && (
      <>
        <span className="absolute inset-0 animate-ping rounded-full bg-white/20 [animation-duration:2s]" aria-hidden />
        <span className="absolute -inset-3 rounded-full ring-1 ring-white/15" aria-hidden />
      </>
    )}
    {person?.avatarUrl ? (
      <img src={person.avatarUrl} alt="" className={`${size} relative rounded-full object-cover shadow-2xl ring-2 ring-white/20`} />
    ) : (
      <span className={`${size} ${text} relative grid place-items-center rounded-full bg-gradient-to-br from-green-500 to-emerald-800 font-semibold text-white shadow-2xl ring-2 ring-white/20`} aria-hidden>
        {initials(person?.name || '?')}
      </span>
    )}
  </span>
);

/** Blurred photo (or a dark gradient) behind the voice-call and incoming-call screens. */
export const CallBackdrop = ({ person }) => (
  <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-[#0f2a1b] via-[#0b1510] to-black" aria-hidden>
    {person?.avatarUrl && <img src={person.avatarUrl} alt="" className="h-full w-full scale-125 object-cover opacity-40 blur-3xl" />}
    <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
  </div>
);

/** Round control button of the call screens. */
export const CallButton = ({ icon: Icon, label, onClick, active = false, danger = false, success = false, big = false, disabled = false, showLabel = true }) => {
  const tone = danger
    ? 'bg-red-600 text-white hover:bg-red-500 focus-visible:outline-red-300'
    : success
      ? 'bg-green-500 text-white hover:bg-green-400 focus-visible:outline-green-200'
      : active
        ? 'bg-white text-black hover:bg-white/90 focus-visible:outline-white'
        : 'bg-white/15 text-white backdrop-blur-md hover:bg-white/25 focus-visible:outline-white';
  return (
    <span className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={danger || success ? undefined : active}
        title={label}
        className={`grid ${big ? 'h-16 w-16' : 'h-14 w-14'} place-items-center rounded-full shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${tone}`}
      >
        <Icon className={big ? 'h-7 w-7' : 'h-6 w-6'} aria-hidden />
      </button>
      {showLabel && <span className="max-w-[5.5rem] truncate text-[11px] font-medium text-white/80">{label}</span>}
    </span>
  );
};

/**
 * Attaches a MediaStream to a <video>/<audio> element. Returns a callback ref, so it also works for
 * elements that appear later (e.g. the remote video once the other person's picture arrives).
 */
export const useStream = (stream) => {
  const [el, setEl] = useState(null);
  useEffect(() => {
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream || null;
    if (stream) el.play?.().catch(() => {});
  }, [el, stream]);
  return setEl;
};

/**
 * Small self-view that can be dragged anywhere and snaps to the nearest corner (like Instagram).
 */
export const DraggableVideo = ({ stream, mirrored = true, hidden = false, children, label }) => {
  const videoRef = useStream(stream);
  const box = useRef(null);
  const [corner, setCorner] = useState({ x: 'right', y: 'top' });
  const [drag, setDrag] = useState(null); // { dx, dy } while dragging

  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = box.current.getBoundingClientRect();
    setDrag({ startX: e.clientX, startY: e.clientY, left: r.left, top: r.top, dx: 0, dy: 0 });
  }, []);

  const onPointerMove = useCallback((e) => {
    setDrag((d) => (d ? { ...d, dx: e.clientX - d.startX, dy: e.clientY - d.startY } : d));
  }, []);

  const onPointerUp = useCallback(
    (e) => {
      if (!drag) return;
      const r = box.current.getBoundingClientRect();
      const parent = box.current.parentElement.getBoundingClientRect();
      const cx = r.left + r.width / 2 - parent.left;
      const cy = r.top + r.height / 2 - parent.top;
      setCorner({ x: cx < parent.width / 2 ? 'left' : 'right', y: cy < parent.height / 2 ? 'top' : 'bottom' });
      setDrag(null);
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    },
    [drag]
  );

  const pos = `${corner.y === 'top' ? 'top-20' : 'bottom-32'} ${corner.x === 'left' ? 'left-4' : 'right-4'}`;
  return (
    <div
      ref={box}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="img"
      aria-label={label}
      style={drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px)`, transition: 'none' } : undefined}
      className={`absolute ${pos} z-20 aspect-[3/4] w-28 cursor-grab touch-none select-none overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/25 transition-all duration-300 active:cursor-grabbing sm:w-40 ${hidden ? 'opacity-0' : ''}`}
    >
      <video ref={videoRef} autoPlay playsInline muted className={`h-full w-full object-cover ${mirrored ? '-scale-x-100' : ''}`} />
      {children}
    </div>
  );
};

/** Text for the status line under the name. */
export const statusLine = (call, durationSec) => {
  const tr = translate;
  switch (call.phase) {
    case 'incoming':
      return call.type === 'VIDEO' ? tr('calls.incomingVideo', 'Incoming video call') : tr('calls.incomingVoice', 'Incoming voice call');
    case 'outgoing':
      return call.status === 'RINGING' ? tr('calls.ringing', 'Ringing…') : tr('calls.calling', 'Calling…');
    case 'connecting':
      return tr('calls.connecting', 'Connecting…');
    case 'reconnecting':
      return tr('calls.reconnecting', 'Reconnecting…');
    case 'connected':
      return formatDuration(durationSec);
    default:
      return '';
  }
};

/** What the short end screen says. */
export const endText = (call) => {
  const tr = translate;
  const name = call.partner?.name || '';
  if (call.error) {
    const video = call.type === 'VIDEO';
    return (
      {
        permission: video
          ? tr('calls.errors.permissionVideo', 'Allow camera and microphone access for this site in your browser settings, then try again.')
          : tr('calls.errors.permissionVoice', 'Allow microphone access for this site in your browser settings, then try again.'),
        noDevice: video ? tr('calls.errors.noDeviceVideo', 'No camera or microphone was found on this device.') : tr('calls.errors.noDeviceVoice', 'No microphone was found on this device.'),
        deviceBusy: tr('calls.errors.deviceBusy', 'Your camera or microphone is being used by another app.'),
        insecure: tr('calls.errors.insecure', 'Calls need a secure (https) connection.'),
      }[call.error] || tr('calls.errors.mediaFailed', 'Could not start your camera or microphone.')
    );
  }
  switch (call.endStatus) {
    case 'ENDED':
      return call.endReason === 'DISCONNECTED' || call.endReason === 'FAILED'
        ? tr('calls.ended.lost', 'Call ended — connection lost')
        : tr('calls.ended.ended', 'Call ended');
    case 'CANCELLED':
      return call.isCaller ? tr('calls.ended.cancelled', 'Call cancelled') : tr('calls.ended.missed', 'Missed call');
    case 'REJECTED':
      return call.isCaller ? tr('calls.ended.declined', '{name} declined the call', { name }) : tr('calls.ended.youDeclined', 'Call declined');
    case 'MISSED':
      return call.isCaller ? tr('calls.ended.noAnswer', 'No answer') : tr('calls.ended.missed', 'Missed call');
    case 'BUSY':
      return tr('calls.ended.busy', '{name} is on another call', { name });
    case 'ALREADY_IN_CALL':
      return tr('calls.alreadyInCall', 'You are already in a call.');
    case 'FORBIDDEN':
      return tr('calls.ended.forbidden', 'You cannot call this person.');
    default:
      return tr('calls.ended.network', 'Could not connect the call. Check your internet and try again.');
  }
};