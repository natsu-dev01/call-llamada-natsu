import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { VoipClient } from '../vendor/index.mjs';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
// ── Error ──
export class WhatsAppCallError extends Error {
    cause;
    name = 'WhatsAppCallError';
    constructor(message, cause) {
        super(message);
        this.cause = cause;
    }
}
export class WhatsAppCall {
    call;
    constructor(call) {
        this.call = call;
    }
    get callId() { return this.call.callId; }
    get state() { return this.call.state; }
    end() { this.call.end(); }
    mute(muted) { this.call.mute(muted); }
    waitForEnd() { return this.call.waitForEnd(); }
    on(event, handler) {
        this.call.on(event, handler);
        return this;
    }
    once(event, handler) {
        this.call.once(event, handler);
        return this;
    }
    off(event, handler) {
        this.call.off(event, handler);
        return this;
    }
}
// ── Main class ──
export class WhatsAppCaller {
    config;
    client = null;
    _connected = false;
    constructor(config) {
        this.config = config;
    }
    get connected() {
        return this._connected;
    }
    async connect() {
        if (this._connected)
            return;
        try {
            this.client = new VoipClient(this.config);
            await this.client.connect();
            this._connected = true;
        }
        catch (err) {
            throw new WhatsAppCallError('Failed to connect VoIP engine', err);
        }
    }
    async call(phoneNumber, audio, opts) {
        if (!this._connected || !this.client) {
            throw new WhatsAppCallError('Not connected. Call connect() first.');
        }
        const number = String(phoneNumber).replace(/\D/g, '');
        let audioSource;
        let isTemp = false;
        if (audio === null || audio === undefined) {
            audioSource = 'silence';
        }
        else if (typeof audio === 'string') {
            audioSource = audio;
        }
        else if (Buffer.isBuffer(audio)) {
            const tmpDir = join(process.cwd(), 'tmp');
            await mkdir(tmpDir, { recursive: true }).catch(() => { });
            audioSource = join(tmpDir, `call-${Date.now()}.wav`);
            await writeFile(audioSource, audio);
            isTemp = true;
        }
        else {
            throw new WhatsAppCallError('audio must be a Buffer, file path, or null for silence');
        }
        try {
            const call = await this.client.call(number, {
                audioSource,
                durationMs: opts?.durationMs ?? 120_000,
            });
            call.on('ended', () => {
                if (isTemp)
                    unlink(audioSource).catch(() => { });
            });
            return new WhatsAppCall(call);
        }
        catch (err) {
            if (isTemp)
                unlink(audioSource).catch(() => { });
            throw new WhatsAppCallError(`Call to ${number} failed`, err);
        }
    }
    disconnect() {
        try {
            this.client?.disconnect();
        }
        catch { /* ignore */ }
        this._connected = false;
        this.client = null;
    }
}
// ── Helpers ──
export async function downloadAudio(quoted) {
    const msg = quoted.msg;
    if (!msg?.mimetype?.startsWith('audio/')) {
        throw new WhatsAppCallError('No audio content to download');
    }
    const stream = await downloadContentFromMessage(msg, 'audio');
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
}
export function isAudioMessage(quoted) {
    if (!quoted)
        return false;
    return quoted.type === 'audioMessage' || (quoted.msg?.mimetype?.startsWith('audio/') ?? false);
}
//# sourceMappingURL=index.js.map