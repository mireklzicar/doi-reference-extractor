declare module '@citation-js/core' {
  export class Cite {
    constructor(data: string | object);
    static async(data: string | object): Promise<Cite>;
    data: Array<{
      title?: string;
      author?: Array<{
        family?: string;
        given?: string;
      }>;
      issued?: {
        'date-parts'?: Array<Array<number>>;
      };
      [key: string]: unknown;
    }>;
    format(format: string, options?: { format?: string; template?: string; type?: string }): string;
  }
}

declare module '@citation-js/plugin-bibtex' {}

declare module '@citation-js/plugin-doi' {}