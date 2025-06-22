import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDoiReferences } from '../hooks/useDoiReferences';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { DownloadOptions, CitationOption } from '../types';
import { getCitationFormats, fetchCslStyles } from '../utils/citationUtils';

const HomePage = () => {
  const { doi: urlDoi } = useParams<{ doi?: string }>();
  const navigate = useNavigate();
  const {
    isLoading,
    error,
    progress,
    mainDoi,
    paperTitle,
    references,
    citationText,
    generatingCitations,
    fetchReferences,
    generateCitations,
    downloadReferences,
    setMainDoi
  } = useDoiReferences();

  // State variables for citation formats and styles
  const [citationFormats] = useState<CitationOption[]>(getCitationFormats());
  const [citationStyles, setCitationStyles] = useState<CitationOption[]>([
    // Default styles to show while loading
    { id: 'apa', name: 'American Psychological Association' },
    { id: 'vancouver', name: 'Vancouver' },
    { id: 'harvard1', name: 'Harvard' }
  ]);
  const [selectedFormat, setSelectedFormat] = useState('application/x-bibtex');
  const [selectedStyle, setSelectedStyle] = useState('apa');
  const [formatType, setFormatType] = useState<'format' | 'style'>('format');
  const [singleFile] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [showAllStyles, setShowAllStyles] = useState(false);
  const [loadingAllStyles, setLoadingAllStyles] = useState(false);
  const [lastGeneratedStyle, setLastGeneratedStyle] = useState<string>('');
  const [lastGeneratedFormat, setLastGeneratedFormat] = useState<string>('');

  // Fetch citation styles on component mount
  useEffect(() => {
    const loadStyles = async () => {
      setLoadingStyles(true);
      try {
        const styles = await fetchCslStyles(false); // Load top styles by default
        // Make sure we got valid data
        if (Array.isArray(styles) && styles.length > 0) {
          setCitationStyles(styles);
        } else {
          console.error('Invalid styles data received:', styles);
          toast.error('Could not load citation styles. Using defaults.');
        }
      } catch (error) {
        console.error("Error loading citation styles:", error);
        toast.error("Failed to load citation styles. Please try again later.");
      } finally {
        setLoadingStyles(false);
      }
    };
    
    loadStyles();
  }, []);
  
  // Handle URL DOI parameter
  useEffect(() => {
    if (urlDoi && urlDoi !== mainDoi) {
      setMainDoi(urlDoi);
      handleSubmit();
    }
  }, [urlDoi]);

  // Handle form submission
  const handleSubmit = () => {
    if (!mainDoi.trim()) {
      toast.error('Please enter a valid DOI');
      return;
    }

    // Update URL with the DOI
    navigate(`/${encodeURIComponent(mainDoi)}`, { replace: true });

    // Fetch references
    fetchReferences(mainDoi);
  };

  // Handle format change (only auto-generate for file formats, not citation styles)
  useEffect(() => {
    if (references.length > 0 && formatType === 'format') {
      const options: DownloadOptions = {
        format: selectedFormat,
        isPlainText: false,
        singleFile: true
      };

      // Generate new citations with the selected format
      generateCitations(options).then(() => {
        setLastGeneratedFormat(selectedFormat);
        setLastGeneratedStyle('');
      });
    }
  }, [formatType, selectedFormat, references.length]);

  // Handle manual citation generation for styles
  const handleGenerateCitations = async () => {
    if (references.length > 0) {
      const options: DownloadOptions = {
        format: selectedStyle,
        isPlainText: true,
        singleFile: true
      };

      await generateCitations(options);
      setLastGeneratedStyle(selectedStyle);
      setLastGeneratedFormat('');
    }
  };

  // Handle download
  const handleDownload = async (forceSingleFile?: boolean) => {
    const isPlainText = formatType === 'style';
    const format = isPlainText ? selectedStyle : selectedFormat;
    
    const options: DownloadOptions = {
      format,
      isPlainText,
      singleFile: isPlainText || (forceSingleFile !== undefined ? forceSingleFile : singleFile)
    };

    await downloadReferences(options);
  };

  // Copy citation text to clipboard
  const handleCopy = () => {
    if (citationText) {
      navigator.clipboard.writeText(citationText)
        .then(() => toast.success('Citation copied to clipboard'))
        .catch(err => toast.error('Failed to copy: ' + err));
    }
  };

  // Handle loading all styles
  const handleLoadAllStyles = async () => {
    if (showAllStyles) {
      // Already showing all styles, just toggle back to top styles
      setShowAllStyles(false);
      setSearchQuery('');
      // Reload top styles
      const topStyles = await fetchCslStyles(false);
      setCitationStyles(topStyles);
      return;
    }

    setLoadingAllStyles(true);
    try {
      const allStyles = await fetchCslStyles(true); // Load all styles
      setCitationStyles(allStyles);
      setShowAllStyles(true);
      toast.success(`Loaded ${allStyles.length} citation styles`);
    } catch (error) {
      console.error("Error loading all citation styles:", error);
      toast.error("Failed to load all citation styles.");
    } finally {
      setLoadingAllStyles(false);
    }
  };
  

  // Filter styles for search with safety checks
  const filteredStyles = citationStyles.filter(style =>
    style && style.name ? style.name.toLowerCase().includes(searchQuery.toLowerCase()) : false
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-center justify-center text-center space-y-2">
        <h1 className="text-3xl font-bold">DOI Reference Extractor</h1>
        <p className="text-muted-foreground">
          Enter a DOI to extract and download all references in your preferred citation format
        </p>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle>Enter DOI</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="text"
                placeholder="e.g., 10.1073/pnas.1118373109"
                value={mainDoi}
                onChange={(e) => setMainDoi(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                disabled={isLoading}
                className="flex-1"
              />
              <div className="text-xs text-blue-500 text-left pl-0 ml-0 sm:hidden">
                Try: <span className="cursor-pointer hover:underline" onClick={() => setMainDoi('10.1103/physrevlett.10.84')}>10.1103/physrevlett.10.84</span>, <span className="cursor-pointer hover:underline" onClick={() => setMainDoi('10.3945/ajcn.111.027003')}>10.3945/ajcn.111.027003</span>, <span className="cursor-pointer hover:underline" onClick={() => setMainDoi('10.1021/ar500432k')}>10.1021/ar500432k</span>
              </div>
              <Button onClick={handleSubmit} disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? 'Processing...' : 'Get References'}
              </Button>
            </div>
            <div className="hidden sm:block text-xs text-blue-500 text-left pl-0 ml-0">
              Try: <span className="cursor-pointer hover:underline" onClick={() => setMainDoi('10.1103/physrevlett.10.84')}>10.1103/physrevlett.10.84</span>, <span className="cursor-pointer hover:underline" onClick={() => setMainDoi('10.3945/ajcn.111.027003')}>10.3945/ajcn.111.027003</span>, <span className="cursor-pointer hover:underline" onClick={() => setMainDoi('10.1021/ar500432k')}>10.1021/ar500432k</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          {(isLoading || generatingCitations) && (
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm">
                  {isLoading ? 'Processing...' : 'Generating citations...'}
                </span>
                {isLoading && <span className="text-sm">{progress}%</span>}
              </div>
              <Progress value={isLoading ? progress : (generatingCitations ? 70 : 0)} className="h-2" />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results and Format Selection */}
      {references.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {paperTitle || `References for ${mainDoi}`}
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {references.length} references found
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 space-y-4">
                {/* Citation Format/Style Tabs */}
                <div className="border-b">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setFormatType('format')}
                      className={`px-4 py-2 text-sm font-medium ${formatType === 'format'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-muted-foreground'}`}
                    >
                      File Format
                    </button>
                    <button
                      onClick={() => setFormatType('style')}
                      className={`px-4 py-2 text-sm font-medium ${formatType === 'style'
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-muted-foreground'}`}
                    >
                      Citation Style
                    </button>
                  </div>
                </div>
                
                {/* Format/Style Selection */}
                <div>
                  {formatType === 'format' ? (
                    <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        {citationFormats.map((format) => (
                          <SelectItem key={format.id} value={format.id}>
                            {format.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Search styles..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1"
                          disabled={loadingStyles}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLoadAllStyles}
                          disabled={loadingStyles || loadingAllStyles}
                        >
                          {loadingAllStyles ? 'Loading...' : showAllStyles ? `Top Styles` : `All Styles`}
                        </Button>
                      </div>
                      <Select value={selectedStyle} onValueChange={setSelectedStyle} disabled={loadingStyles}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={loadingStyles ? "Loading styles..." : "Select style"} />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingStyles ? (
                            <SelectItem value="loading" disabled>Loading citation styles...</SelectItem>
                          ) : filteredStyles.length === 0 ? (
                            <SelectItem value="none" disabled>No styles found</SelectItem>
                          ) : filteredStyles.map((style) => (
                            <SelectItem key={style.id} value={style.id}>
                              {style.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleCopy}
                    disabled={!citationText || generatingCitations}
                    variant="outline"
                  >
                    Copy to Clipboard
                  </Button>
                  
                  {formatType === 'format' ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => handleDownload(true)}
                        disabled={isLoading || generatingCitations}
                      >
                        Download Single File
                      </Button>
                      <Button
                        onClick={() => handleDownload(false)}
                        disabled={isLoading || generatingCitations}
                        variant="outline"
                      >
                        Download ZIP
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleDownload()}
                      disabled={isLoading || generatingCitations}
                    >
                      Download Text
                    </Button>
                  )}
                </div>
              </div>

              {/* Citation Text Output */}
              <div className="mb-4 border rounded-md">
                <div className="bg-muted p-2 border-b flex justify-between items-center">
                  <div className="text-sm font-medium">Citation Output</div>
                </div>
                {generatingCitations ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Generating citations...
                  </div>
                ) : formatType === 'style' && (lastGeneratedStyle !== selectedStyle || !citationText) ? (
                  <div className="p-8 text-center">
                    <Button onClick={handleGenerateCitations} disabled={generatingCitations}>
                      Generate Citations ({citationStyles.find(s => s.id === selectedStyle)?.name || selectedStyle})
                    </Button>
                  </div>
                ) : formatType === 'format' && (lastGeneratedFormat !== selectedFormat || !citationText) ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Loading format...
                  </div>
                ) : citationText ? (
                  <pre className="p-4 overflow-auto text-sm bg-muted/50 max-h-96 whitespace-pre-wrap text-left">
                    <code>{citationText}</code>
                  </pre>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No citations generated yet
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {references.length} references
              </div>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
};

export default HomePage;