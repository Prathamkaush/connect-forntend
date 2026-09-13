/** One audio element keeps call tones mutually exclusive and reuses playback permission. */
export function createCallSounds() {
  let audio: HTMLAudioElement | null = null;
  let phase: "idle" | "dialing" | "connected" | "ended" = "idle";
  let muted = false;

  function play(name: string, loop = false) {
    audio ??= new Audio();
    audio.pause();
    audio.src = `/sounds/call/${name}.mp3`;
    audio.loop = loop;
    audio.volume = 0.35;
    audio.muted = muted;
    // A blocked or missing sound must never interrupt the actual call.
    void audio.play().catch(() => undefined);
  }

  return {
    start() { phase = "dialing"; play("dialing", true); },
    connected() {
      if (phase !== "dialing") return;
      phase = "connected";
      play("pickup");
    },
    end() {
      if (phase === "idle" || phase === "ended") return;
      phase = "ended";
      play("hangup");
    },
    setMuted(value: boolean) { muted = value; if (audio) audio.muted = value; },
    dispose() {
      const element = audio;
      if (!element) return;
      // Let the final tone finish when Close also dismisses the call panel.
      if (phase === "ended" && !element.ended) {
        const timer = window.setTimeout(() => element.pause(), 10000);
        element.addEventListener("ended", () => window.clearTimeout(timer), { once: true });
      } else element.pause();
      audio = null;
      phase = "idle";
    },
  };
}
