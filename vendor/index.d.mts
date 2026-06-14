/**
 * natsu-call — WhatsApp voice calling for Node.js.
 *
 * Wraps WhatsApp Web's official VoIP WASM stack and routes signaling through
 * Baileys. Public surface:
 *
 *   const client = new VoipClient({ authDir })
 *   await client.connect()
 *   const call = await client.call("12345678901", { audioSource: "./hi.mp3" })
 *
 * @author NatsuDev
 */
import { EventEmitter } from "node:events";
import { WasmEngine } from "./wasm-engine.mjs";
import { CallState, type VoipSdkConfig } from "./types.mjs";
export type { VoipSdkConfig, CallOptions, CallEvents, AudioConfig, VideoFrame } from "./types.mjs";
export { CallState } from "./types.mjs";
/** A live or recently-ended call. */
export declare class ActiveCall extends EventEmitter {
    #private;
    readonly callId: string;
    private readonly engine;
    /** @internal mirrors the source path for the audio feeder */
    _audioSource: string;
    /** @internal whether video is enabled */
    _videoEnabled: boolean;
    constructor(callId: string, engine: WasmEngine, durationMs: number);
    get state(): CallState;
    end: () => void;
    mute: (muted: boolean) => void;
    sendVideoFrame: (frameBuffer: ArrayBufferView | ArrayBuffer, width: number, height: number, options?: {
        fps?: number;
        format?: number;
        orientation?: number;
        timestamp?: number;
    }) => void;
    waitForEnd: () => Promise<string>;
    /** @internal — called by VoipClient on WASM call-state change */
    _updateState: (state: number) => void;
    /** @internal */
    _emitAudio: (pcm: Float32Array) => void;
    /** @internal */
    _emitVideoFrame: (frame: any) => void;
    /** @internal */
    _forceEnd: (reason: string) => void;
    on(event: "videoFrame", listener: (frame: import("./types.mjs").VideoFrame) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
}
/** Top-level client. Connects to WhatsApp and lets you place calls. */
export declare class VoipClient {
    #private;
    constructor(config: VoipSdkConfig);
    /** Connect to WhatsApp and bring up the WASM VoIP stack. */
    connect: () => Promise<void>;
    /** Place an outbound voice call. */
    call: (phoneNumber: string, opts?: {
        audioSource?: string;
        durationMs?: number;
        isVideo?: boolean;
        videoSource?: string;
    }) => Promise<ActiveCall>;
    /** Tear down the WhatsApp socket and release resources. */
    disconnect: () => void;
}
