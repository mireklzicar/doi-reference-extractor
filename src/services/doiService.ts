import axios from 'axios';
import type { Reference, DoiReference, CitationFormat } from '../types';
import { convertDoiToCitation as convertCitation, fetchDoiMetadata as fetchMetadata } from './citationService';

/**
 * Clean DOI by removing 'doi:' prefix if present
 * @param doi DOI string to clean
 * @returns Cleaned DOI string
 */
export const cleanDoi = (doi: string): string => {
  return doi.replace(/^doi:/i, '').trim();
};

/**
 * Get references for a given DOI from OpenCitations API
 * @param doi DOI identifier
 * @returns Promise with list of reference objects, or null if request fails
 */
export const getReferences = async (doi: string): Promise<Reference[] | null> => {
  const cleanedDoi = cleanDoi(doi);
  // Use proxy path that works for both Vite dev and nginx production
  const url = `/api/references/doi:${cleanedDoi}`;

  try {
    console.log(`Fetching references via proxy: ${url}`);
    const response = await axios.get(url);
    return response.data as Reference[];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Error fetching references for DOI ${doi}:`, {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        url: url,
        fullUrl: window.location.origin + url
      });
    } else {
      console.error(`Unexpected error fetching references for DOI ${doi}:`, error);
    }
    return null;
  }
};

/**
 * Extract cited DOIs from OpenCitations reference data
 * @param references List of reference objects from OpenCitations
 * @returns List of extracted DOI strings
 */
export const extractCitedDois = (references: Reference[]): string[] => {
  const dois: string[] = [];

  for (const ref of references) {
    if (ref.cited) {
      const parts = ref.cited.split(' ');
      for (const part of parts) {
        if (part.startsWith('doi:')) {
          const doi = part.replace('doi:', '');
          dois.push(doi);
          break; // Only take first DOI per reference
        }
      }
    }
  }

  return dois;
};

/**
 * Fetch metadata for a list of DOIs to get titles, authors, years, etc.
 * @param dois List of DOI strings
 * @returns Promise with list of DOI reference objects
 */
export const fetchDoiMetadata = async (dois: string[]): Promise<DoiReference[]> => {
  return await fetchMetadata(dois);
};

/**
 * Convert a DOI to various citation formats
 * @param doi DOI to convert
 * @param format Target citation format
 * @param style Citation style (for plain text citations)
 * @returns Promise with citation string
 */
export const convertDoiToCitation = async (
  doi: string,
  format: CitationFormat | string = 'bibtex',
  style?: string
): Promise<string> => {
  return await convertCitation(doi, format, style);
};

/**
 * Get a human-readable filename for a DOI reference
 * @param doiRef DOI reference object with metadata
 * @returns Sanitized filename string
 */
export const getFilenameFromDoiRef = (doiRef: DoiReference): string => {
  let filename = '';
  
  // Add first author surname if available
  if (doiRef.authors && doiRef.authors.length > 0) {
    const firstAuthor = doiRef.authors[0].split(',')[0]; // Just the surname
    filename += firstAuthor;
  }
  
  // Add year if available
  if (doiRef.year) {
    filename += (filename ? '_' : '') + doiRef.year;
  }
  
  // Add short version of title if available
  if (doiRef.title) {
    const shortTitle = doiRef.title
      .split(' ')
      .slice(0, 3)
      .join(' ')
      .toLowerCase()
      .replace(/[^\w\s]/gi, '');
      
    filename += (filename ? '_' : '') + shortTitle;
  }
  
  // If we have nothing so far, use the DOI as filename
  if (!filename) {
    filename = doiRef.doi.replace(/[/.:]/g, '_');
  }
  
  // Sanitize filename
  filename = filename.replace(/[^a-z0-9_-]/gi, '_').replace(/_+/g, '_');
  
  return filename;
};