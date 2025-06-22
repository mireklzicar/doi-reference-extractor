#!/bin/bash

# Fetch citation styles from Crossref API and save to public/citation-styles.json

echo "Fetching citation styles from Crossref API..."

# Create the public directory if it doesn't exist
mkdir -p public

# Fetch the data and save it to public/citation-styles.json
curl -s "https://api.crossref.org/styles" > public/citation-styles.json

# Check if the request was successful
if [ $? -eq 0 ]; then
    echo "Successfully downloaded citation styles to public/citation-styles.json"
    
    # Display some stats
    TOTAL_STYLES=$(jq -r '.message["total-results"]' public/citation-styles.json 2>/dev/null)
    if [ "$TOTAL_STYLES" != "null" ] && [ "$TOTAL_STYLES" != "" ]; then
        echo "Total citation styles available: $TOTAL_STYLES"
    fi
else
    echo "Error: Failed to fetch citation styles"
    exit 1
fi