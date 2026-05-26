declare module 'json2csv' {
  export class Parser<T = Record<string, unknown>> {
    constructor(options?: Record<string, unknown>);
    parse(data: T | T[]): string;
  }
}
