import { useState } from 'react';
import type { DoiReference, DownloadOptions } from '../types';
import { getReferences, extractCitedDois, fetchDoiMetadata, convertDoiToCitation, getFilenameFromDoiRef } from '../services/doiService';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface DoiReferencesState {
  isLoading: boolean;
  error: string | null;
  progress: number;
  mainDoi: string;
  paperTitle: string | null;
  references: DoiReference[];
}

export function useDoiReferences() {
  const [state, setState] = useState<DoiReferencesState>({
    isLoading: false,
    error: null,
    progress: 0,
    mainDoi: '',
    paperTitle: null,
    references: []
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
      references: []
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
      const doiMetadata = await fetchDoiMetadata(citedDois);
      
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
   * Download references in the selected format
   * @param options Download options
   */
  const downloadReferences = async (options: DownloadOptions) => {
    const { format, isPlainText } = options;
    
    if (state.references.length === 0) {
      return;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, progress: 0 }));
      
      if (isPlainText) {
        // For plain text formats (e.g., citation styles), create single file
        let content = '';
        let count = 0;
        const totalRefs = state.references.length;
        
        for (const ref of state.references) {
          try {
            const citation = await convertDoiToCitation(ref.doi, format);
            content += citation + '\n\n';
            count++;
            setState(prev => ({ 
              ...prev, 
              progress: Math.round((count / totalRefs) * 100) 
            }));
          } catch (error) {
            console.error(`Error converting DOI ${ref.doi}:`, error);
          }
        }
        
        // Create file name
        const paperName = state.paperTitle 
          ? state.paperTitle.slice(0, 30).replace(/[^a-z0-9]/gi, '_')
          : state.mainDoi.replace(/[/.:]/g, '_');
        
        const filename = `${paperName}_references.txt`;
        
        // Create and download file
        const blob = new Blob([content], { type: 'text/plain' });
        saveAs(blob, filename);
      } else {
        // For structured formats (bibtex, ris, etc.), create zip with multiple files
        const zip = new JSZip();
        let count = 0;
        const totalRefs = state.references.length;
        
        for (const ref of state.references) {
          try {
            const citation = await convertDoiToCitation(ref.doi, format);
            const filename = getFilenameFromDoiRef(ref) + '.' + format.toLowerCase();
            
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
        
        const zipFilename = `${paperName}_references_${format}.zip`;
        
        // Generate and download the zip
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, zipFilename);
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
    downloadReferences,
    setMainDoi: (doi: string) => setState(prev => ({ ...prev, mainDoi: doi }))
  };
}