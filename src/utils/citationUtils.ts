import type { CitationOption } from '../types';

// Extended type for citation styles with descriptions
export interface CitationStyleWithDescription extends CitationOption {
  description?: string;
}

/**
 * Load top/popular citation styles from local JSON
 * @returns Promise with array of citation style objects
 */
export async function loadTopCitationStyles(): Promise<CitationStyleWithDescription[]> {
  try {
    const res = await fetch('/top-citation-styles.json');
    if (!res.ok) throw new Error(`Failed to load top citation styles: ${res.status}`);
    
    const data = await res.json();
    
    if (!data.topStyles || !Array.isArray(data.topStyles)) {
      throw new Error('Invalid top citation styles format');
    }
    
    return data.topStyles;
  } catch (error) {
    console.error("Error loading top citation styles:", error);
    // Fallback to basic styles if loading fails
    return [
      { id: 'apa', name: 'APA (American Psychological Association)', description: 'Psychology, social sciences, education, business' },
      { id: 'harvard1', name: 'Harvard', description: 'Business, social sciences, natural sciences' },
      { id: 'vancouver', name: 'Vancouver', description: 'Medicine, life sciences, biomedical research' },
      { id: 'ieee', name: 'IEEE', description: 'Engineering, computer science, electronics, technology' },
      { id: 'chicago-fullnote-bibliography', name: 'Chicago Notes & Bibliography', description: 'History, literature, arts, philosophy' },
      { id: 'modern-language-association', name: 'MLA (Modern Language Association)', description: 'Literature, humanities, arts, language studies' },
      { id: 'nature', name: 'Nature', description: 'Natural sciences, multidisciplinary research' },
      { id: 'american-medical-association', name: 'AMA (American Medical Association)', description: 'Medicine, healthcare' },
    ];
  }
}

/**
 * Load all available citation styles from local JSON
 * @returns Promise with array of citation style objects
 */
export async function loadAllCitationStyles(): Promise<CitationOption[]> {
  try {
    const res = await fetch('/citation-styles.json');
    if (!res.ok) throw new Error(`Failed to load citation styles: ${res.status}`);
    
    const data = await res.json();
    
    if (!data.message || !Array.isArray(data.message.items)) {
      throw new Error('Invalid citation styles format');
    }
    
    // Convert string IDs to CitationOption objects with pretty names
    return data.message.items.map((id: string) => ({
      id,
      name: formatStyleName(id)
    }));
  } catch (error) {
    console.error("Error loading all citation styles:", error);
    // Fallback to top styles if loading fails
    const topStyles = await loadTopCitationStyles();
    return topStyles.map(style => ({ id: style.id, name: style.name }));
  }
}

/**
 * Fetch citation styles (uses top styles by default, can load all if needed)
 * @param loadAll Whether to load all available styles or just top ones
 * @returns Promise with array of citation style objects
 */
export async function fetchCslStyles(loadAll: boolean = false): Promise<CitationOption[]> {
  if (loadAll) {
    return await loadAllCitationStyles();
  } else {
    const topStyles = await loadTopCitationStyles();
    return topStyles.map(style => ({ id: style.id, name: style.name }));
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