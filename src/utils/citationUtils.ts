import type { CitationOption } from '../types';

/**
 * Fetch all available CSL styles from Crossref API
 * @returns Promise with array of citation style objects
 */
export async function fetchCslStyles(): Promise<CitationOption[]> {
  try {
    const res = await fetch('https://api.crossref.org/styles');
    if (!res.ok) throw new Error(`Crossref styles endpoint: ${res.status}`);
    
    type ApiShape = {
      status: string;
      "message-type": string;
      "message-version": string;
      message: {
        "total-results": number;
        items: string[];
      };
    };
    
    const data: ApiShape = await res.json();
    
    if (data.status !== "ok" || !Array.isArray(data.message.items)) {
      throw new Error('Invalid response format from Crossref API');
    }
    
    // Convert string IDs to CitationOption objects with pretty names
    return data.message.items.map(id => ({
      id,
      name: formatStyleName(id)
    }));
  } catch (error) {
    console.error("Error fetching CSL styles from Crossref:", error);
    // Fallback to basic styles if API fails
    return [
      { id: 'apa', name: 'American Psychological Association 7th edition' },
      { id: 'harvard1', name: 'Harvard - author-date' },
      { id: 'vancouver', name: 'Vancouver' },
      { id: 'ieee', name: 'Institute of Electrical and Electronics Engineers' },
      { id: 'chicago-fullnote-bibliography', name: 'Chicago Manual of Style' },
      { id: 'modern-language-association', name: 'Modern Language Association' },
      { id: 'nature', name: 'Nature' },
      { id: 'science', name: 'Science' },
    ];
  }
}

/**
 * Get standard citation output formats supported by DOI content negotiation
 * @returns Array of citation format objects
 */
export function getCitationFormats(): CitationOption[] {
  return [
    { id: 'application/x-bibtex', name: 'BibTeX (.bib)' },
    { id: 'application/x-research-info-systems', name: 'RIS (.ris)' },
    { id: 'application/vnd.citationstyles.csl+json', name: 'CSL JSON (.json)' },
    { id: 'application/rdf+xml', name: 'RDF XML (.rdf)' },
    { id: 'text/turtle', name: 'Turtle RDF (.ttl)' },
    { id: 'application/vnd.crossref.unixref+xml', name: 'Crossref XML (.xml)' },
  ];
}

/**
 * Map format IDs to file extensions
 */
export function formatStyleName(styleId: string): string {
  // Convert style ID to a readable format
  // e.g., "academy-of-management-review" → "Academy of Management Review"
  return styleId
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Map format IDs to file extensions
 */
export const FORMAT_EXTENSIONS: Record<string, string> = {
  'application/x-bibtex': '.bib',
  'application/x-research-info-systems': '.ris',
  'application/vnd.citationstyles.csl+json': '.json',
  'application/rdf+xml': '.rdf',
  'text/turtle': '.ttl',
  'application/vnd.crossref.unixref+xml': '.xml',
  'text/x-bibliography': '.txt',
};

/**
 * Get file extension for a format
 */
export function getFormatExtension(format: string): string {
  return FORMAT_EXTENSIONS[format] || '.txt';
}