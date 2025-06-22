## Goal
- this app will be a super simple single-page UI, where you enter DOI of a paper and it will give you citations of all the references in specified format (bibtex, ris, APA ...) either in a single file or as multiple files you will be able to download then as a zip


## User flow:
1. enter DOI, press enter OR click Get References
2. if DOI is valid, it will fetch the title of the paper, progress bar will run. if invalid, it will throw error
3. all citations will be there, one citation per row/card, in a bibtex format by default
4. the user will be able to select any style or format: bibtex, ris, refworks, endnote... _ or simple bibliography of any citation style (Apa, Nature...) – it should be also possible to search these styles since there are many – and it will convert the format or style on the fly
5. on download in case of ris or bibtex it will download a zip with multiple of these files with human readable filename (ideally with author, year, title). in case of citation styles it will download single txt file
6. it should be also possible to share a link to say this_website.com/current_doi and it will automatically start processing / the doi will be pre-entered and pre-clicked to say

## Tech
- we are using Vite, Typescript, Tailwind CSS and Shadcn UI (if you want to use it you need to pnpm install the components you want)
- use pnpm please
- to get cited use please the `https://opencitations.net/index/api/v2/references/`
- use [citation.js](https://citation.js.org/) to convert the citations on the fly.
- install any missing packages or components
- create a docker file and nginx to prepare for vercel deployment


## Python example: 

```
import requests
from typing import List, Dict, Optional

def get_references(doi: str) -> Optional[List[Dict]]:
    """
    Get references for a given DOI from OpenCitations API.
    
    Args:
        doi (str): DOI identifier (e.g., "10.1073/pnas.1118373109")
    
    Returns:
        List[Dict]: List of reference objects, or None if request fails
    """
    # Clean DOI - remove 'doi:' prefix if present
    clean_doi = doi.replace("doi:", "")
    
    # Construct API URL
    base_url = "https://opencitations.net/index/api/v2/references/"
    url = f"{base_url}doi:{clean_doi}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()  # Raises HTTPError for bad responses
        
        return response.json()
    
    except requests.exceptions.RequestException as e:
        print(f"Error fetching references for DOI {doi}: {e}")
        return None


doi = "10.1073/pnas.1118373109"
references = get_references(doi)
```
```
[{'citing': 'omid:br/06703455796 doi:10.1073/pnas.1118373109 openalex:W2125457158 pmid:22371585 pmid:29073115',
  'cited': 'omid:br/061501431464 doi:10.1037/0003-066x.48.6.621 openalex:W4296586302',
  'journal_sc': 'no',
  'timespan': 'P19Y',
  'oci': '06703455796-061501431464',
  'author_sc': 'no',
  'creation': '2012-02-27'},
 {'citing': 'omid:br/06703455796 doi:10.1073/pnas.1118373109 openalex:W2125457158 pmid:22371585 pmid:29073115',
  'cited': 'omid:br/06130411207 doi:10.1177/0963721411414654 openalex:W2135699994',
  'journal_sc': 'no',
  'timespan': 'P0Y6M',
  'oci': '06703455796-06130411207',
  'author_sc': 'no',
  'creation': '2012-02-27'},...
```
```
def extract_cited(reference_list: List[str]) -> List[str]:
    """
    Extract cited DOIs from OpenCitations reference strings.
    
    Args:
        reference_list (List[str]): List of reference strings containing identifiers
    
    Returns:
        List[str]: List of extracted DOIs (without 'doi:' prefix)
    """
    dois = []
    
    for ref in reference_list:
        # Split by spaces and look for DOI identifier
        if "cited" in ref:
            parts = ref["cited"].split()
            for part in parts:
                if part.startswith('doi:'):
                    # Remove 'doi:' prefix and add to list
                    doi = part.replace('doi:', '')
                    dois.append(doi)
                    break  # Only take first DOI per reference
        
    return dois

extract_cited(references)
```

```
['10.1037/0003-066x.48.6.621',
 '10.1177/0963721411414654',
 '10.1016/j.obhdp.2009.03.003'...
```