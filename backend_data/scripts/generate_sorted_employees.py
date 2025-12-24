
import csv
import os

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # backend_data
IMPORTANT_CSV = os.path.join(BASE_DIR, "..", "db", "important_employee.csv")
DATA_CSV = os.path.join(BASE_DIR, "..", "db", "data_employee.csv")

OUTPUT_CSV = os.path.join(BASE_DIR, "sorted_employees_for_excel.csv")

# Ranking Logic (Lower number = Higher Rank)
def get_rank(position, department):
    p = str(position).lower()
    d = str(department).lower()
    
    if "chairman" in p: return 1
    if "general director" in p and "deputy" not in p: return 2
    if "council member" in p: return 3
    if "deputy general director" in p: return 4
    if "chief accountant" in p: return 5
    if "director of department" in p or "head of internal audit" in p: return 6
    if "deputy director of department" in p: return 7
    if "head of division" in p and "deputy" not in p: return 8
    if "deputy head of division" in p: return 9
    return 10 # Staff

def main():
    employees = []
    seen_ids = set()

    # Read both files
    for file_path in [IMPORTANT_CSV, DATA_CSV]:
        if not os.path.exists(file_path):
            print(f"Skipping {file_path} (Not found)")
            continue
            
        with open(file_path, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                eid = row.get("Employee ID")
                if eid in seen_ids: continue
                
                seen_ids.add(eid)
                row['Rank'] = get_rank(row.get("Position"), row.get("Department"))
                employees.append(row)

    # Sort
    # Primary: Rank (Ascending)
    # Secondary: Department Name (Ascending)
    # Tertiary: Full Name (Ascending)
    employees.sort(key=lambda x: (x['Rank'], x.get('Department', ''), x.get('Full Name', '')))

    # Write Output
    headers = ["Employee ID", "Full Name", "Position", "Department", "Date of Birth", "Phone/ID", "Username", "Password", "Rank"]
    
    with open(OUTPUT_CSV, mode='w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for emp in employees:
            # Filter fields
            filtered = {k: emp.get(k, '') for k in headers}
            writer.writerow(filtered)

    print(f"Successfully generated {OUTPUT_CSV} with {len(employees)} employees.")

if __name__ == "__main__":
    main()
