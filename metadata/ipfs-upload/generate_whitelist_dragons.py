#!/usr/bin/env python3
import json
import os
import random
import sys

# Create output folder
OUTPUT_FOLDER = "metadata/ipfs-upload/white"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Define trait options
RARITY_OPTIONS = ["Uncommon", "Rare", "Epic", "Legendary"]
ELEMENT_OPTIONS = ["Fire", "Plasma", "Inferno", "Lightning"]

def generate_metadata():
    """Generate metadata files for Whitelist Dragon NFTs"""
    print(f"Generating metadata for 100 Whitelist Dragons...")
    
    # Generate 100 metadata files
    for token_id in range(1, 101):
        metadata = {
            "name": f"Whitelist Dragon #{token_id}",
            "description": "A Whitelist Dragon NFT from the SonicRedDragon ecosystem. Forged in fire, bound to speed.",
            "image": "https://ivory-accurate-pig-375.mypinata.cloud/ipfs/bafkreihb5gddz4usfef2xpce6smn64zwpum2m3abm2wk3jmvvm4sskz2au",
            "attributes": [
                { "trait_type": "Token ID", "value": token_id },
                { "trait_type": "Type", "value": "Whitelist Dragon" },
                { "trait_type": "Element", "value": random.choice(ELEMENT_OPTIONS) },
                { "trait_type": "Affiliation", "value": "SonicRedDragon" },
                { "trait_type": "Rarity", "value": random.choice(RARITY_OPTIONS) }
            ]
        }

        output_file = os.path.join(OUTPUT_FOLDER, f"{token_id}.json")
        with open(output_file, "w") as f:
            json.dump(metadata, f, indent=2)
        
        # Verify the JSON file was written correctly
        with open(output_file, "r") as f:
            try:
                json.load(f)
            except json.JSONDecodeError as e:
                print(f"Error in file {output_file}: {e}")
                # Fix the file by rewriting it
                with open(output_file, "w") as fix_f:
                    json.dump(metadata, fix_f, indent=2)
        
        if token_id % 10 == 0:
            print(f"Generated {token_id} metadata files...")

    print(f"Successfully generated 100 metadata files in {OUTPUT_FOLDER}")
    return OUTPUT_FOLDER

if __name__ == "__main__":
    # Set seed for reproducible results
    random.seed(42)
    
    try:
        output_path = generate_metadata()
        print(f"Metadata generation complete!")
        print(f"Files saved to: {output_path}")
        print(f"Sample metadata (token #1):")
        
        # Display a sample metadata file
        with open(os.path.join(OUTPUT_FOLDER, "1.json"), "r") as f:
            print(json.dumps(json.load(f), indent=2))
            
    except Exception as e:
        print(f"Error generating metadata: {e}", file=sys.stderr)
        sys.exit(1) 