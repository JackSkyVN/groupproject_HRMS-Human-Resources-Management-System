import pandas as pd

# Read Excel file
df = pd.read_excel('c:/Users/Dell/Downloads/Group Project/groupproject_HRMS-Human-Resources-Management-System/db/data_employee.xlsx')

# Print info
print(f"Total rows: {len(df)}")
print(f"Columns: {list(df.columns)}")
print()

# Set display options to show ALL data
pd.set_option('display.max_rows', None)
pd.set_option('display.max_columns', None)
pd.set_option('display.width', None)
pd.set_option('display.max_colwidth', None)

# Print full dataframe
print(df.to_string(index=True))
