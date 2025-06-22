# DOI References UI

A single-page application to extract references from academic papers by DOI, convert them to various citation formats, and download them.

## Features

- Enter DOI to fetch all references
- View paper title and references
- Convert references to various formats:
  - BibTeX
  - RIS
  - EndNote
  - RefWorks
  - Citation styles (APA, IEEE, Nature, etc.)
- Download as a ZIP file or text file
- Share link with pre-filled DOI

## Tech Stack

- React 19 with TypeScript
- Vite
- Tailwind CSS
- ShadCn UI
- Citation.js for citation processing
- OpenCitations API for reference extraction

## Installation

```bash
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
docker build -t doi2refs_ui .

# Run the container
docker run -p 80:80 doi2refs_ui
```

## API Usage

This project uses the [OpenCitations API](https://opencitations.net/index/api/v2) to extract references from DOIs, and [Citation.js](https://citation.js.org/) to convert citations to different formats.

## License

MIT
