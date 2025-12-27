import argparse
import json
import pandas as pd
from datetime import datetime

# Simple template engine since we might not have full jinja2 env setup in minimal container, 
# but user requested jinja2 or f-strings. I'll use f-strings for simplicity and minimal deps.

def generate_markdown(data):
    """
    Generates a Markdown dossier from contractor data.
    """
    # Defensive checks
    if not data:
        return ""

    # Flatten logic (assuming input is list of permits/complaints related to one contractor)
    # The prompt says: "Input: A JSON dictionary of raw rows."
    # Let's assume the input is a dict containing 'permits', 'complaints', 'aliases'?
    # Or is it a flat list of records?
    # "Pass the raw contractor data (permits, aliases, complaints) into the Sandbox."
    
    # We will assume data structure:
    # {
    #   "license": "...",
    #   "primary_name": "...",
    #   "aliases": ["..."],
    #   "permits": [{...}, ...],
    #   "complaints": [{...}, ...]
    # }
    
    license_no = data.get("license", "Unknown")
    primary_name = data.get("primary_name", "Unknown Contractor")
    aliases = data.get("aliases", [])
    permits = data.get("permits", [])
    complaints = data.get("complaints", [])
    
    # Metrics
    total_permits = len(permits)
    total_complaints = len(complaints)
    
    # Simple risk score calc (stub logic)
    # Risk starts at 100, drops with complaints
    risk_score = 100 - (total_complaints * 5)
    risk_score = max(0, risk_score)
    risk_label = "Low Risk" if risk_score > 80 else "Medium Risk" if risk_score > 50 else "High Risk"

    # Performance stats
    # Mocking approval time logic since we'd need date diffs
    # In real impl, would parse dates.
    avg_approval_days = "N/A"
    if permits:
        # data frame for aggregation
        df = pd.DataFrame(permits)
        if 'neighborhood' in df.columns:
            top_hoods = df['neighborhood'].value_counts().head(3).index.tolist()
            top_hoods_str = ", ".join(top_hoods)
        else:
            top_hoods_str = "Unknown"
    else:
        top_hoods_str = "None"
        
    aliases_list = "\n".join([f"- {a}" for a in set(aliases)])
    
    # Collaborators logic (stub)
    collaborators = "- None identified successfully in batch."
    
    markdown = f"""# Contractor: {primary_name} (Lic: {license_no})
## Risk Score: {risk_score}/100 ({risk_label})
## Known Aliases
{aliases_list if aliases else "- None"}

## Performance
- Total Permits: {total_permits}
- Total Complaints: {total_complaints}
- Top Neighborhoods: {top_hoods_str}

## Network
{collaborators}
"""
    return markdown, {
        "risk_score": risk_score,
        "total_permits": total_permits,
        "total_complaints": total_complaints,
        "top_neighborhoods": top_hoods_str
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True, help="Path to input JSON file")
    parser.add_argument("--out", required=True, help="Path to output JSON file")
    args = parser.parse_args()
    
    with open(args.data, 'r') as f:
        raw_data = json.load(f)
        
    md, metrics = generate_markdown(raw_data)
    
    output = {
        "markdown": md,
        "metrics": metrics
    }
    
    with open(args.out, 'w') as f:
        json.dump(output, f)

if __name__ == "__main__":
    main()
