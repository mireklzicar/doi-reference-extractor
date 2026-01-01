import { useState } from 'react';
import type { DoiReference, DownloadOptions } from '../types';
import { getReferences, extractCitedDois, fetchDoiMetadata, convertDoiToCitation, getFilenameFromDoiRef } from '../services/doiService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FORMAT_EXTENSIONS } from '../utils/citationUtils';
import { cslToBibtex, cslToRis } from '../utils/cslFormatters';

export interface DoiReferencesState {
  isLoading: boolean;
  error: string | null;
  progress: number;
  mainDoi: string;
  paperTitle: string | null;
  references: DoiReference[];
  citationText: string;
  generatingCitations: boolean;
}

export function useDoiReferences() {
  const [state, setState] = useState<DoiReferencesState>({
    isLoading: false,
    error: null,
    progress: 0,
    mainDoi: '',
    paperTitle: null,
    references: [],
    citationText: '',
    generatingCitations: false
  });

  /**
   * Fetch references for a given DOI
   * @param doi DOI string to fetch references for
   */
  const fetchReferences = async (doi: string) => {
    // Reset state
    setState({
      isLoading: true,
      error: null,
      progress: 0,
      mainDoi: doi,
      paperTitle: null,
      references: [],
      citationText: '',
      generatingCitations: false
    });

    try {
      // Step 1: Get references from OpenCitations API
      const references = await getReferences(doi);
      
      if (!references || references.length === 0) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'No references found for this DOI.'
        }));
        return;
      }

      setState(prev => ({ ...prev, progress: 10 }));
      
      // Step 2: Extract cited DOIs
      const citedDois = extractCitedDois(references);
      
      if (citedDois.length === 0) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'No DOIs found in the references.'
        }));
        return;
      }
      
      setState(prev => ({ ...prev, progress: 20 }));
      
      // Step 3: Try to get paper title
      try {
        const { getPaperMetadata } = await import('../services/citationService');
        const mainPaperData = await getPaperMetadata(doi);
        const paperTitle = mainPaperData?.title || null;
        
        setState(prev => ({ 
          ...prev, 
          paperTitle,
          progress: 30
        }));
      } catch (error) {
        console.error('Error fetching main paper title:', error);
        // Continue even if we can't get the title
      }

      // Step 4: Fetch metadata for all cited DOIs
      setState(prev => ({ ...prev, progress: Math.max(prev.progress, 30) }));

      const PROGRESS_BASE = 30;
      const PROGRESS_MAX_DURING_METADATA = 95;
      const THROTTLE_MS = 120;

      let lastUiUpdate = 0;
      let lastCompleted = 0;
      let tickTimer: ReturnType<typeof setInterval> | undefined;

      // Prevent the bar from "looking stuck" before the first DOI resolves.
      tickTimer = setInterval(() => {
        setState(prev => {
          if (!prev.isLoading) return prev;
          const next = Math.min(PROGRESS_BASE + 8, prev.progress + 1);
          if (next <= prev.progress) return prev;
          return { ...prev, progress: next };
        });
      }, 700);

      const doiMetadata = await fetchDoiMetadata(citedDois, {
        concurrency: 2,
        onProgress: (completed, total) => {
          if (tickTimer) {
            clearInterval(tickTimer);
            tickTimer = undefined;
          }

          const now = Date.now();
          const minIncrement = total > 80 ? 5 : 1;
          const shouldThrottle =
            completed !== total &&
            now - lastUiUpdate < THROTTLE_MS &&
            completed - lastCompleted < minIncrement;

          if (shouldThrottle) return;

          lastUiUpdate = now;
          lastCompleted = completed;

          const ratio = total > 0 ? completed / total : 1;
          const nextProgress =
            PROGRESS_BASE + Math.round(ratio * (PROGRESS_MAX_DURING_METADATA - PROGRESS_BASE));

          setState(prev => ({
            ...prev,
            progress: Math.max(prev.progress, Math.min(PROGRESS_MAX_DURING_METADATA, nextProgress))
          }));
        }
      }).finally(() => {
        if (tickTimer) clearInterval(tickTimer);
      });
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        progress: 100,
        references: doiMetadata
      }));
    } catch (error) {
      console.error('Error in fetchReferences:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  };

  /**
   * Generate citations for all references in the specified format
   * @param options Format options
   */
  const generateCitations = async (options: DownloadOptions): Promise<string> => {
    const { format } = options;
    
    if (state.references.length === 0) {
      return '';
    }
    
    setState(prev => ({ ...prev, generatingCitations: true }));
    
    try {
      const citations: string[] = new Array(state.references.length);

      // For BibTeX/RIS, generate locally from CSL JSON metadata (much faster and avoids Crossref rate limits)
      if (format === 'application/x-bibtex' || format === 'application/x-research-info-systems') {
        for (let i = 0; i < state.references.length; i++) {
          const ref = state.references[i];
          try {
            if (ref.csl) {
              citations[i] = format === 'application/x-bibtex' ? cslToBibtex(ref.doi, ref.csl) : cslToRis(ref.csl);
            } else {
              citations[i] = await convertDoiToCitation(ref.doi, format);
            }
          } catch (error) {
            console.error(`Error converting DOI ${ref.doi}:`, error);
            citations[i] = `Error: Could not convert DOI ${ref.doi}`;
          }
        }
      } else {
        // For style-based/plain-text formats, use Crossref (throttle concurrency to reduce 429s)
        let nextIndex = 0;
        const concurrency = 1;

        const workers = Array.from({ length: concurrency }, async () => {
          while (nextIndex < state.references.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            const ref = state.references[currentIndex];
            try {
              citations[currentIndex] = await convertDoiToCitation(ref.doi, format);
            } catch (error) {
              console.error(`Error converting DOI ${ref.doi}:`, error);
              citations[currentIndex] = `Error: Could not convert DOI ${ref.doi}`;
            }
          }
        });

        await Promise.all(workers);
      }
      // Join all citations with double newlines
      const content = citations.join('\n\n');
      
      // Update the citation text in the state
      setState(prev => ({
        ...prev,
        citationText: content,
        generatingCitations: false
      }));
      
      return content;
    } catch (error) {
      console.error('Error generating citations:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error generating citations',
        generatingCitations: false
      }));
      return '';
    }
  };

  /**
   * Download references in the selected format
   * @param options Download options
   * @returns Promise with citation text content if available
   */
  const downloadReferences = async (options: DownloadOptions) => {
    const { format, isPlainText, singleFile = false } = options;
    
    if (state.references.length === 0) {
      return null;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, progress: 0 }));
      
      // Reuse the citation content if we already have it, or generate it
      let content = state.citationText;
      if (!content) {
        content = await generateCitations(options);
      }
      
      if (isPlainText || singleFile) {
        // Create file name
        const paperName = state.paperTitle
          ? state.paperTitle.slice(0, 30).replace(/[^a-z0-9]/gi, '_')
          : state.mainDoi.replace(/[/.:]/g, '_');
        
        // Get file extension
        const fileExt = isPlainText ? '.txt' : (FORMAT_EXTENSIONS[format] || '.txt');
        const filename = `${paperName}_references${fileExt}`;
        
        // Create and download file
        const blob = new Blob([content], { type: 'text/plain' });
        saveAs(blob, filename);
        
        return content;
      } else {
        // For structured formats (bibtex, ris, etc.) when multi-file (ZIP) is requested
        const zip = new JSZip();
        let count = 0;
        const totalRefs = state.references.length;
        
        for (const ref of state.references) {
          try {
            let citation: string;
            if (format === 'application/x-bibtex' && ref.csl) {
              citation = cslToBibtex(ref.doi, ref.csl);
            } else if (format === 'application/x-research-info-systems' && ref.csl) {
              citation = cslToRis(ref.csl);
            } else {
              citation = await convertDoiToCitation(ref.doi, format);
            }
            // Get appropriate file extension for the format
            const fileExt = FORMAT_EXTENSIONS[format] || '.txt';
            const filename = getFilenameFromDoiRef(ref) + fileExt;
            
            zip.file(filename, citation);
            count++;
            setState(prev => ({
              ...prev,
              progress: Math.round((count / totalRefs) * 100)
            }));
          } catch (error) {
            console.error(`Error converting DOI ${ref.doi}:`, error);
          }
        }
        
        // Create file name for the zip
        const paperName = state.paperTitle
          ? state.paperTitle.slice(0, 30).replace(/[^a-z0-9]/gi, '_')
          : state.mainDoi.replace(/[/.:]/g, '_');
        
        // Get a cleaner format name for the zip file
        const formatName = format.split('/').pop()?.replace('x-', '') || format;
        const zipFilename = `${paperName}_references_${formatName}.zip`;
        
        // Generate and download the zip
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, zipFilename);
        
        return null; // No text content to display for ZIP files
      }
    } catch (error) {
      console.error('Error in downloadReferences:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Error downloading references',
        isLoading: false
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false, progress: 0 }));
    }
  };

  return {
    ...state,
    fetchReferences,
    generateCitations,
    downloadReferences: downloadReferences as (options: DownloadOptions) => Promise<string | null>,
    setMainDoi: (doi: string) => setState(prev => ({ ...prev, mainDoi: doi })),
    setCitationText: (text: string) => setState(prev => ({ ...prev, citationText: text }))
  };
}
