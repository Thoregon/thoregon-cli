#!/bin/bash

# Loop through each item in the current directory
for dir in */; do
  # Check if it's a directory and if package.json exists
  if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
    echo "Running npm install in $dir"
    # Navigate to the directory and run npm install
    (cd "$dir" && npm install)
  else
    echo "Skipping $dir - No package.json found"
  fi
done
