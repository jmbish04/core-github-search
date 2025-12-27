import pandas as pd
import sys
import json

# Input: Path to the raw JSON/CSV file just downloaded from SODA
# Output: JSON list of unique contractor licenses/names found in that file

def extract(file_path):
    try:
        # Load the raw data (streaming or chunking if massive)
        df = pd.read_json(file_path) # or read_csv depending on your ingest
        
        # Standardize column names (SODA usually has 'contractor_name', 'contractor_license')
        # You might need a mapping function here depending on the dataset type
        
        candidates = pd.DataFrame()
        
        if 'contractor_license' in df.columns:
            # Filter out empty licenses
            candidates = df[['contractor_license', 'contractor_name']].dropna(subset=['contractor_license'])
        elif 'plumbing_contractor_license' in df.columns:
             candidates = df[['plumbing_contractor_license', 'plumbing_contractor_name']]
             candidates.columns = ['contractor_license', 'contractor_name']
        
        # Deduplicate - we only need to sync the contractor ONCE per batch
        unique_contractors = candidates.drop_duplicates(subset=['contractor_license'])
        
        # Return as JSON
        return unique_contractors.to_dict(orient='records')

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # In sandbox, args are passed via CLI or stdin
    # For this example, let's assume input file path is arg 1
    input_file = sys.argv[1]
    result = extract(input_file)
    print(json.dumps(result))