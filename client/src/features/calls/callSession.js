/**
 * One side of a WebRTC call: the camera/microphone, the RTCPeerConnection and the offer/answer/ICE
 * handshake. Signalling messages go through the existing Socket.IO connection (call:signal); audio and
 * video go directly between the browsers, or through the TURN server when that is impossible.
 *
 * The caller always makes the offer — also when the connection is rebuilt after a refresh, a socket
 * reconnect or a network change (each rebuild has a new `gen`, so late messages of an old attempt are ignored).
 */

/** Turns a getUserMedia error into one of our error codes (shown to the user by the call screen). */
export const mediaErrorCode = (err) => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return 'insecure';
  switch (err?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
    case 'PermissionDeniedError':
      return 'permission';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'noDevice';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'deviceBusy';
    default:
      return 'mediaFailed';
  }
};

const AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
const VIDEO = (facingMode = 'user') => ({ facingMode, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } });

/**
 * Opens the microphone (and camera for video calls). If the camera alone fails (missing, in use),
 * a video call carries on with sound only and the camera switched off.
 * Resolves to { stream, cameraOff }; rejects with an Error whose `code` is from mediaErrorCode().
 */
export const openMedia = async (type) => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('insecure'), { code: 'insecure' });
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO, video: type === 'VIDEO' ? VIDEO() : false });
    return { stream, cameraOff: type === 'VIDEO' && !stream.getVideoTracks().length };
  } catch (err) {
    const code = mediaErrorCode(err);
    if (type === 'VIDEO' && code !== 'permission' && code !== 'insecure') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO, video: false });
        return { stream, cameraOff: true, cameraError: code };
      } catch (err2) {
        throw Object.assign(new Error(mediaErrorCode(err2)), { code: mediaErrorCode(err2) });
      }
    }
    throw Object.assign(new Error(code), { code });
  }
};

export class CallSession {
  /**
   * @param {object} o
   * @param {import('socket.io-client').Socket} o.socket
   * @param {string} o.callId
   * @param {boolean} o.isCaller
   * @param {Promise<RTCIceServer[]>} o.iceServers
   * @param {Promise<{stream: MediaStream}>} o.media   resolves when the camera/microphone is open
   * @param {(e: {type: string, [k: string]: any}) => void} o.onEvent
   */
  constructor({ socket, callId, isCaller, iceServers, media, onEvent }) {
    this.socket = socket;
    this.callId = callId;
    this.isCaller = isCaller;
    this.iceServers = iceServers;
    this.media = media;
    this.onEvent = onEvent;
    this.gen = -1;
    this.pc = null;
    this.pending = []; // ICE candidates that arrived before the remote description
    this.localStream = null;
    this.remoteStream = null;
    this.audioOn = true;
    this.videoOn = true;
    this.closed = false;
    this.failTimer = null;
    media.then(({ stream }) => {
      this.localStream = stream;
      if (this.closed) stream.getTracks().forEach((t) => t.stop());
    }, () => {});
  }

  send(data) {
    this.socket.emit('call:signal', { callId: this.callId, gen: this.gen, data });
  }

  /** (Re)builds the peer connection for attempt `gen`; the caller then sends the offer. */
  async connect(gen) {
    if (this.closed) return;
    this.gen = gen;
    this.teardownPeer();
    let iceServers;
    let stream;
    try {
      [iceServers, { stream }] = await Promise.all([this.iceServers, this.media]);
    } catch {
      return; // media errors are handled by the provider
    }
    if (this.closed || gen !== this.gen) return;

    const pc = new RTCPeerConnection({ iceServers, bundlePolicy: 'max-bundle' });
    this.pc = pc;
    this.pending = [];
    this.remoteStream = new MediaStream();
    this.onEvent({ type: 'remote-stream', stream: this.remoteStream });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (e) => {
      if (pc !== this.pc) return;
      if (!this.remoteStream.getTracks().includes(e.track)) this.remoteStream.addTrack(e.track);
      this.onEvent({ type: 'remote-stream', stream: this.remoteStream });
    };
    pc.onicecandidate = (e) => {
      if (pc !== this.pc) return;
      this.send({ type: 'candidate', candidate: e.candidate ? e.candidate.toJSON() : null });
    };
    pc.onconnectionstatechange = () => {
      if (pc !== this.pc) return;
      const s = pc.connectionState;
      clearTimeout(this.failTimer);
      if (s === 'connected') {
        this.onEvent({ type: 'connected' });
        this.sendMediaState();
      } else if (s === 'disconnected') {
        // Often recovers by itself within a few seconds (network blip); otherwise rebuild.
        this.onEvent({ type: 'unstable' });
        this.failTimer = setTimeout(() => pc === this.pc && pc.connectionState !== 'connected' && this.onEvent({ type: 'failed' }), 6000);
      } else if (s === 'failed') {
        this.onEvent({ type: 'failed' });
      }
    };

    if (this.isCaller) {
      try {
        const offer = await pc.createOffer();
        if (pc !== this.pc) return;
        await pc.setLocalDescription(offer);
        this.send({ type: 'offer', sdp: pc.localDescription.sdp });
      } catch (err) {
        this.onEvent({ type: 'error', error: err });
      }
    }
  }

  /** A signalling message from the other side. */
  async handleSignal({ gen, data }) {
    if (this.closed || gen !== this.gen) return;
    // The receiver may get the offer before its own connect() finished: wait for it.
    if (!this.pc) {
      await Promise.all([this.iceServers, this.media]).catch(() => {});
      for (let i = 0; i < 40 && !this.pc && !this.closed && gen === this.gen; i += 1) await new Promise((r) => setTimeout(r, 25));
    }
    const pc = this.pc;
    if (!pc || gen !== this.gen) return;
    try {
      if (data.type === 'offer') {
        await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp });
        await this.flushCandidates(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.send({ type: 'answer', sdp: pc.localDescription.sdp });
      } else if (data.type === 'answer') {
        if (pc.signalingState !== 'have-local-offer') return;
        await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
        await this.flushCandidates(pc);
      } else if (data.type === 'candidate') {
        if (!data.candidate) return;
        if (pc.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => {});
        else this.pending.push(data.candidate);
      } else if (data.type === 'media') {
        this.onEvent({ type: 'remote-media', audio: data.audio, video: data.video });
      }
    } catch (err) {
      this.onEvent({ type: 'error', error: err });
    }
  }

  async flushCandidates(pc) {
    const list = this.pending;
    this.pending = [];
    for (const c of list) await pc.addIceCandidate(c).catch(() => {});
  }

  /** Tells the other side whether my microphone / camera are on (so they can show "muted" or my avatar). */
  sendMediaState() {
    if (this.pc && !this.closed) this.send({ type: 'media', audio: this.audioOn, video: this.videoOn });
  }

  setAudio(on) {
    this.audioOn = on;
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = on));
    this.sendMediaState();
  }

  setVideo(on) {
    this.videoOn = on;
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = on));
    this.sendMediaState();
  }

  /** Front ↔ back camera (phones) or the next camera (computers). Returns the new local stream. */
  async switchCamera(deviceId, facingMode) {
    const stream = this.localStream;
    const old = stream?.getVideoTracks()[0];
    if (!stream) return null;
    const fresh = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { ...VIDEO(), facingMode: undefined, deviceId: { exact: deviceId } } : VIDEO(facingMode) });
    const track = fresh.getVideoTracks()[0];
    track.enabled = this.videoOn;
    const sender = this.pc?.getSenders().find((s) => s.track?.kind === 'video');
    if (sender) await sender.replaceTrack(track);
    if (old) {
      stream.removeTrack(old);
      old.stop();
    }
    stream.addTrack(track);
    return stream;
  }

  teardownPeer() {
    clearTimeout(this.failTimer);
    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.onconnectionstatechange = null;
      try {
        this.pc.close();
      } catch {
        /* already closed */
      }
      this.pc = null;
    }
  }

  /** Stops the camera/microphone and closes the connection. Safe to call more than once. */
  close() {
    this.closed = true;
    this.teardownPeer();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.remoteStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.remoteStream = null;
  }
}