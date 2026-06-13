export interface QuotedMsg {
    type?: string;
    msg?: Record<string, unknown> & {
        mimetype?: string;
    };
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
export declare class WhatsAppCallError extends Error {
    cause?: unknown | undefined;
    name: "WhatsAppCallError";
    constructor(message: string, cause?: unknown | undefined);
}
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
export declare class WhatsAppCall {
    private call;
    constructor(call: BaileysCall);
    get callId(): string;
    get state(): number;
    end(): void;
    mute(muted: boolean): void;
    waitForEnd(): Promise<CallEndReason>;
    on(event: string, handler: (...args: unknown[]) => void): this;
    once(event: string, handler: (...args: unknown[]) => void): this;
    off(event: string, handler: (...args: unknown[]) => void): this;
}
export declare class WhatsAppCaller {
    private config;
    private client;
    private _connected;
    constructor(config: CallerConfig);
    get connected(): boolean;
    connect(): Promise<void>;
    call(phoneNumber: string, audio?: Buffer | string | null, opts?: CallOptions): Promise<WhatsAppCall>;
    disconnect(): void;
}
export declare function downloadAudio(quoted: QuotedMsg): Promise<Buffer>;
export declare function isAudioMessage(quoted: QuotedMsg | null | undefined): boolean;
export {};
//# sourceMappingURL=index.d.ts.map