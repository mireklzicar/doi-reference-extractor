/**
 * Types for the DOI References application
 */

// Type for a reference item from OpenCitations API
export interface Reference {
  citing: string;
  cited: string;
  journal_sc: string;
  timespan: string;
  oci: string;
  author_sc: string;
  creation: string;
}

// Type for DOI reference data
export interface DoiReference {
  doi: string;
  title?: string;
  authors?: string[];
  year?: string;
}

// Type for citation formats
export type CitationFormat = 'bibtex' | 'ris' | 'endnote' | 'refworks';

// Type for citation styles
export interface CitationStyle {
  id: string;
  name: string;
}

// Type for download options
export interface DownloadOptions {
  format: CitationFormat | string;
  isPlainText: boolean;
}