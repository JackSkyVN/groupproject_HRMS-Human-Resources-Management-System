"""
Rebalance Staff by DEPARTMENT
5_1 = IT Department
5_2 = Finance Department  
5_3 = Construction Department
5_4 = Administration Department
5_5 = Other/Support Departments
"""
import csv
import os

csv_path = os.path.join("..", "db", "data_employee.csv")

# Department mapping to sub-levels
DEPT_MAPPING = {
    # 5_1: IT Department
    'IT Department': '5_1',
    
    # 5_2: Finance & Accounting
    'Finance - Accounting Department': '5_2',
    'Finance Department': '5_2',
    
    # 5_3: Construction related
    'Construction & Site Management': '5_3',
    'Construction Investment Department': '5_3',
    'NBLC Monitoring Office': '5_3',
    'CGNB Monitoring Office': '5_3',
    
    # 5_4: Administration & Core Operations
    'Administration Department': '5_4',
    'Office': '5_4',
    'Management & Operation Department': '5_4',
    'Appraisal Department': '5_4',
    
    # 5_5: Other/Support
    'Legal & Risk Management Department': '5_5',
    'Tender Department': '5_5',
    'Tender Expert Group': '5_5',
    'Da Nang Field Office': '5_5',
    'QCVN 9 Monitoring Office': '5_5',
    'Dak Nong Field Office': '5_5',
    'Dong Nai Field Office': '5_5',
    'Quang Ngai Field Office': '5_5',
    'Tay Nguyen Field Office': '5_5',
    'Binh Thuan Field Office': '5_5',
    'Binh Duong Field Office': '5_5',
}

# Read CSV
employees = []
with open(csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        employees.append(row)

print(f"Total employees: {len(employees)}")

# Track changes
changes = {'5_1': 0, '5_2': 0, '5_3': 0, '5_4': 0, '5_5': 0}
rebalanced = 0
unmapped = []

# Rebalance Staff by DEPARTMENT
for emp in employees:
    if emp['Role'] == 'Staff':
        old_level = emp['Permission_Level']
        dept = emp['Department']
        
        # Map department to sub-level
        new_level = DEPT_MAPPING.get(dept)
        
        if new_level:
            if old_level != new_level:
                emp['Permission_Level'] = new_level
                rebalanced += 1
            changes[new_level] += 1
        else:
            # Unmapped department - default to 5_5
            emp['Permission_Level'] = '5_5'
            changes['5_5'] += 1
            unmapped.append(dept)
            if old_level != '5_5':
                rebalanced += 1

# Write updated CSV
with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
    fieldnames = employees[0].keys()
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(employees)

print(f"\n✅ REBALANCE BY DEPARTMENT COMPLETE!")
print(f"Rebalanced: {rebalanced} employees")
print(f"\nNew distribution:")
print(f"  5_1: {changes['5_1']} (IT Department)")
print(f"  5_2: {changes['5_2']} (Finance & Accounting)")
print(f"  5_3: {changes['5_3']} (Construction)")
print(f"  5_4: {changes['5_4']} (Administration & Core Ops)")
print(f"  5_5: {changes['5_5']} (Other/Support)")
print(f"\nTotal Staff: {sum(changes.values())}")

if unmapped:
    print(f"\n⚠️ Unmapped departments (assigned to 5_5):")
    for dept in set(unmapped):
        print(f"  - {dept}")
