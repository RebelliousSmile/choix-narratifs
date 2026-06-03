/* tslint:disable */
/* eslint-disable */

/**
 * Façade JS du moteur. Un objet = une session.
 */
export class WasmEngine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Reprend une session depuis un snapshot (`Uint8Array`).
     */
    static fromSnapshot(snapshot: Uint8Array): WasmEngine;
    /**
     * Nouvelle session sur la scène d'amorce (Phase 1 : le docker).
     */
    constructor();
    /**
     * Directeur → paquet canon-free. Retourne `{"packet":…,"n":…}` en JSON.
     */
    prepare(action: string): string;
    /**
     * Verifier → tri des candidats. Retourne l'`Outcome` en JSON :
     * `{"outcome":"commit",…}` ou `{"outcome":"resample_needed",…}`.
     */
    resolve(candidates: string[]): string;
    /**
     * Ce que le joueur sait à cet instant (`string[]`).
     */
    savoirJoueur(): string[];
    /**
     * Sérialise l'état pour persistance (IndexedDB / bucket).
     */
    snapshot(): Uint8Array;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_wasmengine_free: (a: number, b: number) => void;
    readonly wasmengine_fromSnapshot: (a: number, b: number) => number;
    readonly wasmengine_new: () => number;
    readonly wasmengine_prepare: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmengine_resolve: (a: number, b: number, c: number) => [number, number, number, number];
    readonly wasmengine_savoirJoueur: (a: number) => [number, number];
    readonly wasmengine_snapshot: (a: number) => [number, number];
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
