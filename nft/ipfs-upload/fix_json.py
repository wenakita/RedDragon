#!/usr/bin/env python3
import json
import os
import sys
import re

# Path to the directory containing the JSON files
DIR_PATH = "metadata/ipfs-upload/white"

def fix_json_files():
    """Fix any malformed JSON files in the directory"""
    print(f"Checking and fixing JSON files in {DIR_PATH}")
    
    fixed_count = 0
    for filename in os.listdir(DIR_PATH):
        if not filename.endswith('.json'):
            continue
            
        file_path = os.path.join(DIR_PATH, filename)
        try:
            # Try to read the file as JSON
            with open(file_path, 'r') as f:
                try:
                    json.load(f)
                    # If we get here, the JSON is valid
                    continue
                except json.JSONDecodeError:
                    # If we get here, the JSON is invalid
                    pass
            
            # Fix missing closing bracket
            with open(file_path, 'r') as f:
                content = f.read()
            
            # Count opening and closing braces
            open_braces = content.count('{')
            close_braces = content.count('}')
            
            if open_braces > close_braces:
                # Add missing closing braces
                missing_braces = open_braces - close_braces
                new_content = content.rstrip() + '\n' + '}' * missing_braces
                with open(file_path, 'w') as f:
                    f.write(new_content)
                fixed_count += 1
                print(f"Fixed file {filename} by adding {missing_braces} closing braces")
            elif close_braces > open_braces:
                # Remove extra closing braces
                extra_braces = close_braces - open_braces
                # Find the position of the last valid closing brace
                new_content = content
                for _ in range(extra_braces):
                    new_content = new_content.rstrip().rstrip('}') + '\n'
                with open(file_path, 'w') as f:
                    f.write(new_content + '}' * open_braces)
                fixed_count += 1
                print(f"Fixed file {filename} by removing {extra_braces} extra closing braces")
            else:
                # The issue might be more complex, recreate the file
                try:
                    token_id = int(filename.split('.')[0])
                    regenerate_metadata_file(token_id, file_path)
                    fixed_count += 1
                    print(f"Recreated file {filename}")
                except Exception as e:
                    print(f"Failed to fix {filename}: {e}")
                    
            # Verify the fix worked
            with open(file_path, 'r') as f:
                try:
                    json.load(f)
                except json.JSONDecodeError as e:
                    print(f"File {filename} is still invalid: {e}")
                    # Final attempt: regenerate the file
                    token_id = int(filename.split('.')[0])
                    regenerate_metadata_file(token_id, file_path)
                    print(f"Regenerated file {filename} as last resort")
                    
        except Exception as e:
            print(f"Error processing {filename}: {e}")
    
    print(f"Fixed {fixed_count} files")
    return fixed_count

def regenerate_metadata_file(token_id, file_path):
    """Regenerate a metadata file from scratch"""
    import random
    
    # Define trait options
    RARITY_OPTIONS = ["Uncommon", "Rare", "Epic", "Legendary"]
    ELEMENT_OPTIONS = ["Fire", "Plasma", "Inferno", "Lightning"]
    
    # Set seed for deterministic results based on token ID
    random.seed(token_id)
    
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
    
    with open(file_path, 'w') as f:
        json.dump(metadata, f, indent=2)

if __name__ == "__main__":
    try:
        fixed_count = fix_json_files()
        if fixed_count > 0:
            print("JSON fix complete! All files should now be valid.")
        else:
            print("All files were already valid JSON.")
    except Exception as e:
        print(f"Error fixing JSON files: {e}", file=sys.stderr)
        sys.exit(1) 