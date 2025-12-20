// import React, { useCallback, useEffect, useRef, useState } from "react";
// // ✅ swap TldrawAgent -> FairyAgent
// import { FairyAgent } from "../../../fairy/fairy-agent/FairyAgent";
// import {
//   LiveKitRoom,
//   useConnectionState,
//   RoomAudioRenderer,
//   StartAudio,
//   useLocalParticipant,
//   useTranscriptions,
//   RoomContext,
// } from "@livekit/components-react";
// import { ConnectionState, RoomEvent } from "livekit-client";
// import "@livekit/components-styles";

// function ConnectionStatus() {
//   const s = useConnectionState();
//   const label =
//     s === ConnectionState.Connected
//       ? "Connected"
//       : s === ConnectionState.Connecting
//       ? "Connecting…"
//       : s === ConnectionState.Disconnected
//       ? "Disconnected"
//       : String(s);

//   return <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>;
// }

// /**
//  * Push-to-talk mic controller:
//  * - default mic is MUTED after connect
//  * - hold Space to unmute, release to mute
//  * - publishes ptt.start / ptt.end
//  */
// function MicPushToTalk({ hotkey = "Space" }: { hotkey?: string }) {
//   const { localParticipant } = useLocalParticipant();
//   const connection = useConnectionState();
//   const room = React.useContext(RoomContext);

//   const [micEnabled, setMicEnabled] = useState(false);

//   const publishPtt = useCallback(
//     (topic: "ptt.start" | "ptt.end") => {
//       if (!room?.localParticipant) return;
//       const payload = { ts: new Date().toISOString() };
//       room.localParticipant.publishData(
//         new TextEncoder().encode(JSON.stringify(payload)),
//         { topic }
//       );
//     },
//     [room]
//   );

//   const setMic = useCallback(
//     async (enabled: boolean) => {
//       if (!localParticipant) return;
//       try {
//         await localParticipant.setMicrophoneEnabled(enabled);
//         setMicEnabled(enabled);
//       } catch (e) {
//         console.error("Failed to set microphone:", e);
//       }
//     },
//     [localParticipant]
//   );

//   useEffect(() => {
//     if (!localParticipant) return;
//     if (connection !== ConnectionState.Connected) return;

//     const down = (e: KeyboardEvent) => {
//       if (e.code !== hotkey) return;
//       if (e.repeat) return;
//       e.preventDefault();

//       publishPtt("ptt.start");
//       setMic(true);
//     };

//     const up = (e: KeyboardEvent) => {
//       if (e.code !== hotkey) return;
//       e.preventDefault();

//       setMic(false);
//       publishPtt("ptt.end");
//     };

//     const blur = () => {
//       if (micEnabled) {
//         setMic(false);
//         publishPtt("ptt.end");
//       }
//     };

//     window.addEventListener("keydown", down, { passive: false });
//     window.addEventListener("keyup", up, { passive: false });
//     window.addEventListener("blur", blur);

//     return () => {
//       window.removeEventListener("keydown", down as any);
//       window.removeEventListener("keyup", up as any);
//       window.removeEventListener("blur", blur);
//     };
//   }, [localParticipant, connection, hotkey, setMic, publishPtt, micEnabled]);

//   return (
//     <div
//       style={{
//         display: "flex",
//         alignItems: "center",
//         gap: 10,
//         marginTop: 8,
//         flexWrap: "wrap",
//       }}
//     >
//       <div
//         style={{
//           fontSize: 12,
//           padding: "4px 10px",
//           borderRadius: 999,
//           border: "1px solid rgba(255,255,255,0.12)",
//           background: micEnabled
//             ? "rgba(34, 197, 94, 0.18)"
//             : "rgba(239, 68, 68, 0.18)",
//           color: "#fff",
//         }}
//         title={`Hold ${hotkey} to talk`}
//       >
//         Mic: {micEnabled ? "Unmuted (talking)" : "Muted"}
//       </div>

//       <button
//         onClick={() => setMic(!micEnabled)}
//         style={{ padding: "6px 10px", borderRadius: 10 }}
//         disabled={connection !== ConnectionState.Connected}
//         title="Manual toggle"
//       >
//         {micEnabled ? "Mute" : "Unmute"}
//       </button>

//       <div style={{ fontSize: 12, opacity: 0.75 }}>
//         Hold <b>{hotkey}</b> to speak
//       </div>
//     </div>
//   );
// }

// type ChatMsg =
//   | { id: string; kind: "user_transcript"; text: string; ts: number }
//   | { id: string; kind: "ai_speak"; text: string; ts: number }
//   | { id: string; kind: "ai_question"; text: string; ts: number };

// function TranscriptionCollector({ onUser }: { onUser: (m: ChatMsg) => void }) {
//   const { localParticipant } = useLocalParticipant();
//   const transcriptions = useTranscriptions();

//   const lastTextRef = useRef<Map<string, string>>(new Map());

//   useEffect(() => {
//     if (!localParticipant) return;

//     const mySid = (localParticipant as any)?.sid ?? "";
//     const myIdentity = (localParticipant as any)?.identity ?? "";

//     for (let i = 0; i < transcriptions.length; i++) {
//       const t: any = transcriptions[i];
//       const attrs =
//         t?.attributes ?? t?.info?.attributes ?? t?.segment?.attributes ?? {};

//       const segmentId =
//         attrs["lk.segment_id"] ?? t?.segmentId ?? t?.id ?? `${i}`;

//       const text = (t?.text ?? t?.segment?.text ?? "").trim();
//       if (!text) continue;

//       const participantInfo = t?.participantInfo ?? {};
//       const sid =
//         t?.participantSid ??
//         t?.participant?.sid ??
//         t?.from?.sid ??
//         participantInfo?.sid ??
//         "";

//       const identity =
//         t?.participantIdentity ??
//         t?.from?.identity ??
//         t?.participant?.identity ??
//         participantInfo?.identity ??
//         "";

//       let isMe = false;
//       if (mySid && sid) isMe = sid === mySid;
//       if (!isMe && myIdentity && identity) isMe = identity === myIdentity;
//       if (!isMe) continue; // ✅ ONLY user mic

//       const id = `user:${sid || identity || "p"}:${segmentId}`;
//       const prevText = lastTextRef.current.get(id);

//       if (prevText === text) continue;
//       lastTextRef.current.set(id, text);

//       const ts = Number(t?.timestamp ?? t?.receivedAt ?? Date.now());

//       onUser({ id, kind: "user_transcript", text, ts });
//     }
//   }, [transcriptions, localParticipant, onUser]);

//   return null;
// }

// function UnifiedChat({ items }: { items: ChatMsg[] }) {
//   const scrollRef = useRef<HTMLDivElement | null>(null);
//   const bottomRef = useRef<HTMLDivElement | null>(null);
//   const [stickToBottom, setStickToBottom] = useState(true);

//   const onScroll = useCallback(() => {
//     const el = scrollRef.current;
//     if (!el) return;
//     const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
//     setStickToBottom(distanceFromBottom < 80);
//   }, []);

//   useEffect(() => {
//     if (!stickToBottom) return;
//     bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
//   }, [items, stickToBottom]);

//   if (items.length === 0) return null;

//   return (
//     <div
//       ref={scrollRef}
//       onScroll={onScroll}
//       style={{
//         marginTop: 12,
//         width: "100%",
//         flex: 1,
//         minHeight: 0,
//         overflowY: "auto",
//         display: "flex",
//         flexDirection: "column",
//         gap: 10,
//         paddingRight: 6,
//       }}
//     >
//       {items.map((m) => {
//         const isMe = m.kind === "user_transcript";
//         const isQuestion = m.kind === "ai_question";

//         return (
//           <div
//             key={m.id}
//             style={{
//               display: "flex",
//               justifyContent: isMe ? "flex-end" : "flex-start",
//               width: "100%",
//             }}
//           >
//             <div
//               style={{
//                 maxWidth: "85%",
//                 padding: "10px 14px",
//                 borderRadius: 16,
//                 fontSize: 14,
//                 lineHeight: 1.4,
//                 whiteSpace: "pre-wrap",
//                 wordBreak: "break-word",
//                 color: "#fff",
//                 border: isQuestion
//                   ? "1px solid rgba(250, 204, 21, 0.45)"
//                   : "1px solid rgba(255,255,255,0.12)",
//                 background: isMe
//                   ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
//                   : isQuestion
//                   ? "linear-gradient(135deg, #1f2937 0%, #111827 100%)"
//                   : "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)",
//               }}
//             >
//               {isQuestion ? (
//                 <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
//                   Please answer this Question
//                 </div>
//               ) : null}

//               {m.text}
//             </div>
//           </div>
//         );
//       })}

//       <div ref={bottomRef} />
//     </div>
//   );
// }

// function DataHandler({
//   agent,
//   onUi,
// }: {
//   agent: FairyAgent;
//   onUi: (m: ChatMsg) => void;
// }) {
//   const room = React.useContext(RoomContext);

//   useEffect(() => {
//     if (!room) return;

//     const handleDataReceived = async (
//       payload: Uint8Array,
//       _participant?: any,
//       _kind?: any,
//       topic?: string
//     ) => {
//       // --- SNAPSHOT: FairyAgent ---
//       if (topic === "snapshot.request") {
//         const payloadText = new TextDecoder().decode(payload);
//         let decoded: any;

//         try {
//           decoded = JSON.parse(payloadText);
//         } catch (parseErr) {
//           console.error("Failed to parse snapshot.request payload:", parseErr);
//           room.localParticipant.publishData(
//             new TextEncoder().encode(
//               JSON.stringify({
//                 error: `Parse error: ${String(parseErr)}`,
//                 state_uuid: null,
//               })
//             ),
//             { topic: "snapshot.response" }
//           );
//           return;
//         }

//         const request_id = decoded?.request_id;
//         if (!request_id) {
//           console.warn("snapshot.request: no valid request_id found");
//           return;
//         }

//         try {
//           const state_uuid = await agent.snapshotCanvas();

//           room.localParticipant.publishData(
//             new TextEncoder().encode(JSON.stringify({ request_id, state_uuid })),
//             { topic: "snapshot.response" }
//           );
//         } catch (err) {
//           console.error("Snapshot request failed:", err);
//           room.localParticipant.publishData(
//             new TextEncoder().encode(
//               JSON.stringify({
//                 request_id,
//                 error: String(err),
//                 state_uuid: null,
//               })
//             ),
//             { topic: "snapshot.response" }
//           );
//         }

//         return;
//       }

//       // --- DRAW (optional) ---
//       // Keep this only if your FairyAgent supports it.
//       if (topic === "draw.request") {
//         const payloadText = new TextDecoder().decode(payload);
//         let decoded: any;

//         try {
//           decoded = JSON.parse(payloadText);
//         } catch (parseErr) {
//           console.error("Failed to parse draw.request payload:", parseErr);
//           return;
//         }

//         const request_id = decoded?.request_id;
//         const instruction = decoded?.instruction;

//         if (!request_id) {
//           console.warn("draw.request: no valid request_id found");
//           return;
//         }
//         if (!instruction || typeof instruction !== "string") {
//           room.localParticipant.publishData(
//             new TextEncoder().encode(
//               JSON.stringify({
//                 request_id,
//                 ok: false,
//                 error: "Missing instruction",
//               })
//             ),
//             { topic: "draw.response" }
//           );
//           return;
//         }

//         const fn = (agent as any)?.drawFromLiveKitInstruction;
//         if (typeof fn !== "function") {
//           room.localParticipant.publishData(
//             new TextEncoder().encode(
//               JSON.stringify({
//                 request_id,
//                 ok: false,
//                 error:
//                   "FairyAgent.drawFromLiveKitInstruction is not implemented",
//               })
//             ),
//             { topic: "draw.response" }
//           );
//           return;
//         }

//         try {
//           await fn.call(agent, instruction);
//           room.localParticipant.publishData(
//             new TextEncoder().encode(JSON.stringify({ request_id, ok: true })),
//             { topic: "draw.response" }
//           );
//         } catch (err: any) {
//           room.localParticipant.publishData(
//             new TextEncoder().encode(
//               JSON.stringify({
//                 request_id,
//                 ok: false,
//                 error: err?.message ?? String(err),
//               })
//             ),
//             { topic: "draw.response" }
//           );
//         }

//         return;
//       }

//       // --- UI Messages (same) ---
//       if (topic === "ui.speak" || topic === "ui.question") {
//         const payloadText = new TextDecoder().decode(payload);
//         let decoded: any;
//         try {
//           decoded = JSON.parse(payloadText);
//         } catch (e) {
//           console.error("Failed to parse ui payload:", e);
//           return;
//         }

//         const text = (decoded?.text ?? "").trim();
//         if (!text) return;

//         const ts =
//           Date.parse(decoded?.ts ?? "") ||
//           Number(decoded?.timestamp ?? "") ||
//           Date.now();

//         onUi({
//           id: `${topic}:${decoded?.ts ?? ts}:${text.slice(0, 16)}`,
//           kind: topic === "ui.speak" ? "ai_speak" : "ai_question",
//           text,
//           ts,
//         });

//         return;
//       }
//     };

//     room.on(RoomEvent.DataReceived, handleDataReceived);
//     return () => {
//       room.off(RoomEvent.DataReceived, handleDataReceived);
//     };
//   }, [room, agent, onUi]);

//   return null;
// }

// export function ChatPanel({ agent }: { agent: FairyAgent }) {
//   const [lkConnect, setLkConnect] = useState(false);
//   const [lkToken, setLkToken] = useState<string | undefined>();
//   const [lkUrl, setLkUrl] = useState<string | undefined>();
//   const [lkLoading, setLkLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const [messages, setMessages] = useState<ChatMsg[]>([]);

//   const pushMessage = useCallback((m: ChatMsg) => {
//     setMessages((prev) => {
//       const idx = prev.findIndex((x) => x.id === m.id);

//       // update existing (streaming transcript / streaming ui message)
//       if (idx !== -1) {
//         const next = [...prev];
//         const old = next[idx];

//         if (old.text !== m.text) {
//           next[idx] = { ...old, text: m.text, ts: Math.min(old.ts, m.ts) };
//         }
//         return next.sort((a, b) => a.ts - b.ts);
//       }

//       // insert new
//       return [...prev, m].sort((a, b) => a.ts - b.ts);
//     });
//   }, []);

//   const handleStartLiveKit = useCallback(async () => {
//     if (lkConnect) {
//       setLkConnect(false);
//       return;
//     }

//     setError(null);
//     setLkLoading(true);

//     try {
//       const response = await fetch("http://localhost:3000/start-learning", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           prompt:
//             "start teaching me the below content, cover the complete content and don't divert much",
//         }),
//       });

//       const data: any = await response.json();

//       if (data.status !== "success") {
//         setError(data.message || "Failed to start learning session");
//         return;
//       }

//       const tokenToUse = data.livekit?.token;
//       if (!tokenToUse) {
//         setError("Token missing in API response");
//         return;
//       }

//       setLkToken(tokenToUse);
//       setLkUrl("wss://qwertytrewq-ypzbcoyv.livekit.cloud");
//       setLkConnect(true);
//     } catch {
//       setError("Failed to start learning session");
//     } finally {
//       setLkLoading(false);
//     }
//   }, [lkConnect]);

//   return (
//     <div
//       className="chat-panel tl-theme__dark"
//       style={{
//         display: "flex",
//         flexDirection: "column",
//         gap: 12,
//         padding: 12,
//         height: "100%",
//         minHeight: 0,
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           gap: 10,
//           alignItems: "center",
//           flexWrap: "wrap",
//         }}
//       >
//         <button
//           onClick={handleStartLiveKit}
//           disabled={lkLoading}
//           style={{ padding: "8px 10px", borderRadius: 10 }}
//         >
//           {lkConnect
//             ? "Stop Learning"
//             : lkLoading
//             ? "Starting…"
//             : "Start Learning"}
//         </button>

//         {error ? (
//           <span style={{ color: "salmon", fontSize: 12 }}>{error}</span>
//         ) : null}
//       </div>

//       {lkToken && lkUrl ? (
//         <div
//           style={{
//             display: "flex",
//             flexDirection: "column",
//             gap: 10,
//             flex: 1,
//             minHeight: 0,
//           }}
//         >
//           <LiveKitRoom
//             token={lkToken}
//             serverUrl={lkUrl}
//             connect={lkConnect}
//             audio={true}
//             video={false}
//             options={{ publishDefaults: { simulcast: false } }}
//             connectOptions={{ autoSubscribe: true }}
//             style={{
//               display: "flex",
//               flexDirection: "column",
//               flex: 1,
//               minHeight: 0,
//               width: "100%",
//             }}
//           >
//             <div
//               style={{
//                 display: "flex",
//                 flexDirection: "column",
//                 flex: 1,
//                 minHeight: 0,
//                 width: "100%",
//                 gap: 10,
//               }}
//             >
//               {/* fixed-height controls */}
//               <div
//                 style={{
//                   flex: "0 0 auto",
//                   display: "flex",
//                   flexDirection: "column",
//                   gap: 10,
//                 }}
//               >
//                 <RoomAudioRenderer />
//                 <StartAudio label="Enable audio" />
//                 <ConnectionStatus />
//                 <MicPushToTalk hotkey="Space" />
//               </div>

//               {/* scrollable chat */}
//               <div
//                 style={{
//                   flex: 1,
//                   minHeight: 0,
//                   display: "flex",
//                   flexDirection: "column",
//                 }}
//               >
//                 <DataHandler agent={agent} onUi={pushMessage} />
//                 <TranscriptionCollector onUser={pushMessage} />
//                 <UnifiedChat items={messages} />
//               </div>
//             </div>
//           </LiveKitRoom>
//         </div>
//       ) : null}
//     </div>
//   );
// }

import React, { useCallback, useEffect, useRef, useState } from 'react'
// ✅ swap TldrawAgent -> FairyAgent
import { FairyAgent } from '../../../fairy/fairy-agent/FairyAgent'

import {
	LiveKitRoom,
	RoomAudioRenderer,
	RoomContext,
	StartAudio,
	useConnectionState,
	useLocalParticipant,
	useTranscriptions,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { ConnectionState, RoomEvent } from 'livekit-client'

function ConnectionStatus() {
	const s = useConnectionState()
	const label =
		s === ConnectionState.Connected
			? 'Connected'
			: s === ConnectionState.Connecting
				? 'Connecting…'
				: s === ConnectionState.Disconnected
					? 'Disconnected'
					: String(s)

	return <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
}

/**
 * Push-to-talk mic controller:
 * - default mic is MUTED after connect
 * - hold Space to unmute, release to mute
 * - publishes ptt.start / ptt.end
 */
function MicPushToTalk({ hotkey = 'Space' }: { hotkey?: string }) {
	const { localParticipant } = useLocalParticipant()
	const connection = useConnectionState()
	const room = React.useContext(RoomContext)

	const [micEnabled, setMicEnabled] = useState(false)

	const publishPtt = useCallback(
		(topic: 'ptt.start' | 'ptt.end') => {
			if (!room?.localParticipant) return
			const payload = { ts: new Date().toISOString() }
			room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(payload)), {
				topic,
			})
		},
		[room]
	)

	const setMic = useCallback(
		async (enabled: boolean) => {
			if (!localParticipant) return
			try {
				await localParticipant.setMicrophoneEnabled(enabled)
				setMicEnabled(enabled)
			} catch (e) {
				console.error('Failed to set microphone:', e)
			}
		},
		[localParticipant]
	)

	useEffect(() => {
		if (!localParticipant) return
		if (connection !== ConnectionState.Connected) return

		const down = (e: KeyboardEvent) => {
			if (e.code !== hotkey) return
			if (e.repeat) return
			e.preventDefault()

			publishPtt('ptt.start')
			setMic(true)
		}

		const up = (e: KeyboardEvent) => {
			if (e.code !== hotkey) return
			e.preventDefault()

			setMic(false)
			publishPtt('ptt.end')
		}

		const blur = () => {
			if (micEnabled) {
				setMic(false)
				publishPtt('ptt.end')
			}
		}

		window.addEventListener('keydown', down, { passive: false })
		window.addEventListener('keyup', up, { passive: false })
		window.addEventListener('blur', blur)

		return () => {
			window.removeEventListener('keydown', down as any)
			window.removeEventListener('keyup', up as any)
			window.removeEventListener('blur', blur)
		}
	}, [localParticipant, connection, hotkey, setMic, publishPtt, micEnabled])

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				marginTop: 8,
				flexWrap: 'wrap',
			}}
		>
			<div
				style={{
					fontSize: 12,
					padding: '4px 10px',
					borderRadius: 999,
					border: '1px solid rgba(255,255,255,0.12)',
					background: micEnabled ? 'rgba(34, 197, 94, 0.18)' : 'rgba(239, 68, 68, 0.18)',
					color: '#fff',
				}}
				title={`Hold ${hotkey} to talk`}
			>
				Mic: {micEnabled ? 'Unmuted (talking)' : 'Muted'}
			</div>

			<button
				onClick={() => setMic(!micEnabled)}
				style={{ padding: '6px 10px', borderRadius: 10 }}
				disabled={connection !== ConnectionState.Connected}
				title="Manual toggle"
			>
				{micEnabled ? 'Mute' : 'Unmute'}
			</button>

			<div style={{ fontSize: 12, opacity: 0.75 }}>
				Hold <b>{hotkey}</b> to speak
			</div>
		</div>
	)
}

type ChatMsg =
	| { id: string; kind: 'user_transcript'; text: string; ts: number }
	| { id: string; kind: 'ai_speak'; text: string; ts: number }
	| { id: string; kind: 'ai_question'; text: string; ts: number }

function TranscriptionCollector({ onUser }: { onUser: (m: ChatMsg) => void }) {
	const { localParticipant } = useLocalParticipant()
	const transcriptions = useTranscriptions()

	const lastTextRef = useRef<Map<string, string>>(new Map())

	useEffect(() => {
		if (!localParticipant) return

		const mySid = (localParticipant as any)?.sid ?? ''
		const myIdentity = (localParticipant as any)?.identity ?? ''

		for (let i = 0; i < transcriptions.length; i++) {
			const t: any = transcriptions[i]
			const attrs = t?.attributes ?? t?.info?.attributes ?? t?.segment?.attributes ?? {}

			const segmentId = attrs['lk.segment_id'] ?? t?.segmentId ?? t?.id ?? `${i}`

			const text = (t?.text ?? t?.segment?.text ?? '').trim()
			if (!text) continue

			const participantInfo = t?.participantInfo ?? {}
			const sid =
				t?.participantSid ?? t?.participant?.sid ?? t?.from?.sid ?? participantInfo?.sid ?? ''

			const identity =
				t?.participantIdentity ??
				t?.from?.identity ??
				t?.participant?.identity ??
				participantInfo?.identity ??
				''

			let isMe = false
			if (mySid && sid) isMe = sid === mySid
			if (!isMe && myIdentity && identity) isMe = identity === myIdentity
			if (!isMe) continue // ✅ ONLY user mic

			const id = `user:${sid || identity || 'p'}:${segmentId}`
			const prevText = lastTextRef.current.get(id)

			if (prevText === text) continue
			lastTextRef.current.set(id, text)

			const ts = Number(t?.timestamp ?? t?.receivedAt ?? Date.now())

			onUser({ id, kind: 'user_transcript', text, ts })
		}
	}, [transcriptions, localParticipant, onUser])

	return null
}

function UnifiedChat({ items }: { items: ChatMsg[] }) {
	const scrollRef = useRef<HTMLDivElement | null>(null)
	const bottomRef = useRef<HTMLDivElement | null>(null)
	const [stickToBottom, setStickToBottom] = useState(true)

	const onScroll = useCallback(() => {
		const el = scrollRef.current
		if (!el) return
		const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
		setStickToBottom(distanceFromBottom < 80)
	}, [])

	useEffect(() => {
		if (!stickToBottom) return
		bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
	}, [items, stickToBottom])

	if (items.length === 0) return null

	return (
		<div
			ref={scrollRef}
			onScroll={onScroll}
			style={{
				marginTop: 12,
				width: '100%',
				flex: 1,
				minHeight: 0,
				overflowY: 'auto',
				display: 'flex',
				flexDirection: 'column',
				gap: 10,
				paddingRight: 6,
			}}
		>
			{items.map((m) => {
				const isMe = m.kind === 'user_transcript'
				const isQuestion = m.kind === 'ai_question'

				return (
					<div
						key={m.id}
						style={{
							display: 'flex',
							justifyContent: isMe ? 'flex-end' : 'flex-start',
							width: '100%',
						}}
					>
						<div
							style={{
								maxWidth: '85%',
								padding: '10px 14px',
								borderRadius: 16,
								fontSize: 14,
								lineHeight: 1.4,
								whiteSpace: 'pre-wrap',
								wordBreak: 'break-word',
								color: '#fff',
								border: isQuestion
									? '1px solid rgba(250, 204, 21, 0.45)'
									: '1px solid rgba(255,255,255,0.12)',
								background: isMe
									? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
									: isQuestion
										? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
										: 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
							}}
						>
							{isQuestion ? (
								<div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
									Please answer this Question
								</div>
							) : null}

							{m.text}
						</div>
					</div>
				)
			})}

			<div ref={bottomRef} />
		</div>
	)
}

function DataHandler({ agent, onUi }: { agent: FairyAgent; onUi: (m: ChatMsg) => void }) {
	const room = React.useContext(RoomContext)

	useEffect(() => {
		if (!room) return

		const handleDataReceived = async (
			payload: Uint8Array,
			_participant?: any,
			_kind?: any,
			topic?: string
		) => {
			// --- SNAPSHOT: FairyAgent ---
			if (topic === 'snapshot.request') {
				const payloadText = new TextDecoder().decode(payload)
				let decoded: any

				try {
					decoded = JSON.parse(payloadText)
				} catch (parseErr) {
					console.error('Failed to parse snapshot.request payload:', parseErr)
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								error: `Parse error: ${String(parseErr)}`,
								state_uuid: null,
							})
						),
						{ topic: 'snapshot.response' }
					)
					return
				}

				const request_id = decoded?.request_id
				if (!request_id) {
					console.warn('snapshot.request: no valid request_id found')
					return
				}

				try {
					const state_uuid = await agent.snapshotCanvas()

					room.localParticipant.publishData(
						new TextEncoder().encode(JSON.stringify({ request_id, state_uuid })),
						{ topic: 'snapshot.response' }
					)
				} catch (err) {
					console.error('Snapshot request failed:', err)
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								request_id,
								error: String(err),
								state_uuid: null,
							})
						),
						{ topic: 'snapshot.response' }
					)
				}

				return
			}

			// --- DRAW (optional) ---
			// Keep this only if your FairyAgent supports it.
			if (topic === 'draw.request') {
				const payloadText = new TextDecoder().decode(payload)
				let decoded: any

				try {
					decoded = JSON.parse(payloadText)
				} catch (parseErr) {
					console.error('Failed to parse draw.request payload:', parseErr)
					return
				}

				const request_id = decoded?.request_id
				const instruction = decoded?.instruction

				if (!request_id) {
					console.warn('draw.request: no valid request_id found')
					return
				}
				if (!instruction || typeof instruction !== 'string') {
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								request_id,
								ok: false,
								error: 'Missing instruction',
							})
						),
						{ topic: 'draw.response' }
					)
					return
				}

				const fn = (agent as any)?.drawFromLiveKitInstruction
				if (typeof fn !== 'function') {
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								request_id,
								ok: false,
								error: 'FairyAgent.drawFromLiveKitInstruction is not implemented',
							})
						),
						{ topic: 'draw.response' }
					)
					return
				}

				try {
					await fn.call(agent, instruction)
					room.localParticipant.publishData(
						new TextEncoder().encode(JSON.stringify({ request_id, ok: true })),
						{ topic: 'draw.response' }
					)
				} catch (err: any) {
					room.localParticipant.publishData(
						new TextEncoder().encode(
							JSON.stringify({
								request_id,
								ok: false,
								error: err?.message ?? String(err),
							})
						),
						{ topic: 'draw.response' }
					)
				}

				return
			}

			// --- UI Messages (same) ---
			if (topic === 'ui.speak' || topic === 'ui.question') {
				const payloadText = new TextDecoder().decode(payload)
				let decoded: any
				try {
					decoded = JSON.parse(payloadText)
				} catch (e) {
					console.error('Failed to parse ui payload:', e)
					return
				}

				const text = (decoded?.text ?? '').trim()
				if (!text) return

				const ts = Date.parse(decoded?.ts ?? '') || Number(decoded?.timestamp ?? '') || Date.now()

				onUi({
					id: `${topic}:${decoded?.ts ?? ts}:${text.slice(0, 16)}`,
					kind: topic === 'ui.speak' ? 'ai_speak' : 'ai_question',
					text,
					ts,
				})

				return
			}
		}

		room.on(RoomEvent.DataReceived, handleDataReceived)
		return () => {
			room.off(RoomEvent.DataReceived, handleDataReceived)
		}
	}, [room, agent, onUi])

	return null
}

export function ChatPanel({ agent }: { agent?: FairyAgent }) {
	const [lkConnect, setLkConnect] = useState(false)
	const [lkToken, setLkToken] = useState<string | undefined>()
	const [lkUrl, setLkUrl] = useState<string | undefined>()
	const [lkLoading, setLkLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const [messages, setMessages] = useState<ChatMsg[]>([])

	const pushMessage = useCallback((m: ChatMsg) => {
		setMessages((prev) => {
			const idx = prev.findIndex((x) => x.id === m.id)

			// update existing (streaming transcript / streaming ui message)
			if (idx !== -1) {
				const next = [...prev]
				const old = next[idx]

				if (old.text !== m.text) {
					next[idx] = { ...old, text: m.text, ts: Math.min(old.ts, m.ts) }
				}
				return next.sort((a, b) => a.ts - b.ts)
			}

			// insert new
			return [...prev, m].sort((a, b) => a.ts - b.ts)
		})
	}, [])

	const handleStartLiveKit = useCallback(async () => {
		if (lkConnect) {
			setLkConnect(false)
			return
		}

		setError(null)
		setLkLoading(true)
		console.log('Starting LiveKit session')

		try {
			const response = await fetch('http://localhost:3001/start-learning', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					prompt:
						"start teaching me the below content, cover the complete content and don't divert much",
				}),
			})

			const data: any = await response.json()

			if (data.status !== 'success') {
				setError(data.message || 'Failed to start learning session')
				return
			}

			const tokenToUse = data.livekit?.token
			if (!tokenToUse) {
				setError('Token missing in API response')
				return
			}

			setLkToken(tokenToUse)
			setLkUrl('wss://qwertytrewq-ypzbcoyv.livekit.cloud')
			setLkConnect(true)
		} catch {
			setError('Failed to start learning session')
		} finally {
			setLkLoading(false)
		}
	}, [lkConnect])

	// Show loading state if agent is not available yet
	if (!agent) {
		return (
			<div
				className="chat-panel tl-theme__dark"
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 12,
					padding: 12,
					height: '100%',
					minHeight: 0,
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<div style={{ fontSize: 14, opacity: 0.6 }}>Initializing agent...</div>
			</div>
		)
	}

	return (
		<div
			className="chat-panel tl-theme__dark"
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 12,
				padding: 12,
				height: '100%',
				minHeight: 0,
			}}
		>
			<div
				style={{
					display: 'flex',
					gap: 10,
					alignItems: 'center',
					flexWrap: 'wrap',
				}}
			>
				<button
					onClick={handleStartLiveKit}
					disabled={lkLoading}
					style={{ padding: '8px 10px', borderRadius: 10 }}
				>
					{lkConnect ? 'Stop Learning' : lkLoading ? 'Starting…' : 'Start Learning'}
				</button>

				{error ? <span style={{ color: 'salmon', fontSize: 12 }}>{error}</span> : null}
			</div>

			{lkToken && lkUrl ? (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 10,
						flex: 1,
						minHeight: 0,
					}}
				>
					<LiveKitRoom
						token={lkToken}
						serverUrl={lkUrl}
						connect={lkConnect}
						audio={true}
						video={false}
						options={{ publishDefaults: { simulcast: false } }}
						connectOptions={{ autoSubscribe: true }}
						style={{
							display: 'flex',
							flexDirection: 'column',
							flex: 1,
							minHeight: 0,
							width: '100%',
						}}
					>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								flex: 1,
								minHeight: 0,
								width: '100%',
								gap: 10,
							}}
						>
							{/* fixed-height controls */}
							<div
								style={{
									flex: '0 0 auto',
									display: 'flex',
									flexDirection: 'column',
									gap: 10,
								}}
							>
								<RoomAudioRenderer />
								<StartAudio label="Enable audio" />
								<ConnectionStatus />
								<MicPushToTalk hotkey="Space" />
							</div>

							{/* scrollable chat */}
							<div
								style={{
									flex: 1,
									minHeight: 0,
									display: 'flex',
									flexDirection: 'column',
								}}
							>
								<DataHandler agent={agent} onUi={pushMessage} />
								<TranscriptionCollector onUser={pushMessage} />
								<UnifiedChat items={messages} />
							</div>
						</div>
					</LiveKitRoom>
				</div>
			) : null}
		</div>
	)
}
