import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Mic, MicOff, Minimize2, Phone, PhoneOff, SwitchCamera, Video, VideoOff, Volume2, VolumeX } from 'lucide-react';
import { useCall } from './CallProvider';
import { CallAvatar, CallBackdrop, CallButton, DraggableVideo, endText, formatDuration, statusLine, useDuration, useStream } from './callUi';
import { useI18n } from '../../i18n';

/** Remote sound for both call types (the <video> elements stay muted so nothing plays twice). */
const RemoteAudio = ({ stream, sinkId, onBlocked }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.srcObject !== stream) el.srcObject = stream || null;
    if (stream) el.play().catch(() => onBlocked(true));
  }, [stream, onBlocked]);
  useEffect(() => {
    if (sinkId && ref.current?.setSinkId) ref.current.setSinkId(sinkId).catch(() => {});
  }, [sinkId]);
  return <audio ref={ref} autoPlay playsInline className="hidden" />;
};

/* ───────── Incoming call ───────── */

const IncomingCall = ({ call, onAccept, onDecline }) => {
  const { t } = useI18n();
  const video = call.type === 'VIDEO';
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center sm:bg-black/50 sm:p-4 sm:backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-labelledby="kv-incoming-name" aria-describedby="kv-incoming-kind">
      <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden px-6 pb-14 pt-20 text-white sm:h-auto sm:max-w-sm sm:rounded-3xl sm:pb-10 sm:pt-12 sm:shadow-2xl">
        <CallBackdrop person={call.partner} />
        <div className="relative flex flex-col items-center text-center">
          <CallAvatar person={call.partner} pulse size="h-28 w-28 sm:h-24 sm:w-24" />
          <h2 id="kv-incoming-name" className="mt-6 font-display text-2xl font-semibold text-white">
            {call.partner.name}
          </h2>
          <p className="mt-1 text-sm text-white/60">{t(`roleNames.${call.partner.role}`)}</p>
          <p id="kv-incoming-kind" className="mt-3 flex items-center gap-1.5 text-sm text-white/85">
            {video ? <Video className="h-4 w-4" aria-hidden /> : <Phone className="h-4 w-4" aria-hidden />}
            {statusLine(call)}
          </p>
        </div>
        <div className="relative mt-12 flex w-full max-w-xs items-start justify-around sm:mt-10">
          <CallButton icon={PhoneOff} label={t('calls.decline', 'Decline')} onClick={onDecline} danger big />
          <CallButton icon={video ? Video : Phone} label={t('calls.accept', 'Accept')} onClick={onAccept} success big />
        </div>
      </div>
    </div>
  );
};

/* ───────── Ongoing call ───────── */

const Controls = ({ call, media, actions, video }) => {
  const { t } = useI18n();
  const live = ['connected', 'reconnecting', 'connecting', 'outgoing'].includes(call.phase);
  return (
    <div className="flex items-start justify-center gap-4 sm:gap-6">
      {media.outputs.length > 1 && (
        <CallButton
          icon={Volume2}
          label={`${t('calls.speaker', 'Speaker')}: ${media.outputs.find((o) => o.deviceId === (media.sinkId || 'default'))?.label || t('calls.defaultOutput', 'default')}`}
          onClick={actions.cycleSpeaker}
          disabled={!live}
        />
      )}
      <CallButton icon={media.micOn ? Mic : MicOff} label={media.micOn ? t('calls.mute', 'Mute') : t('calls.unmute', 'Unmute')} onClick={actions.toggleMic} active={!media.micOn} disabled={!live} />
      {video && (
        <CallButton
          icon={media.camOn ? Video : VideoOff}
          label={media.camOn ? t('calls.cameraOff', 'Camera off') : t('calls.cameraOn', 'Camera on')}
          onClick={actions.toggleCamera}
          active={!media.camOn}
          disabled={!live || !media.local?.getVideoTracks().length}
        />
      )}
      {video && media.cameras.length > 1 && <CallButton icon={SwitchCamera} label={t('calls.switchCamera', 'Flip')} onClick={actions.switchCamera} disabled={!live || !media.camOn} />}
      <CallButton icon={PhoneOff} label={t('calls.end', 'End')} onClick={actions.hangup} danger />
    </div>
  );
};

const CallScreen = ({ call, media, actions, onMinimize }) => {
  const { t } = useI18n();
  const video = call.type === 'VIDEO';
  const duration = useDuration(call.answeredAt, call.phase === 'connected' || call.phase === 'reconnecting');
  const remoteRef = useStream(media.remote);
  const localFullRef = useStream(media.local);
  const ended = call.phase === 'ended';
  const inCall = ['connected', 'reconnecting'].includes(call.phase);
  const showRemoteVideo = video && inCall && media.remoteVideo && media.remote?.getVideoTracks().length > 0;
  // Before the other person answers, my own camera fills the screen (like Instagram).
  const showLocalFull = video && !inCall && !ended && media.local && media.camOn;
  const status = ended ? endText(call) : statusLine(call, duration);

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-black text-white" role="dialog" aria-modal="true" aria-label={t('calls.callWith', 'Call with {name}', { name: call.partner.name })}>
      {/* Background: remote video, my camera, or the blurred photo */}
      {showRemoteVideo ? (
        <video ref={remoteRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full bg-black object-cover" />
      ) : showLocalFull ? (
        <>
          <video ref={localFullRef} autoPlay playsInline muted className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
          <div className="absolute inset-0 bg-black/35" aria-hidden />
        </>
      ) : (
        <CallBackdrop person={call.partner} />
      )}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/60 to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" aria-hidden />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        {showRemoteVideo || (video && inCall) ? (
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold drop-shadow">{call.partner.name}</p>
            <p className="text-sm text-white/80 drop-shadow" aria-live="polite">
              {status}
              {inCall && !media.remoteAudio && <span className="ml-2 inline-flex items-center gap-1 text-white/70"><MicOff className="h-3.5 w-3.5" aria-hidden />{t('calls.muted', 'Muted')}</span>}
            </p>
          </div>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium text-white/70">
            {video ? <Video className="h-4 w-4" aria-hidden /> : <Phone className="h-4 w-4" aria-hidden />}
            {video ? t('calls.videoCall', 'Video call') : t('calls.voiceCall', 'Voice call')}
          </span>
        )}
        {inCall && (
          <button type="button" onClick={onMinimize} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25" aria-label={t('calls.minimize', 'Minimise call')} title={t('calls.minimize', 'Minimise call')}>
            <Minimize2 className="h-5 w-5" aria-hidden />
          </button>
        )}
      </div>

      {/* Middle: photo + name + status (voice calls, and video before the picture arrives) */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        {!showRemoteVideo && (
          <>
            {!showLocalFull && <CallAvatar person={call.partner} pulse={call.phase === 'outgoing'} size="h-32 w-32" text="text-4xl" />}
            {!(video && inCall) && (
              <>
                <h2 className="mt-6 font-display text-3xl font-semibold text-white drop-shadow">{call.partner.name}</h2>
                <p className={`mt-2 text-base drop-shadow ${ended && (call.error || call.endStatus !== 'ENDED') ? 'text-red-200' : 'text-white/80'}`} aria-live="polite">
                  {status}
                </p>
                {ended && call.endStatus === 'ENDED' && call.duration > 0 && <p className="mt-1 text-sm text-white/60">{formatDuration(call.duration)}</p>}
                {inCall && !media.remoteAudio && (
                  <p className="mt-2 inline-flex items-center gap-1 text-sm text-white/70">
                    <MicOff className="h-4 w-4" aria-hidden /> {t('calls.partnerMuted', '{name} muted their microphone', { name: call.partner.name })}
                  </p>
                )}
              </>
            )}
            {video && inCall && !showRemoteVideo && (
              <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-white/75">
                <VideoOff className="h-4 w-4" aria-hidden /> {media.remoteVideo === false ? t('calls.partnerCameraOff', '{name} turned their camera off', { name: call.partner.name }) : t('calls.waitingVideo', 'Waiting for video…')}
              </p>
            )}
          </>
        )}
        {call.phase === 'reconnecting' && showRemoteVideo && (
          <p className="rounded-full bg-black/50 px-4 py-1.5 text-sm backdrop-blur-sm">{t('calls.reconnecting', 'Reconnecting…')}</p>
        )}
        {media.cameraError && video && !ended && <p className="mt-4 max-w-xs rounded-xl bg-black/40 px-3 py-2 text-xs text-amber-200">{t('calls.errors.cameraFallback', 'Your camera is not available, so the call continues with sound only.')}</p>}
      </div>

      {/* My camera, small and draggable, once the call is live */}
      {video && inCall && media.local && (
        <DraggableVideo stream={media.local} label={t('calls.yourCamera', 'Your camera')}>
          {!media.camOn && (
            <span className="absolute inset-0 grid place-items-center bg-neutral-900 text-white/70">
              <VideoOff className="h-6 w-6" aria-hidden />
            </span>
          )}
        </DraggableVideo>
      )}

      {/* Controls */}
      <div className="relative z-10 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4">
        {ended ? (
          <div className="flex justify-center">
            <button type="button" onClick={actions.hangup} className="rounded-full bg-white/15 px-6 py-2.5 text-sm font-medium backdrop-blur-md hover:bg-white/25">
              {t('common.close', 'Close')}
            </button>
          </div>
        ) : (
          <div className="mx-auto w-fit rounded-[2rem] bg-black/30 px-5 py-4 backdrop-blur-md sm:px-8">
            <Controls call={call} media={media} actions={actions} video={video} />
          </div>
        )}
      </div>
    </div>
  );
};

/* ───────── Minimised call (keep using the app) ───────── */

const MiniCall = ({ call, media, actions, onExpand }) => {
  const { t } = useI18n();
  const duration = useDuration(call.answeredAt, true);
  const remoteRef = useStream(media.remote);
  const showVideo = call.type === 'VIDEO' && media.remoteVideo && media.remote?.getVideoTracks().length > 0;
  return (
    <div className="fixed bottom-20 right-4 z-[250] w-64 overflow-hidden rounded-2xl bg-neutral-900 text-white shadow-2xl ring-1 ring-black/10 lg:bottom-6" role="region" aria-label={t('calls.callWith', 'Call with {name}', { name: call.partner.name })}>
      {showVideo && (
        <button type="button" onClick={onExpand} className="block w-full" aria-label={t('calls.expand', 'Open call')}>
          <video ref={remoteRef} autoPlay playsInline muted className="aspect-video w-full bg-black object-cover" />
        </button>
      )}
      <div className="flex items-center gap-3 p-3">
        {!showVideo && <CallAvatar person={call.partner} size="h-10 w-10" text="text-sm" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{call.partner.name}</p>
          <p className="num text-xs text-green-300">{call.phase === 'reconnecting' ? t('calls.reconnecting', 'Reconnecting…') : formatDuration(duration)}</p>
        </div>
        <button type="button" onClick={actions.toggleMic} className={`grid h-9 w-9 place-items-center rounded-full ${media.micOn ? 'bg-white/15 hover:bg-white/25' : 'bg-white text-black'}`} aria-label={media.micOn ? t('calls.mute', 'Mute') : t('calls.unmute', 'Unmute')} aria-pressed={!media.micOn}>
          {media.micOn ? <Mic className="h-4 w-4" aria-hidden /> : <MicOff className="h-4 w-4" aria-hidden />}
        </button>
        <button type="button" onClick={onExpand} className="grid h-9 w-9 place-items-center rounded-full bg-white/15 hover:bg-white/25" aria-label={t('calls.expand', 'Open call')}>
          <Maximize2 className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={actions.hangup} className="grid h-9 w-9 place-items-center rounded-full bg-red-600 hover:bg-red-500" aria-label={t('calls.end', 'End')}>
          <PhoneOff className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
};

/** Renders whichever call screen is needed, above everything else. */
const CallOverlay = () => {
  const { t } = useI18n();
  const ctx = useCall();
  const [minimized, setMinimized] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const call = ctx?.call;

  useEffect(() => {
    if (!call || !['connected', 'reconnecting'].includes(call.phase)) setMinimized(false);
  }, [call]);
  useEffect(() => {
    if (!call) setSoundBlocked(false);
  }, [call]);

  if (!call) return null;
  const { media } = ctx;
  const content =
    call.phase === 'incoming' ? (
      <IncomingCall call={call} onAccept={ctx.accept} onDecline={ctx.decline} />
    ) : minimized ? (
      <MiniCall call={call} media={media} actions={ctx} onExpand={() => setMinimized(false)} />
    ) : (
      <CallScreen call={call} media={media} actions={ctx} onMinimize={() => setMinimized(true)} />
    );

  return createPortal(
    <>
      {content}
      {call.phase !== 'incoming' && call.phase !== 'ended' && <RemoteAudio stream={media.remote} sinkId={media.sinkId} onBlocked={setSoundBlocked} />}
      {soundBlocked && call.phase !== 'ended' && (
        <button
          type="button"
          onClick={() => {
            document.querySelectorAll('audio').forEach((a) => a.srcObject && a.play().catch(() => {}));
            setSoundBlocked(false);
          }}
          className="fixed left-1/2 top-24 z-[310] -translate-x-1/2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-xl"
        >
          <VolumeX className="mr-1.5 inline h-4 w-4" aria-hidden />
          {t('calls.tapForSound', 'Tap to turn on sound')}
        </button>
      )}
    </>,
    document.body
  );
};

export default CallOverlay;