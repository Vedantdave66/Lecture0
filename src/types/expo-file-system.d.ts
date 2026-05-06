declare module 'expo-file-system' {
  export class Directory {
    constructor(...paths: Array<Directory | string>);
    exists: boolean;
    uri: string;
    create(options?: { idempotent?: boolean; intermediates?: boolean; overwrite?: boolean }): void;
  }

  export class File {
    constructor(...paths: Array<Directory | File | string>);
    exists: boolean;
    uri: string;
    create(options?: { overwrite?: boolean; intermediates?: boolean }): void;
    write(content: string | Uint8Array | ArrayBuffer): void;
  }

  export const Paths: {
    cache: Directory;
    document: Directory;
  };
}
