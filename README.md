# DOI Reference Extractor

![Website Deploy](https://deploy-badge.vercel.app/?url=http%3A%2F%2Freferences.mireklzicar.com&logo=vercel&name=references.mireklzicar.com) [![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](./LICENSE)

A single-page application to extract references from academic papers by DOI, convert them to various citation formats, and download them in bulk.


<p align="center">
  <video src="assets/demo.mp4" width="500px"></video>
</p>


## Overview

DOI Reference Extractor allows researchers to quickly extract all references from a scientific paper using its DOI (Digital Object Identifier). The tool fetches the complete reference list, converts citations to various formats, and enables easy downloading as individual files or a ZIP archive.

## Features

- Enter DOI to fetch all references
- View paper title and references
- Convert references to various formats:
  - BibTeX
  - RIS
  - EndNote
  - RefWorks
  - CSL JSON
  - RDF XML
  - Turtle RDF
- Apply various citation styles:
  - APA
  - Harvard
  - Vancouver
  - IEEE
  - Chicago
  - MLA
  - Nature
  - Over 5000 citation styles available
- Download options:
  - Single text file with all references
  - ZIP archive with individual files for each reference
- Share link with pre-filled DOI

## How It Works

### Technical Flow

1. **Reference Extraction**:
   - User enters a DOI
   - Application calls the [OpenCitations API](https://opencitations.net/index/api/v2) to retrieve all references
   - Each reference is processed to extract its own DOI

2. **Metadata Retrieval**:
   - For each extracted DOI, the application fetches metadata using the [DOI Content Negotiation API](https://www.crossref.org/documentation/retrieve-metadata/content-negotiation/)
   - Metadata includes titles, authors, publication year, and other bibliographic information

3. **Citation Formatting**:
   - User selects desired output format (BibTeX, RIS, etc.) or citation style (APA, IEEE, etc.)
   - Application uses DOI Content Negotiation to convert each reference to the selected format
   - For citation styles, the application requests formatted text using CSL (Citation Style Language)

4. **Download Options**:
   - For single file download, all citations are combined into one text file
   - For ZIP download, each reference is saved as an individual file with a descriptive filename based on author, year, and title

### APIs Used

1. **[OpenCitations API](https://opencitations.net/)** (v2)
   - Endpoint: `https://opencitations.net/index/api/v2/references/`
   - Purpose: Retrieves a list of all references from a paper by its DOI
   - Data format: JSON containing cited DOIs and metadata

2. **[DOI Content Negotiation](https://www.crossref.org/documentation/retrieve-metadata/content-negotiation/)**
   - Endpoint: `https://doi.org/{DOI}`
   - Purpose: Fetches metadata and formatted citations for DOIs
   - Formats: BibTeX, RIS, CSL JSON, RDF XML, etc.
   - Implements CSL (Citation Style Language) for text-based citations

3. **Local Citation Style Files**
   - Purpose: Provides access to thousands of citation styles
   - Storage: Pre-generated JSON files with style information

## Tech Stack

- React 19 with TypeScript
- Vite for fast development and optimized builds
- Tailwind CSS for styling
- ShadCN UI components
- JSZip for creating downloadable ZIP archives
- Axios for API requests
- React Router for URL-based DOI input

## Installation

```bash
# Clone the repository
git clone https://github.com/mireklzicar/doi-reference-extractor.git
cd doi-reference-extractor

# Install dependencies
pnpm install

# Run the development server
pnpm dev

# Build for production
pnpm build
```

## Docker

The application can be containerized using Docker:

```bash
# Build the Docker image
docker build -t doi-reference-extractor .

# Run the container
docker run -p 80:80 doi-reference-extractor
```

## Usage

1. Enter a DOI in the input field (e.g., `10.1073/pnas.1118373109`)
2. Click "Get References" or press Enter
3. Once references are loaded, select a format (BibTeX, RIS, etc.) or citation style (APA, Harvard, etc.)
4. Use the buttons to:
   - Copy citations to clipboard
   - Download all citations as a single file
   - Download individual citations as a ZIP archive

## Environment Variables

No special environment variables are required to run this application.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Developed by [Miroslav Lžičař](https://github.com/mireklzicar)

## License

Apache 2.0
