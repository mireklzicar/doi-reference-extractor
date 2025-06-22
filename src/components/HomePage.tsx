import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDoiReferences } from '../hooks/useDoiReferences';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import type { DownloadOptions } from '../types';

const CITATION_FORMATS = [
  { id: 'bibtex', name: 'BibTeX' },
  { id: 'ris', name: 'RIS' },
  { id: 'endnote', name: 'EndNote' },
  { id: 'refworks', name: 'RefWorks' },
];

const CITATION_STYLES = [
  { id: 'apa', name: 'APA' },
  { id: 'harvard1', name: 'Harvard' },
  { id: 'vancouver', name: 'Vancouver' },
  { id: 'ieee', name: 'IEEE' },
  { id: 'chicago', name: 'Chicago' },
  { id: 'mla', name: 'MLA' },
  { id: 'nature', name: 'Nature' },
  { id: 'science', name: 'Science' },
];

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

  const [selectedFormat, setSelectedFormat] = useState('bibtex');
  const [selectedStyle, setSelectedStyle] = useState('apa');
  const [formatType, setFormatType] = useState<'format' | 'style'>('format');
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // Filter styles for search
  const filteredStyles = CITATION_STYLES.filter(style =>
    style.name.toLowerCase().includes(searchQuery.toLowerCase())
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
                        {CITATION_FORMATS.map((format) => (
                          <SelectItem key={format.id} value={format.id}>
                            {format.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        placeholder="Search styles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="mb-2"
                      />
                      <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredStyles.map((style) => (
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