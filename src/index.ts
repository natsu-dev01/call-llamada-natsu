import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { VoipClient } from '../vendor/index.mjs';
import type { VoipSdkConfig } from '../vendor/types.d.mts';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

// ── Types ──

export interface QuotedMsg {
  type?: string;
  msg?: Record<string, unknown> & { mimetype?: string };
}

export interface CallOptions {
  durationMs?: number;
}

export interface CallerConfig {
  sock?: object;
  baileys?: object;
  authDir?: string;
}

export type CallEndReason = string;
export type AudioFrame = Float32Array;

// ── Error ──

export class WhatsAppCallError extends Error {
  override name = 'WhatsAppCallError' as const;
  constructor(message: string, public cause?: unknown) {
    super(message);
  }
}

// ── ActiveCall wrapper ──

interface BaileysCall {
  callId: string;
  state: number;
  end(): void;
  mute(muted: boolean): void;
  waitForEnd(): Promise<CallEndReason>;
  on(event: string, handler: (...args: unknown[]) => void): void;
  once(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

export class WhatsAppCall {
  constructor(private call: BaileysCall) {}

  get callId(): string { return this.call.callId; }
  get state(): number { return this.call.state; }
  end(): void { this.call.end(); }
  mute(muted: boolean): void { this.call.mute(muted); }
  waitForEnd(): Promise<CallEndReason> { return this.call.waitForEnd(); }

  on(event: string, handler: (...args: unknown[]) => void): this {
    this.call.on(event, handler);
    return this;
  }
  once(event: string, handler: (...args: unknown[]) => void): this {
    this.call.once(event, handler);
    return this;
  }
  off(event: string, handler: (...args: unknown[]) => void): this {
    this.call.off(event, handler);
    return this;
  }
}

// ── Main class ──

export class WhatsAppCaller {
  private client: any = null;
  private _connected = false;

  constructor(private config: CallerConfig) {}

  get connected(): boolean {
    return this._connected;
  }

  async connect(): Promise<void> {
    if (this._connected) return;
    try {
      this.client = new (VoipClient as any)(this.config as VoipSdkConfig);
      await this.client.connect();
      this._connected = true;
    } catch (err) {
      throw new WhatsAppCallError('Failed to connect VoIP engine', err);
    }
  }

  async call(
    phoneNumber: string,
    audio?: Buffer | string | null,
    opts?: CallOptions,
  ): Promise<WhatsAppCall> {
    if (!this._connected || !this.client) {
      throw new WhatsAppCallError('Not connected. Call connect() first.');
    }

    const number = String(phoneNumber).replace(/\D/g, '');
    let audioSource: string;
    let isTemp = false;

    if (audio === null || audio === undefined) {
      audioSource = 'silence';
    } else if (typeof audio === 'string') {
      audioSource = audio;
    } else if (Buffer.isBuffer(audio)) {
      const tmpDir = join(process.cwd(), 'tmp');
      await mkdir(tmpDir, { recursive: true }).catch(() => {});
      audioSource = join(tmpDir, `call-${Date.now()}.wav`);
      await writeFile(audioSource, audio);
      isTemp = true;
    } else {
      throw new WhatsAppCallError('audio must be a Buffer, file path, or null for silence');
    }

    try {
      const call: BaileysCall = await this.client.call(number, {
        audioSource,
        durationMs: opts?.durationMs ?? 120_000,
      });

      call.on('ended', () => {
        if (isTemp) unlink(audioSource).catch(() => {});
      });

      return new WhatsAppCall(call);
    } catch (err) {
      if (isTemp) unlink(audioSource).catch(() => {});
      throw new WhatsAppCallError(`Call to ${number} failed`, err);
    }
  }

  disconnect(): void {
    try { this.client?.disconnect(); } catch { /* ignore */ }
    this._connected = false;
    this.client = null;
  }
}

// ── Helpers ──

export async function downloadAudio(quoted: QuotedMsg): Promise<Buffer> {
  const mimetype = quoted.msg?.mimetype;
  if (!mimetype) throw new WhatsAppCallError('No audio content to download');
  const stream = await downloadContentFromMessage(
    { mimetype } as never,
    'audio',
  );
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export function isAudioMessage(quoted: QuotedMsg | null | undefined): boolean {
  if (!quoted) return false;
  return quoted.type === 'audioMessage' || (quoted.msg?.mimetype?.startsWith('audio/') ?? false);
}
