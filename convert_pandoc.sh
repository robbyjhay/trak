#!/bin/bash

export PANDOC="./scratch/pandoc/pandoc-3.1.11.1/bin/pandoc"

find TRAK-DOCUMENTATION-WORD -type f -name "*.md" | while read -r md_file; do
    echo "Processing $md_file"
    docx_file="${md_file%.md}.docx"
    
    # Run pandoc
    $PANDOC "$md_file" -o "$docx_file"
    
    if [ $? -eq 0 ] && [ -f "$docx_file" ]; then
        echo "Successfully converted: $md_file"
        rm "$md_file"
    else
        echo "Conversion failed for: $md_file"
        txt_file="${md_file%.md}.txt"
        mv "$md_file" "$txt_file"
    fi
done

# Create the README.txt
cat << 'EOF' > TRAK-DOCUMENTATION-WORD/README.txt
This directory contains generated Word versions of the authoritative
Markdown documentation archive.

The Markdown archive remains the source of truth.
Generated .docx files are convenience/portable viewing copies.
.txt files are fallbacks where DOCX conversion was not possible.
EOF

echo "Pandoc conversion complete."
