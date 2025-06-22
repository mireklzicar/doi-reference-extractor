
/**
 * Convert a DOI to a specific citation format using Crossref DOI Content-Negotiation API
 * @param doi DOI to convert
 * @param format Citation format (MIME type) or style ID
 * @param style Citation style for text format
 * @returns Promise with citation string
 */
export async function convertDoiToCitation(
  doi: string,
  format: string = 'application/x-bibtex',
  style?: string
): Promise<string> {
  try {
    const cleanedDoi = doi.replace(/^doi:/i, '').trim();
    const url = `https://doi.org/${cleanedDoi}`;
    
    let headers: Record<string, string>;
    
    // Determine if this is a style-based citation (plain text)
    if (style || (!format.includes('/'))) {
      // Text bibliography with specified style
      const styleId = style || format;
      headers = {
        'Accept': `text/x-bibliography; style=${styleId}; locale=en-US`
      };
    } else {
      // Format-based citation
      headers = {
        'Accept': format
      };
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error converting DOI ${doi} to format ${format}:`, error);
    return `Error: Could not convert DOI ${doi} to ${format} format`;
  }
}

/**
 * Get paper metadata from a DOI using Crossref API
 * @param doi DOI string
 * @returns Promise with paper metadata
 */
export async function getPaperMetadata(doi: string) {
  try {
    const cleanedDoi = doi.replace(/^doi:/i, '').trim();
    const url = `https://doi.org/${cleanedDoi}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.citationstyles.csl+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const metadata = await response.json();
    return metadata;
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