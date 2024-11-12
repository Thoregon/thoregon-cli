#!/bin/bash

# Default values
BRANCH=""
TAG=""
TARGET_DIR="."
IDENTITY_FILE="$HOME/.ssh/git_id_rsa"

# Usage function
usage() {
    echo "Usage: $0 [-b branch] [-t tag] [-d directory] [-i identity_file]"
    echo "  -b, --branch        Specify the branch to clone/update"
    echo "  -t, --tag           Specify the tag to clone/update"
    echo "  -d, --dir           Specify the target directory (default: current directory)"
    echo "  -i, --identity      Specify the SSH identity file (default: ~/.ssh/id_git)"
    exit 1
}

# Parse command line arguments
while [[ "$1" != "" ]]; do
    case "$1" in
        -b | --branch )      shift
                             BRANCH="$1"
                             ;;
        -t | --tag )         shift
                             TAG="$1"
                             ;;
        -d | --dir )         shift
                             TARGET_DIR="$1"
                             ;;
        -i | --identity )    shift
                             IDENTITY_FILE="$1"
                             ;;
        -h | --help )        usage
                             ;;
        * )                  usage
                             ;;
    esac
    shift
done

# Check if both branch and tag are provided
if [[ -n "$BRANCH" && -n "$TAG" ]]; then
    echo "Error: Cannot specify both branch and tag."
    exit 1
fi

# Read git remotes from file
if [[ ! -f "git-remotes.txt" ]]; then
    echo "Error: git-remotes.txt file not found."
    exit 1
fi

# Ensure target directory exists
mkdir -p "$TARGET_DIR"

# Function to clone or update a repository
process_repo() {
    local repo_url=$1

    # Skip empty lines and lines starting with #
    [[ -z "$repo_url" || "$repo_url" =~ ^# ]] && return

    local repo_name=$(basename "$repo_url" .git)
    local repo_dir="$TARGET_DIR/$repo_name"

    echo "Processing repository: $repo_url"

    if [[ -d "$repo_dir" ]]; then
        echo "Updating repository in $repo_dir"
        cd "$repo_dir" || { echo "Failed to enter directory $repo_dir"; return; }
        git fetch || { echo "Failed to fetch updates for $repo_name"; cd - > /dev/null; return; }

        if [[ -n "$BRANCH" ]]; then
            git checkout "$BRANCH" || { echo "Failed to checkout branch $BRANCH for $repo_name"; cd - > /dev/null; return; }
            git pull origin "$BRANCH" || { echo "Failed to pull branch $BRANCH for $repo_name"; cd - > /dev/null; return; }
        elif [[ -n "$TAG" ]]; then
            git checkout "tags/$TAG" || { echo "Failed to checkout tag $TAG for $repo_name"; cd - > /dev/null; return; }
            git pull || { echo "Failed to pull updates for $repo_name"; cd - > /dev/null; return; }
        else
            git pull || { echo "Failed to pull updates for $repo_name"; cd - > /dev/null; return; }
        fi

        cd - > /dev/null
    else
        echo "Cloning repository to $repo_dir"
        if [[ "$repo_url" == ssh:* ]]; then
            git clone "$repo_url" "$repo_dir" || { echo "Failed to clone $repo_url"; return; }
        else
            git clone "$repo_url" "$repo_dir" || { echo "Failed to clone $repo_url"; return; }
        fi

        cd "$repo_dir" || { echo "Failed to enter directory $repo_dir"; return; }

        if [[ -n "$BRANCH" ]]; then
            git checkout "$BRANCH" || { echo "Failed to checkout branch $BRANCH for $repo_name"; cd - > /dev/null; return; }
            git pull origin "$BRANCH" || { echo "Failed to pull branch $BRANCH for $repo_name"; cd - > /dev/null; return; }
        elif [[ -n "$TAG" ]]; then
            git checkout "tags/$TAG" || { echo "Failed to checkout tag $TAG for $repo_name"; cd - > /dev/null; return; }
            git pull || { echo "Failed to pull updates for $repo_name"; cd - > /dev/null; return; }
        else
            git pull || { echo "Failed to pull updates for $repo_name"; cd - > /dev/null; return; }
        fi

        cd - > /dev/null
    fi

    # Run npm install if package.json exists
    if [[ -f "$repo_dir/package.json" ]]; then
        echo "Running npm install in $repo_dir"
        cd "$repo_dir" || { echo "Failed to enter directory $repo_dir"; return; }
        npm install || { echo "npm install failed for $repo_name"; cd - > /dev/null; return; }
        cd - > /dev/null
    fi

    echo "Finished processing $repo_name"
}

# Iterate through each remote URL in the file
while IFS= read -r repo_url; do
    process_repo "$repo_url"
done < "git-remotes.txt"

echo "All repositories processed."
