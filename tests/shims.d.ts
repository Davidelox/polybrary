// Declaraciones mínimas para no añadir @types/node ni @types/pngjs (solo las usa el test de fotogramas).
declare module 'node:crypto' {
  export function createHash(alg: string): { update(d: Uint8Array): { digest(enc: 'hex'): string } };
}
declare module 'node:fs' {
  export function mkdirSync(p: string, o?: { recursive: boolean }): void;
  export function readFileSync(p: string, enc: 'utf8'): string;
  export function writeFileSync(p: string, d: string | Uint8Array): void;
}
declare module 'pngjs' {
  export class PNG {
    constructor(o: { width: number; height: number });
    data: Uint8Array;
    static sync: { write(p: PNG): Uint8Array };
  }
}
declare const process: { env: Record<string, string | undefined> };
