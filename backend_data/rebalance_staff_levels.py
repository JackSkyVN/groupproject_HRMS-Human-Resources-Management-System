"""
Rebalance Staff Sub-levels (5_1 to 5_5)
Based on Position and Department for simpler logic
"""
import csv
import os

csv_path = os.path.join("..", "db", "data_employee.csv")

# Simple mapping rules
def assign_staff_level(position, department):
    """
    Simple rules for assigning staff sub-levels
    Makes "Add Employee" feature easier to implement
    """
    position_lower = position.lower()
    dept_lower = department.lower()
    
    # LEVEL 5_1: Senior positions (Directors, Acting Directors)
    if any(x in position_lower for x in ['director of department', 'acting deputy director']):
        return '5_1'
    
    # LEVEL 5_2: Heads and Deputies
    if any(x in position_lower for x in ['head of division', 'deputy head', 'chief of office', 'deputy director']):
        return '5_2'
    
    # LEVEL 5_3: Specialists in priority departments
    if 'specialist' in position_lower:
        if any(x in dept_lower for x in ['finance', 'appraisal', 'construction investment', 'legal']):
            return '5_3'
        else:
            return '5_4'  # Regular department specialists
    
    # LEVEL 5_4: Engineers and general Staff
    if any(x in position_lower for x in ['engineer', 'staff']):
        return '5_4'
    
    # LEVEL 5_5: Drivers and support positions
    if 'driver' in position_lower:
        return '5_5'
    
    # Default for any other positions
    return '5_4'

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

# Rebalance Staff only
for emp in employees:
    if emp['Role'] == 'Staff':
        old_level = emp['Permission_Level']
        new_level = assign_staff_level(emp['Position'], emp['Department'])
        
        if old_level != new_level:
            emp['Permission_Level'] = new_level
            rebalanced += 1
        
        changes[new_level] += 1

# Write updated CSV
with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:
    fieldnames = employees[0].keys()
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(employees)

print(f"\n✅ REBALANCE COMPLETE!")
print(f"Rebalanced: {rebalanced} employees")
print(f"\nNew distribution:")
print(f"  5_1: {changes['5_1']} (Senior - Directors)")
print(f"  5_2: {changes['5_2']} (Mid-Senior - Heads)")
print(f"  5_3: {changes['5_3']} (Mid - Priority Specialists)")
print(f"  5_4: {changes['5_4']} (Junior - Regular Specialists, Staff)")
print(f"  5_5: {changes['5_5']} (Entry - Drivers, Support)")
print(f"\nTotal Staff: {sum(changes.values())}")
