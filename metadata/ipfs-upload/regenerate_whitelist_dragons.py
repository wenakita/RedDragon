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

def regenerate_metadata():
    """Regenerate all metadata files for Whitelist Dragon NFTs"""
    print(f"Regenerating metadata for 100 Whitelist Dragons...")
    
    # Set seed for reproducible results
    random.seed(42)
    
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
        
        # Write metadata to file
        with open(output_file, "w") as f:
            json.dump(metadata, f, indent=2)
        
        # Verify the file is valid JSON
        try:
            with open(output_file, "r") as f:
                json.load(f)
        except json.JSONDecodeError as e:
            print(f"Error in file {token_id}.json: {e}")
            sys.exit(1)
        
        if token_id % 10 == 0:
            print(f"Generated {token_id} metadata files...")

    print(f"Successfully regenerated 100 metadata files in {OUTPUT_FOLDER}")
    return OUTPUT_FOLDER

if __name__ == "__main__":
    try:
        output_path = regenerate_metadata()
        print(f"Metadata regeneration complete!")
        print(f"Files saved to: {output_path}")
        
        # Verify all files are valid JSON
        invalid_files = 0
        for filename in os.listdir(OUTPUT_FOLDER):
            if not filename.endswith('.json'):
                continue
            
            file_path = os.path.join(OUTPUT_FOLDER, filename)
            try:
                with open(file_path, "r") as f:
                    json.load(f)
            except json.JSONDecodeError as e:
                print(f"Error in file {filename}: {e}")
                invalid_files += 1
        
        if invalid_files == 0:
            print("All files are valid JSON!")
        else:
            print(f"WARNING: Found {invalid_files} invalid JSON files!")
            
    except Exception as e:
        print(f"Error regenerating metadata: {e}", file=sys.stderr)
        sys.exit(1) 