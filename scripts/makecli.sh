#!/bin/bash

# Usage function
usage() {
    echo "Usage: $0 [-p]"
    echo "  -p, --prod        make production cli"
    exit 1
}

TGTCLI="$UPAYMETESTCLI"

# Parse command line arguments
while [[ "$1" != "" ]]; do
    case "$1" in
        -p | --prod )        shift
                             TGTCLI="$UPAYMEPRODCLI"
                             ;;
        -h | --help )        usage
                             ;;
        * )                  usage
                             ;;
    esac
    shift
done

# Check if directories exist
if [[ ! -d "$TGTCLI/scripts" ]]; then
  echo "Directory $TGTCLI/scripts does not exist."
  exit 1
fi

if [[ ! -d "$UPAYMEBIN" ]]; then
  echo "Directory $UPAYMEBIN does not exist."
  exit 1
fi

# Define root directories
thoregonroot="${THOREGONGITROOT:-$HOME/dev}"
easypayroot="${UPAYMEGITROOT:-$HOME/dev/thatsme/thoregon/easypay}"

# Declare an associative array to hold the modules and their paths
declare -A modules

# Thoregon/Neuland modules
modules=(
    ["thoregon-cli"]="$thoregonroot"
)

# Create copies of each module in the current directory
for module in "${!modules[@]}"; do
    src_path="${modules[$module]}/$module"
    dest_path="$TGTCLI"
    if [ -e "$src_path" ]; then
            rsync -r "$src_path/" "$dest_path" --exclude .git
        echo "Synced $module from $src_path to $dest_path"
    else
        echo "Source path $src_path does not exist. Skipping $module."
    fi
done

# Loop through each .sh file in the $TGTCLI/scripts directory
for script in "$TGTCLI/scripts"/*.sh; do
  # Skip if no .sh files are found
  [[ -e "$script" ]] || { echo "No .sh scripts found."; exit 0; }

  # Check if the script is executable
  if [[ ! -x "$script" ]]; then
    # Make the script executable for all users
    chmod +x "$script"
    echo "Made $script executable."
  fi

  # Get the script name without the directory and extension
  script_name=$(basename "$script" .sh)

  # Define the target symlink path in $UPAYMEBIN
  symlink_path="$UPAYMEBIN/$script_name"

  # Create the symlink only if it does not already exist
  if [[ ! -e "$symlink_path" ]]; then
    ln -s "$script" "$symlink_path"
    echo "Created symlink: $symlink_path -> $script"
  else
    echo "Symlink $symlink_path already exists. Skipping."
  fi
done



echo "Copying of www completed."
