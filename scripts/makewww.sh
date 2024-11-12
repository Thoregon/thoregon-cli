#!/bin/bash

# Define root directories
thoregonroot="${THOREGONGITROOT:-$HOME/dev}"
easypayroot="${UPAYMEGITROOT:-$HOME/dev/thatsme/thoregon/easypay}"

# Declare an associative array to hold the modules and their paths
declare -A modules

# Thoregon/Neuland modules
modules=(
    ["Client"]="$thoregonroot"
)

# Create copies of each module in the current directory
for module in "${!modules[@]}"; do
    src_path="${modules[$module]}/$module"
    dest_path="."
    if [ -e "$src_path" ]; then
            rsync -r "$src_path/" "$dest_path" --exclude .git
        echo "Synced $module from $src_path to $dest_path"
    else
        echo "Source path $src_path does not exist. Skipping $module."
    fi
done

echo "Copying of www completed."
