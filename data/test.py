import sqlite3
import pandas as pd
  
conn = sqlite3.connect('./sql.db')
  
# Load CSV data into Pandas DataFrame
stud_data = pd.read_csv('cars.csv')
# Write the data to a sqlite table
stud_data.to_sql('cars', conn, if_exists='replace', index=False)

# Load CSV data into Pandas DataFrame
stud_data = pd.read_csv('flights-3m.csv')
# Write the data to a sqlite table
stud_data.to_sql('flights', conn, if_exists='replace', index=False)


# Create a cursor object
cur = conn.cursor()
# Fetch and display result
for row in cur.execute('SELECT count(*) FROM cars'):
    print(row)
# Close connection to SQLite database
for row in cur.execute('SELECT count(*) FROM flights'):
    print(row)

conn.close()