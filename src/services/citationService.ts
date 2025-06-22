import { Cite } from '@citation-js/core';
import '@citation-js/plugin-bibtex';
import '@citation-js/plugin-doi';
import '@citation-js/plugin-ris';
import '@citation-js/plugin-csl';

/**
 * Convert a DOI to a specific citation format
 * @param doi DOI to convert
 * @param format Citation format 
 * @param style Citation style for text format
 * @returns Promise with citation string
 */
export async function convertDoiToCitation(
  doi: string, 
  format: string = 'bibtex',
  style?: string
): Promise<string> {
  try {
    // Create a new citation
    const cite = await Cite.async(doi);
    
    // Process the format request
    if (format === 'bibtex') {
      return cite.format('bibtex');
    } else if (format === 'ris') {
      return cite.format('ris');
    } else if (format === 'endnote') {
      return cite.format('bibliography', { format: 'json', type: 'endnote' });
    } else if (format === 'refworks') {
      return cite.format('bibliography', { format: 'json', type: 'refworks' });
    } else {
      // Format as bibliography with specified style
      return cite.format('bibliography', {
        format: 'text',
        template: style || 'apa'
      });
    }
  } catch (error) {
    console.error(`Error converting DOI ${doi} to format ${format}:`, error);
    return `Error: Could not convert DOI ${doi} to ${format} format`;
  }
}

/**
 * Get paper metadata from a DOI
 * @param doi DOI string
 * @returns Promise with paper metadata
 */
export async function getPaperMetadata(doi: string) {
  try {
    const cite = await Cite.async(doi);
    return cite.data[0] || null;
  } catch (error) {
    console.error(`Error fetching metadata for DOI ${doi}:`, error);
    return null;
  }
}

/**
 * Fetch metadata for a list of DOIs to get titles, authors, years, etc.
 * @param dois List of DOI strings
 * @returns Promise with list of DOI reference objects
 */
export async function fetchDoiMetadata(dois: string[]) {
  const doiRefs = [];

  const fetchPromises = dois.map(async (doi) => {
    try {
      const metadata = await getPaperMetadata(doi);
      
      if (!metadata) {
        return { doi };
      }
      
      return {
        doi,
        title: metadata.title,
        authors: metadata.author?.map((author: { family?: string; given?: string }) => 
          `${author.family || ''}${author.given ? ', ' + author.given : ''}`
        ),
        year: metadata.issued?.['date-parts']?.[0]?.[0]?.toString()
      };
    } catch (error) {
      console.error(`Error fetching metadata for DOI ${doi}:`, error);
      return { doi };
    }
  });

  const results = await Promise.allSettled(fetchPromises);
  
  for (const result of results) {
    if (result.status === 'fulfilled') {
      doiRefs.push(result.value);
    }
  }

  return doiRefs;
}