import requests
import json
import sqlite3
import pandas as pd

# First check the database for these specific equipment
db_path = r"c:\Users\adity\OneDrive\Desktop\VIT\Projects\Smart_Rental_Tracking_Node\smart-rental-tracker\database\rental.db"
conn = sqlite3.connect(db_path)

print("Checking specific equipment in active rentals:")
specific_eq = ['EQ1050', 'EQ1055']
for eq_id in specific_eq:
    query = """
    SELECT 
        equipment_id, status, check_out_date, check_in_date,
        engine_hours_per_day, idle_hours_per_day, type, site_id
    FROM Equipment 
    WHERE equipment_id = ?
    """
    result = pd.read_sql_query(query, conn, params=[eq_id])
    if not result.empty:
        row = result.iloc[0]
        engine_hours = row['engine_hours_per_day'] or 0
        idle_hours = row['idle_hours_per_day'] or 0
        total_hours = engine_hours + idle_hours
        utilization = (engine_hours / total_hours * 100) if total_hours > 0 else 0
        
        print(f"\n{eq_id}:")
        print(f"  Status: {row['status']}")
        print(f"  Check-out: {row['check_out_date']}")
        print(f"  Check-in: {row['check_in_date']}")
        print(f"  Engine Hours: {engine_hours}")
        print(f"  Idle Hours: {idle_hours}")
        print(f"  Calculated Utilization: {utilization:.1f}%")
        print(f"  Should be anomaly: {'YES' if utilization < 30 else 'NO'}")

conn.close()

# Test the ML API
print("\n" + "="*50)
print("Testing ML API anomaly detection:")

try:
    response = requests.post("http://localhost:8001/ml/anomaly-detection", json={})
    if response.status_code == 200:
        data = response.json()
        print(f"API Response Status: {response.status_code}")
        print(f"Data source: {data.get('data_source', 'unknown')}")
        print(f"Total anomalies: {data.get('summary', {}).get('total_anomalies', 0)}")
        print(f"Total records: {data.get('summary', {}).get('total_records', 0)}")
        print(f"Active rentals: {data.get('summary', {}).get('active_rentals', 0)}")
        
        # Check if our specific equipment are in anomalies
        anomalies = data.get('anomalies', [])
        found_eq = []
        for anomaly in anomalies:
            eq_id = anomaly.get('equipment_id')
            if eq_id in specific_eq:
                found_eq.append(eq_id)
                print(f"\nFound {eq_id} in anomalies:")
                print(f"  Alert type: {anomaly.get('alert_type')}")
                print(f"  Utilization: {anomaly.get('utilization', 0)*100:.1f}%")
                print(f"  Engine hours: {anomaly.get('engine_hours')}")
                print(f"  Idle hours: {anomaly.get('idle_hours')}")
        
        missing = set(specific_eq) - set(found_eq)
        if missing:
            print(f"\nMISSING from anomalies: {list(missing)}")
            print("These should be detected as low utilization anomalies!")
    else:
        print(f"API Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"Error calling ML API: {e}")