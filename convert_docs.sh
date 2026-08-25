#!/bin/bash

# Find all Markdown files in TRAK-DOCUMENTATION-WORD
find TRAK-DOCUMENTATION-WORD -type f -name "*.md" | while read -r md_file; do
    echo "Processing $md_file"
    
    # Run the converter
    npx --yes @thebestdev/md-to-docx "$md_file" > /dev/null 2>&1
    
    # Check if the docx file was generated
    docx_file="${md_file%.md}.docx"
    if [ -f "$docx_file" ]; then
        echo "Successfully converted: $md_file to $docx_file"
        rm "$md_file"
    else
        echo "Conversion failed or skipped for: $md_file"
        txt_file="${md_file%.md}.txt"
        mv "$md_file" "$txt_file"
        echo "Renamed to $txt_file"
    fi
done

echo "Conversion process complete."
