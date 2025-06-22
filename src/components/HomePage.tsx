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
    fetchReferences,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [showAllStyles, setShowAllStyles] = useState(false);
  const [loadingAllStyles, setLoadingAllStyles] = useState(false);

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

  // Handle download
  const handleDownload = () => {
    const isPlainText = formatType === 'style';
    const format = isPlainText ? selectedStyle : selectedFormat;
    
    const options: DownloadOptions = {
      format,
      isPlainText
    };

    downloadReferences(options);
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
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g., 10.1073/pnas.1118373109"
              value={mainDoi}
              onChange={(e) => setMainDoi(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Processing...' : 'Get References'}
            </Button>
          </div>
          
          {/* Progress Bar */}
          {isLoading && (
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm">Processing...</span>
                <span className="text-sm">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
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
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Citation Type</label>
                  <div className="flex gap-2">
                    <Button
                      variant={formatType === 'format' ? 'default' : 'outline'}
                      onClick={() => setFormatType('format')}
                      size="sm"
                    >
                      File Format
                    </Button>
                    <Button
                      variant={formatType === 'style' ? 'default' : 'outline'}
                      onClick={() => setFormatType('style')}
                      size="sm"
                    >
                      Citation Style
                    </Button>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">
                    {formatType === 'format' ? 'Select Format' : 'Select Style'}
                  </label>
                  
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
                      <div className="flex gap-2 mb-2">
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

                <div className="flex items-end">
                  <Button onClick={handleDownload} disabled={isLoading}>
                    Download {formatType === 'format' ? 'Files (ZIP)' : 'Text'}
                  </Button>
                </div>
              </div>

              {/* Reference Cards */}
              <div className="space-y-4">
                {references.map((ref, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <h3 className="font-medium truncate">
                        {ref.title || `DOI: ${ref.doi}`}
                      </h3>
                      
                      {ref.authors && ref.authors.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {ref.authors.join(', ')}
                          {ref.year && ` (${ref.year})`}
                        </p>
                      )}
                      
                      <p className="text-xs mt-1 text-muted-foreground">
                        DOI: {ref.doi}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">
                {references.length} references
              </div>
              <Button onClick={handleDownload} disabled={isLoading}>
                Download {formatType === 'format' ? 'Files (ZIP)' : 'Text'}
              </Button>
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
};

export default HomePage;