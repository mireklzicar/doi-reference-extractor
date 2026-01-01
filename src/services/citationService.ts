
/**
 * Convert a DOI to a specific citation format using Crossref DOI Content-Negotiation API
 * @param doi DOI to convert
 * @param format Citation format (MIME type) or style ID
 * @param style Citation style for text format
 * @returns Promise with citation string
 */
function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function mapWithConcurrency<TItem, TResult>(
  items: TItem[],
  concurrency: number,
  mapper: (item: TItem, index: number) => Promise<TResult>,
  onItemDone?: (completed: number, total: number) => void
): Promise<TResult[]> {
  const results: TResult[] = new Array(items.length);
  let nextIndex = 0;
  let completed = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      completed += 1;
      onItemDone?.(completed, items.length);
    }
  });

  await Promise.all(workers);
  return results;
}

async function fetchWithRetry(url: string, init: RequestInit, maxRetries: number = 6): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, init);

      if (res.status !== 429 && res.status !== 503 && res.status !== 504) {
        return res;
      }

      if (attempt === maxRetries) {
        return res;
      }

      const retryAfterHeader = res.headers.get('Retry-After');
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
      const baseDelayMs = Number.isFinite(retryAfterSeconds)
        ? Math.max(0, retryAfterSeconds) * 1000
        : 750 * Math.pow(2, attempt);

      await sleep(baseDelayMs + Math.floor(Math.random() * 250));
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries) break;
      await sleep(750 * Math.pow(2, attempt) + Math.floor(Math.random() * 250));
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to fetch');
}

export async function convertDoiToCitation(
  doi: string,
  format: string = 'application/x-bibtex',
  style?: string
): Promise<string> {
  try {
    const cleanedDoi = doi.replace(/^doi:/i, '').trim();
    const url = `/api/crossref/v1/works/${encodeURIComponent(cleanedDoi)}/transform`;
    
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
    
    const response = await fetchWithRetry(url, { headers });
    
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
    const url = `/api/crossref/v1/works/${encodeURIComponent(cleanedDoi)}/transform`;
    
    const response = await fetchWithRetry(url, {
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
export type FetchDoiMetadataOptions = {
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
};

export async function fetchDoiMetadata(dois: string[], options: FetchDoiMetadataOptions = {}) {
  const concurrency = options.concurrency ?? 2;

  const results = await mapWithConcurrency(dois, concurrency, async (doi) => {
    try {
      const metadata = await getPaperMetadata(doi);

      if (!metadata) {
        return { doi };
      }

      return {
        doi,
        csl: metadata,
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
  }, options.onProgress);

  return results;
}
