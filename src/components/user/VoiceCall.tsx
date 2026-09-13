"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "@/lib/auth";
import { adminRequest } from "@/lib/admin-api";
import { createCallSounds } from "@/lib/call-sounds";

export const voiceTime = (seconds: number) => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds)) % 60).padStart(2, "0")}`;
type Teacher = { id: string; name: string; imageUrl: string | null; voiceEnabled: boolean };
export type CallRecord = { id: string; status: string; connectedAt: string | null; deadlineAt: string; endedAt: string | null; billableSeconds: number; reservedSeconds: number; endReason: string | null; serverNow: string; createdAt?: string; master?: { name: string }; isAdminTest?: boolean };
export type Allowance = { enabled: boolean; totalSeconds: number; usedSeconds: number; reservedSeconds: number; remainingSeconds: number; expiresAt: string | null; activeCall: CallRecord | null };
const terminal = (call: CallRecord) => call.status === "ENDED" || call.status === "FAILED";

export function VoiceCallButton({ master, conversationId, adminTest = false }: { master: Teacher; conversationId?: string; adminTest?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!master.voiceEnabled) return null;
  return <><button className="voice-call-button" type="button" onClick={() => setOpen(true)}><i className="bi bi-telephone" />{adminTest ? "Test voice call" : "Call"}</button>{open && createPortal(<VoiceCallPanel master={master} conversationId={conversationId} adminTest={adminTest} close={() => setOpen(false)} />, document.body)}</>;
}

export function VoiceCallPanel({ master, conversationId, adminTest, close }: { master: Teacher; conversationId?: string; adminTest: boolean; close: () => void }) {
  const [state, setState] = useState<"idle" | "connecting" | "connected" | "reconnecting" | "ended" | "error">("idle");
  const [allowance, setAllowance] = useState<Allowance | null>(null);
  const [call, setCall] = useState<CallRecord | null>(null);
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const muteRef = useRef(false);
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [now, setNow] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  const peer = useRef<RTCPeerConnection | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const currentId = useRef<string | null>(null);
  const pending = useRef(false);
  const generation = useRef(0);
  const offset = useRef(0);
  const sounds = useRef<ReturnType<typeof createCallSounds> | null>(null);
  const request = adminTest ? adminRequest : authenticatedFetch;

  useEffect(() => { sounds.current?.setMuted(speakerMuted); }, [speakerMuted]);

  useEffect(() => {
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  function releaseMedia() {
    if (peer.current) peer.current.onconnectionstatechange = null;
    peer.current?.close(); peer.current = null;
    mic.current?.getTracks().forEach((track) => track.stop()); mic.current = null;
    if (audio.current) { audio.current.pause(); audio.current.srcObject = null; }
  }
  async function reloadAllowance() {
    try { setAllowance(await request<Allowance>("/voice/allowance")); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load voice allowance."); }
  }
  useEffect(() => {
    let active = true;
    request<Allowance>("/voice/allowance").then((value) => { if (active) setAllowance(value); }).catch((caught: unknown) => { if (active) setError(caught instanceof Error ? caught.message : "Voice unavailable."); });
    return () => {
      active = false; generation.current += 1;
      sounds.current?.dispose(); sounds.current = null;
      peer.current?.close(); mic.current?.getTracks().forEach((track) => track.stop());
      const id = currentId.current;
      if (id) void request(`/voice/calls/${id}/end`, { method: "POST", body: "{}", keepalive: true }).catch(() => undefined);
    };
  }, [request]);

  async function end(reason = "USER_ENDED") {
    sounds.current?.end();
    generation.current += 1;
    releaseMedia(); pending.current = false;
    const id = currentId.current;
    if (!id) { setState("ended"); return; }
    try {
      const result = await request<CallRecord>(`/voice/calls/${id}/end`, { method: "POST", body: JSON.stringify({ reason }) });
      setCall(result);
      if (terminal(result)) { currentId.current = null; setState("ended"); }
      else { setState("error"); setError("Your audio is closed. Server hang-up is still pending; retry End call before starting another call."); }
    } catch (caught) { setState("error"); setError(caught instanceof Error ? caught.message : "Hang-up is pending. The server will reconcile the call."); }
    window.dispatchEvent(new Event("c2i-usage-change"));
    await reloadAllowance();
  }

  async function start() {
    if (pending.current || currentId.current) return;
    pending.current = true;
    sounds.current ??= createCallSounds();
    sounds.current.setMuted(speakerMuted);
    sounds.current.start();
    const attempt = ++generation.current;
    setState("connecting"); setError(""); setCall(null); setMuted(false); muteRef.current = false; setPlaybackBlocked(false);
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw new Error("Voice calls need a supported browser on HTTPS (or localhost).");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (attempt !== generation.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      mic.current = stream;
      // Do not negotiate a data channel: session controls belong to the backend.
      const connection = new RTCPeerConnection(); peer.current = connection;
      for (const track of stream.getAudioTracks()) { track.enabled = false; connection.addTrack(track, stream); }
      connection.ontrack = (event) => {
        if (audio.current) {
          audio.current.srcObject = event.streams[0] ?? new MediaStream([event.track]);
          void audio.current.play().catch(() => setPlaybackBlocked(true));
        }
      };
      const offer = await connection.createOffer(); await connection.setLocalDescription(offer);
      const created = await request<CallRecord & { sdp: string }>(adminTest ? "/admin/voice/test-calls" : "/voice/calls", {
        method: "POST", body: JSON.stringify({ masterId: master.id, conversationId, sdp: offer.sdp, requestId: crypto.randomUUID() }),
      });
      if (attempt !== generation.current) { void request(`/voice/calls/${created.id}/end`, { method: "POST", body: "{}" }).catch(() => undefined); return; }
      currentId.current = created.id; setCall(created);
      await connection.setRemoteDescription({ type: "answer", sdp: created.sdp });
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("Audio connection timed out. Check your network and try again.")), 12000);
        connection.onconnectionstatechange = () => {
          if (connection.connectionState === "connected") { window.clearTimeout(timer); resolve(); }
          else if (["failed", "closed"].includes(connection.connectionState)) { window.clearTimeout(timer); reject(new Error("Audio connection failed.")); }
        };
        if (connection.connectionState === "connected") { window.clearTimeout(timer); resolve(); }
      });
      if (attempt !== generation.current) return;
      const active = await request<CallRecord>(`/voice/calls/${created.id}/activate`, { method: "POST", body: "{}" });
      if (attempt !== generation.current) return;
      offset.current = Date.parse(active.serverNow) - Date.now(); setNow(Date.now() + offset.current); setCall(active);
      for (const track of stream.getAudioTracks()) track.enabled = !muteRef.current;
      connection.onconnectionstatechange = () => {
        if (["disconnected", "failed"].includes(connection.connectionState)) {
          setState("reconnecting");
          // A disconnect ends the provider session. Reconnect requires a new
          // explicit start against the same period's remaining allowance.
          void end("NETWORK_DISCONNECTED");
        }
      };
      setState("connected");
      sounds.current?.connected();
      window.dispatchEvent(new Event("c2i-usage-change"));
    } catch (caught) {
      if (attempt !== generation.current) return;
      const message = caught instanceof DOMException && caught.name === "NotAllowedError" ? "Microphone access was denied. Allow it in your browser settings and try again."
        : caught instanceof Error ? caught.message : "Unable to start this call.";
      await end(); setError(message); setState("error");
    } finally { pending.current = false; }
  }

  useEffect(() => {
    if (state !== "connected" || !call) return;
    let stopped = false;
    let polling = false;
    let lastSuccess = Date.now();
    const clock = window.setInterval(() => {
      const current = Date.now() + offset.current; setNow(current);
      if (current >= Date.parse(call.deadlineAt)) { sounds.current?.end(); peer.current?.close(); mic.current?.getTracks().forEach((track) => track.stop()); }
    }, 250);
    const heartbeat = window.setInterval(() => {
      if (polling) return;
      polling = true;
      request<CallRecord>(`/voice/calls/${call.id}/heartbeat`, { method: "POST", body: "{}" }).then((value) => {
        if (stopped) return;
        lastSuccess = Date.now();
        if (terminal(value) || value.status === "STOPPING") {
          sounds.current?.end();
          peer.current?.close(); mic.current?.getTracks().forEach((track) => track.stop());
          setCall(value); setState(terminal(value) ? "ended" : "error");
          if (terminal(value)) currentId.current = null;
          else setError("Call time has ended. Waiting for server hang-up confirmation.");
          window.dispatchEvent(new Event("c2i-usage-change"));
          void request<Allowance>("/voice/allowance").then(setAllowance).catch(() => undefined);
        }
      }).catch(() => {
        if (!stopped && Date.now() - lastSuccess > 6000) {
          sounds.current?.end();
          peer.current?.close(); mic.current?.getTracks().forEach((track) => track.stop());
          setState("error"); setError("Connection to the server was lost. Audio is stopped; the server will end the call.");
        }
      }).finally(() => { polling = false; });
    }, 2000);
    return () => { stopped = true; window.clearInterval(clock); window.clearInterval(heartbeat); };
  }, [state, call, request]);

  const elapsed = call?.connectedAt ? Math.max(0, Math.floor((Math.min(now, Date.parse(call.deadlineAt)) - Date.parse(call.connectedAt)) / 1000)) : 0;
  const remaining = state === "connected" && call ? Math.max(0, Math.floor((Date.parse(call.deadlineAt) - now) / 1000)) : allowance?.remainingSeconds ?? 0;
  return <dialog ref={dialog} className="voice-backdrop" aria-labelledby="voice-title" onCancel={(event) => { event.preventDefault(); void end().finally(close); }}><section className="voice-panel">
    <button className="voice-close" aria-label="Close call" type="button" onClick={() => { void end().finally(close); }}>×</button>
    <span className="user-kicker">{adminTest ? "Admin test · Uses API credit" : "Your space to reflect"}</span>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {master.imageUrl ? <img className="voice-avatar" src={master.imageUrl} alt={master.name} /> : <div className="voice-avatar voice-initial">{master.name.slice(0, 1)}</div>}
    <h2 id="voice-title">{master.name}</h2><p>AI voice conversation · Synthetic voice</p>
    <div className={`voice-status voice-${state}`} role="status" aria-live="polite">{state === "idle" ? "Ready when you are" : state === "connected" ? muted ? "Microphone muted - you can still listen" : "Connected — speak naturally" : state === "reconnecting" ? "Reconnecting — closing interrupted call" : state === "connecting" ? "Connecting…" : state === "ended" ? "Call ended" : "Call needs attention"}</div>
    <audio ref={audio} autoPlay playsInline muted={speakerMuted} />
    {state === "connected" && <p className="voice-live-indicator"><i className={`bi bi-${muted ? "mic-mute" : "soundwave"}`} /> {muted ? "Your microphone is off" : "Your microphone is on"}{remaining <= 30 ? " / Less than 30 seconds left" : ""}</p>}
    {playbackBlocked && <button type="button" onClick={() => { void audio.current?.play().then(() => setPlaybackBlocked(false)).catch(() => setError("Enable audio playback in your browser.")); }}>Enable speaker audio</button>}
    <div className="voice-timers"><div><strong>{voiceTime(state === "ended" ? call?.billableSeconds ?? 0 : elapsed)}</strong><span>{state === "ended" ? "Time used" : "Elapsed"}</span></div><div><strong>{voiceTime(remaining)}</strong><span>{state === "connected" ? "Time left this call" : "Voice available"}</span></div></div>
    {error && <p className="voice-error" role="alert">{error}</p>}
    {allowance && !allowance.enabled && <p>Voice calls are not available yet.</p>}
    {!adminTest && allowance?.enabled && !allowance.totalSeconds && <p>Your plan has no voice time. <Link href="/user/plan">View plans</Link></p>}
    {allowance?.activeCall && (!call || terminal(call)) && !terminal(allowance.activeCall) && <p>A previous call is still open. <button type="button" onClick={() => { currentId.current = allowance.activeCall!.id; void end(); }}>End previous call</button></p>}
    <div className="voice-actions">
      {state === "connected" && <button type="button" aria-pressed={muted} onClick={() => { const next = !muteRef.current; muteRef.current = next; mic.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); peer.current?.getSenders().forEach((sender) => { if (sender.track?.kind === "audio") sender.track.enabled = !next; }); setMuted(next); }}><i className={`bi bi-mic${muted ? "-mute" : ""}`} />{muted ? "Unmute" : "Mute"}</button>}
      {state === "connected" && <button type="button" aria-pressed={speakerMuted} onClick={() => setSpeakerMuted((value) => !value)}><i className={`bi bi-volume-${speakerMuted ? "mute" : "up"}`} />{speakerMuted ? "Speaker off" : "Speaker on"}</button>}
      {state === "connecting" || state === "connected" || (call && !terminal(call)) ? <button className="voice-end" type="button" onClick={() => void end()}>End call</button>
        : <button className="voice-start" type="button" disabled={!allowance?.enabled || (!adminTest && allowance.remainingSeconds < 1) || !!allowance?.activeCall} onClick={() => void start()}>{state === "ended" || state === "error" ? "Call again" : adminTest ? "Start paid API test" : "Start call"}</button>}
    </div>
    <p className="voice-footnote">Speaking, listening, pauses, and muted time count while connected. Text questions are separate. We do not record raw audio.</p>
    {adminTest && <p className="voice-footnote">Test calls do not use customer minutes. Maximum 3 minutes; actual API cost depends on token usage.</p>}
  </section></dialog>;
}

export function VoiceBalance() {
  const [balance, setBalance] = useState<Allowance | null>(null);
  const [now, setNow] = useState(0);
  const [serverOffset, setServerOffset] = useState(0);
  useEffect(() => {
    let active = true;
    const reload = () => { void authenticatedFetch<Allowance>("/voice/allowance").then((value) => { if (active) { setBalance(value); setServerOffset(value.activeCall ? Date.parse(value.activeCall.serverNow) - Date.now() : 0); setNow(Date.now()); } }).catch(() => { if (active) setBalance(null); }); };
    reload();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener("c2i-usage-change", reload);
    window.addEventListener("focus", reload);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("c2i-usage-change", reload); window.removeEventListener("focus", reload); };
  }, []);
  const active = balance?.activeCall;
  const seconds = balance ? balance.remainingSeconds + (active?.connectedAt && !terminal(active) ? Math.max(0, Math.ceil((Date.parse(active.deadlineAt) - now - serverOffset) / 1000)) : 0) : 0;
  return <Link href="/user/usage" className="user-balance-pill voice-balance-pill"><span><i className="bi bi-telephone" /></span><div><small>Call time left</small><strong>{balance ? voiceTime(seconds) : "Unavailable"}</strong></div></Link>;
}
