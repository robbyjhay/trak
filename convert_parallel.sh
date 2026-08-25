#!/bin/bash

export MAX_JOBS=10
export RUNNING=0

# Define a function to process a single file
process_file() {
    local md_file="$1"
    echo "Processing $md_file"
    
    # Run the converter
    npx --yes @thebestdev/md-to-docx "$md_file" > /dev/null 2>&1
    
    # Check if the docx file was generated
    local docx_file="${md_file%.md}.docx"
    if [ -f "$docx_file" ]; then
        echo "Successfully converted: $md_file to $docx_file"
        rm "$md_file"
    else
        echo "Conversion failed or skipped for: $md_file"
        local txt_file="${md_file%.md}.txt"
        mv "$md_file" "$txt_file"
        echo "Renamed to $txt_file"
    fi
}

for md_file in $(find TRAK-DOCUMENTATION-WORD -type f -name "*.md"); do
    process_file "$md_file" &
    
    RUNNING=$((RUNNING + 1))
    if [ "$RUNNING" -ge "$MAX_JOBS" ]; then
        wait -n
        RUNNING=$((RUNNING - 1))
    fi
done

wait
echo "Parallel conversion process complete."
