# call-llamada-natsu

WhatsApp voice & video call module — wraps the official WhatsApp Web VoIP WASM stack for Node.js.

```ts
import { WhatsAppCaller, downloadAudio, isAudioMessage } from 'call-llamada-natsu';

const caller = new WhatsAppCaller({ authDir: './auth' });
await caller.connect();

const call = await caller.call('521234567890', audioBuffer);

call.on('ringing',   () => console.log('Ringing'));
call.on('connected', () => console.log('Connected'));
call.on('audio',      (pcm) => console.log('audio chunk', pcm.length));
call.on('ended',     (r) => console.log('Ended:', r));

await call.waitForEnd();
caller.disconnect();
```

## Features

- **Outbound 1:1 voice & video calls** — stream audio from files, buffers, or silence
- **Reuse existing Baileys socket** — no QR, no secondary account
- **Standalone mode** — own socket with `authDir`
- **Full call control** — `mute()`, `end()`, `durationMs`, `callId`
- **Receive remote audio** — `Float32Array` via `audio` event
- **Send video frames** — `call.sendVideoFrame(buffer, width, height)`
- **Phone number auto-normalization** — MX (`521`), AR (`549`), CO (`57`)
- **TypeScript** — full type definitions

## Install

```bash
npm install call-llamada-natsu
```

`baileys-natsu` must also be installed in your host project:

```bash
npm install baileys-natsu
```

## API

### `WhatsAppCaller`

| Method | Description |
|--------|-------------|
| `new WhatsAppCaller(config)` | `{ sock?, baileys?, authDir? }` |
| `.connect()` | Initialize VoIP engine |
| `.call(number, audio?, opts?)` | Place call → `WhatsAppCall` |
| `.disconnect()` | Release resources |

### `WhatsAppCall`

| Member | Description |
|--------|-------------|
| `.callId` | Unique call ID |
| `.state` | Current `CallState` |
| `.end()` | Hang up |
| `.mute(bool)` | Mute/unmute mic |
| `.sendVideoFrame(buf, w, h)` | Send raw video frame (YUV/NV12) |
| `.waitForEnd()` | Promise → end reason |
| `.on('ringing', fn)` | Remote ringing |
| `.on('connected', fn)` | Call answered |
| `.on('audio', fn(pcm))` | Remote audio as `Float32Array` |
| `.on('videoFrame', fn(frame))` | Remote video frame |
| `.on('ended', fn(reason))` | Call ended |
| `.on('error', fn(err))` | Fatal error |

### Helpers

| Function | Description |
|----------|-------------|
| `downloadAudio(quoted)` | Download audio from serialized quoted message → `Buffer` |
| `isAudioMessage(quoted)` | Check if quoted message is audio |

## Call options

```ts
const call = await caller.call('521234567890', audioBuffer, {
  durationMs: 60_000,       // auto-hangup after N ms (default 120000)
  isVideo: true,             // enable video call (send frames via sendVideoFrame)
});
```

- `audio` — `Buffer`, file path, or `null`/omit for silence
- `durationMs` — auto-hangup after N ms
- `isVideo` — enable video call mode

## Phone number normalization

Numbers are automatically normalized for country formats:

| Country | Input | Normalized |
|---------|-------|------------|
| Mexico  | `522234567890` | `5212234567890` |
| Argentina | `541123456789` | `5491123456789` |
| Colombia | `3221234567` | `573221234567` |

Fallback: raw input is tried if normalization fails.

## Config

```ts
// Reuse bot's socket (no QR)
const caller = new WhatsAppCaller({ sock, baileys });

// Standalone (QR on first run, auth saved to ./caller_auth)
const caller = new WhatsAppCaller({ authDir: './caller_auth' });
```

## Stability

- **Timer drift compensation** — audio feeder uses wall-clock baseline to avoid drift
- **Graceful cleanup** — playback interval is `unref`'d, capture buffers freed on re-init
- **Error resilience** — `onChunk` errors stop the feeder instead of leaking ffmpeg
- **Video memory** — WASM heap freed after each video frame via `videoFrameConsumed`
- **Event hygiene** — `uncaughtException` handler per-reconnect, no global `removeAllListeners`
- **Defensive checks** — null-safe `creds.me`, debug logging on silent catch blocks

## How it works

1. **Baileys** handles WhatsApp auth and signaling stanzas.
2. **WASM VoIP stack** (WhatsApp Web's official binary) runs in-process.
3. **Worker thread pool** mirrors browser Web Workers for pthreads.
4. **Audio** is decoded/resampled with ffmpeg, encoded with Opus, sent over RTP/SRTP.
5. **Video** frames are pushed to the WASM worker pipeline, encoded with H.264, streamed over SRTP.

## Requirements

- Node.js ≥ 20
- `ffmpeg` on `PATH`
- A linked WhatsApp account

## License

MIT
