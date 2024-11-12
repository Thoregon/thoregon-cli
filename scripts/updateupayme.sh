#!/bin/bash

# Save the current working directory
CURDIR=$(pwd)

# Determine if -t option is set or UPAYME_TEST environment variable is set
ISTEST=false
while getopts "t" opt; do
  case $opt in
    t)
      echo "**TEST**"
      ISTEST=true
      ;;
  esac
done

if [ "$UPAYME_TEST" == "1" ]; then
  echo "**TEST**"
  ISTEST=true
fi

# Define variables based on ISTEST flag
if [ "$ISTEST" == "true" ]; then
  MODDIR="$UPAYMETESTMODULES"
  WWWDIR="$UPAYMETESTWWW"
  WWWDIST="$UPAYMETESTPACKS"
else
  MODDIR="$UPAYMEPRODMODULES"
  WWWDIR="$UPAYMEPRODWWW"
  WWWDIST="$UPAYMEPRODPACKS"
fi

echo ""
echo "UPDATE:"
echo "- modules: $MODDIR"
echo "- www: $WWWDIR"
echo "- dist: $WWWDIST"
echo " ---------------------------"
echo ""

# Function to handle errors and return to the original directory
function handle_error {
  echo "An error occurred: $BASH_COMMAND"
  cd "$CURDIR"
  exit 1
}

# Function to handle SIGINT (Ctrl+C) and exit normally
function handle_sigint {
  echo "Script interrupted by user. Returning to the original directory."
  cd "$CURDIR"
  exit 0
}

# Trap any error and call handle_error
trap 'handle_error' ERR

# Trap SIGINT (Ctrl+C) and call handle_sigint
trap 'handle_sigint' SIGINT

# Change to development directory and update sources
cd "$UPAYMEDEV" || handle_error
updatesources
echo "Sources updated"
echo " ---------------------------"
echo ""

# Build modules
cd "$MODDIR" || handle_error
echo "Modules: $MODDIR"
echo ""
makemodules
echo ""
echo "> Modules updated"
echo " ---------------------------"
echo ""

# Build www
cd "$WWWDIR" || handle_error
echo "WWW: $WWWDIR"
echo ""
makewww
echo ""
echo "WWW updated"
echo " ---------------------------"
echo ""

# Build distribution
cd "$WWWDIST" || handle_error
echo "Dist: $WWWDIST"
echo ""
makedist
echo ""
echo "Dist updated"
echo " ---------------------------"
echo ""

echo "** UPAY.ME UPDATE DONE **"

# Return to the original directory
cd "$CURDIR"
