// ============================================================================
// SRI LANKA CUSTOMS (LRSYS) - INCOMING CHAT NOTIFICATION SOUND
// ============================================================================
// Plays the custom audio sound: mixkit-software-interface-start-2574.wav
// with Web Audio fallback to guarantee 100% reliable zero-delay playback.

let cachedAudio: HTMLAudioElement | null = null;
let sharedAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

function getNotificationAudio(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;
  if (!cachedAudio) {
    try {
      cachedAudio = new Audio('/sounds/notification.wav');
      cachedAudio.preload = 'auto';
      cachedAudio.volume = 0.8;
    } catch (err) {
      console.warn('[NotificationSound] Failed to create Audio element:', err);
    }
  }
  return cachedAudio;
}

function getOrCreateAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (err) {
    return null;
  }
}

// Global browser window event listeners to unlock audio on first user gesture
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (isAudioUnlocked) return;
    try {
      const audio = getNotificationAudio();
      if (audio) {
        audio.load();
      }
      const ctx = getOrCreateAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          isAudioUnlocked = true;
        }).catch(() => {});
      } else {
        isAudioUnlocked = true;
      }
    } catch {}
  };

  ['click', 'keydown', 'touchstart', 'pointerdown'].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { once: true, passive: true });
  });
}

/**
 * Fallback Web Audio synthesized chime if file playback is blocked.
 */
function playFallbackSynth(): void {
  try {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now); // C6
    osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08); // E6

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (err) {
    console.warn('[NotificationSound] Fallback synth error:', err);
  }
}

/**
 * Plays the incoming message notification sound:
 * Primary: mixkit-software-interface-start-2574.wav (/sounds/notification.wav)
 * Fallback: Web Audio chime
 */
export function playIncomingMessageSound(): void {
  try {
    const audio = getNotificationAudio();
    if (audio) {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[NotificationSound] Audio play promise rejected, using fallback:', err);
          playFallbackSynth();
        });
      }
      return;
    }
  } catch (err) {
    console.warn('[NotificationSound] Audio play failed, using fallback:', err);
  }
  playFallbackSynth();
}
