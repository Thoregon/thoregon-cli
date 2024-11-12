#!/bin/bash

# Define root directories
thoregonroot="$HOME/dev"
terraroot="$HOME/dev"
easypayroot="$HOME/dev/thatsme/thoregon/easypay"

# Declare an associative array to hold the modules and their paths
declare -A modules

# Thoregon/Neuland modules
modules=(
    # thoregon modules
    ["Agent"]="$thoregonroot"
    ["thoregon.aurora"]="$thoregonroot"
    ["thoregon.archetim"]="$thoregonroot"
    ["thoregon.identity"]="$thoregonroot"
    ["thoregon.neuland"]="$thoregonroot"
    ["thoregon.tru4D"]="$thoregonroot"
    ["thoregon.truCloud"]="$thoregonroot"
    ["thoregon.crystalline"]="$thoregonroot"
    ["thoregon.telom"]="$thoregonroot"
    ["thoregon.ux"]="$thoregonroot"
    ["evolux.everblack"]="$thoregonroot"
    ["evolux.util"]="$thoregonroot"
    ["evolux.web"]="$thoregonroot"
    ["evolux.dyncomponents"]="$thoregonroot"
    ["evolux.supervise"]="$thoregonroot"
    ["evolux.pubsub"]="$thoregonroot"
    ["evolux.universe"]="$thoregonroot"
    # terra modules
    ["terra.stripe"]="$terraroot"
    # uPayMe modules
    ["easypay-application-dashboard"]="$easypayroot/applications"
    ["upayme-application-affiliate"]="$easypayroot/applications"
    ["easypay-application-checkout"]="$easypayroot/applications"
    ["upayme-application-customer"]="$easypayroot/applications"
    ["upayme-application-accountportal"]="$easypayroot/applications"
    ["upayme-application-affiliatehandling"]="$easypayroot/applications"
    ["easypay-module-product"]="$easypayroot/modules"
    ["easypay-module-pricing"]="$easypayroot/modules"
    ["easypay-module-paymentplan"]="$easypayroot/modules"
    ["easypay-module-storesettings"]="$easypayroot/modules"
    ["easypay-module-integration"]="$easypayroot/modules"
    ["easypay-module-credential"]="$easypayroot/modules"
    ["easypay-module-customer-validator"]="$easypayroot/modules"
    ["easypay-checkout-session"]="$easypayroot/modules"
    ["easypay-module-checkoutpage-helper"]="$easypayroot/modules"
    ["easypay-module-order"]="$easypayroot/modules"
    ["easypay-module-payment"]="$easypayroot/modules"
    ["upayme-module-invoice"]="$easypayroot/modules"
    ["upayme-module-csvgenerator"]="$easypayroot/modules"
    ["easypay-module-businesscase"]="$easypayroot/modules"
    ["easypay-module-email"]="$easypayroot/modules"
    ["easypay-module-ipn"]="$easypayroot/modules"
    ["easypay-module-events"]="$easypayroot/modules"
    ["easypay-module-taxes"]="$easypayroot/modules"
    ["easypay-module-coupon"]="$easypayroot/modules"
    ["easypay-module-document"]="$easypayroot/modules"
    ["upayme-module-customer"]="$easypayroot/modules"
    ["upayme-module-accountportal"]="$easypayroot/modules"
    ["easypay-module-pdf"]="$easypayroot/modules"
    ["easypay-module-invoicegenerator"]="$easypayroot/modules"
    ["upayme-module-transaction"]="$easypayroot/modules"
    ["upayme-module-digistore24"]="$easypayroot/modules"
    ["upayme-module-affiliate-action-manager"]="$easypayroot/modules"
    ["upayme-module-contentlinks"]="$easypayroot/modules"
    ["upayme-module-utilities"]="$easypayroot/modules"
    ["upayme-module-paymentmethods"]="$easypayroot/modules"
    ["upayme-module-provisions"]="$easypayroot/modules"
    ["upayme-module-statisticsframework"]="$easypayroot/modules"
    ["upayme-module-syncproduct"]="$easypayroot/modules"
    ["easypay-home"]="$easypayroot/home"
    ["easypay-testdata"]="$easypayroot/test"
    ["easypay-service"]="$easypayroot/services"
    ["paymentprocessors"]="$easypayroot/services"
    ["upayme-style-customer"]="$easypayroot/styles"
    ["upayme-style-nexus"]="$easypayroot/styles"
    # uPayMe Nexus modules
    ["nexus-home"]="$easypayroot/home"
    ["upayme-service-portal"]="$easypayroot/nexusservices"
    ["upayme-application-nexus"]="$easypayroot/applications"
    ["upayme-module-nexusemail"]="$easypayroot/nexusmodules"
    ["upayme-module-nexusapi"]="$easypayroot/nexusmodules"
    ["upayme-module-identitycard"]="$easypayroot/nexusmodules"
)

# Create copies of each module in the current directory
for module in "${!modules[@]}"; do
    src_path="${modules[$module]}/$module"
    dest_path="./$module"
    if [ -e "$src_path" ]; then
            rsync -r "$src_path/" "$dest_path" --exclude .git
    	    #cp -a "$src_path" "$dest_path"
        echo "Synced $module from $src_path to $dest_path"
    else
        echo "Source path $src_path does not exist. Skipping $module."
    fi
done

echo "Copying of modules completed."
