# call-llamada

WhatsApp voice call module — wraps the official WhatsApp Web VoIP WASM stack for Node.js.

```ts
import { WhatsAppCaller, downloadAudio, isAudioMessage } from 'call-llamada';

const caller = new WhatsAppCaller({ sock, baileys });
await caller.connect();

const call = await caller.call('521234567890', audioBuffer);

call.on('ringing',   () => console.log('📞 Ringing'));
call.on('connected', () => console.log('✅ Connected'));
call.on('ended',     (r) => console.log('❖ Ended:', r));

await call.waitForEnd();
caller.disconnect();
```

## Features

- **Outbound 1:1 voice calls** — stream MP3/WAV or silence
- **Reuse existing Baileys socket** — no QR, no secondary account
- **Standalone mode** — own socket with `authDir`
- **Full call control** — `mute()`, `end()`, `durationMs`, `callId`
- **Receive remote audio** — `Float32Array` via `audio` event
- **TypeScript** — full type definitions

## Install

```bash
npm install call-llamada
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
| `.mute(bool)` | Mute/unmute |
| `.waitForEnd()` | Promise → end reason |
| `.on('ringing', fn)` | Remote ringing |
| `.on('connected', fn)` | Call answered |
| `.on('audio', fn(pcm))` | Remote audio as `Float32Array` |
| `.on('ended', fn(reason))` | Call ended |
| `.on('error', fn(err))` | Fatal error |

### Helpers

| Function | Description |
|----------|-------------|
| `downloadAudio(quoted)` | Download audio from serialized quoted message → `Buffer` |
| `isAudioMessage(quoted)` | Check if quoted message is audio |

## Call options

```ts
caller.call('521234567890', audioBuffer, { durationMs: 60_000 });
```

- `audio` — `Buffer`, file path, or `null`/omit for silence
- `durationMs` — auto-hangup after N ms (default 120000)

## Config

```ts
// Reuse bot's socket (no QR)
const caller = new WhatsAppCaller({ sock, baileys });

// Standalone (QR on first run, auth saved to ./caller_auth)
const caller = new WhatsAppCaller({ authDir: './caller_auth' });
```

## How it works

1. **Baileys** handles WhatsApp auth and signaling stanzas.
2. **WASM VoIP stack** (WhatsApp Web's official binary) runs in-process.
3. **Worker thread pool** mirrors browser Web Workers for pthreads.
4. **Audio** is decoded/resampled with ffmpeg, encoded with Opus, sent over RTP/SRTP.

## Requirements

- Node.js ≥ 20
- `ffmpeg` on `PATH`
- A linked WhatsApp account

## License

MIT
