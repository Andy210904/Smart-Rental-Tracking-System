#!/usr/bin/env python3
"""
Test database change notification behavior
"""
import time
import sqlite3
import os
import requests

def test_database_change_notification():
    db_path = r"c:\Users\adity\OneDrive\Desktop\VIT\Projects\Smart_Rental_Tracking_Node\smart-rental-tracker\database\rental.db"
    
    print("Testing database change notification behavior...")
    
    # Check initial database status
    try:
        response = requests.get("http://localhost:8001/ml/database-status")
        if response.ok:
            data = response.json()
            print(f"Initial database status: {data}")
        else:
            print("Could not get initial database status")
            return
    except Exception as e:
        print(f"Error checking database status: {e}")
        return
    
    print(f"\nWaiting 5 seconds before making database change...")
    time.sleep(5)
    
    # Make a database change
    try:
        print(f"Making database change...")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Update a rental record
        current_time = time.strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute("UPDATE Rental SET check_in_date = ? WHERE rental_id = (SELECT MIN(rental_id) FROM Rental LIMIT 1)", (current_time,))
        
        conn.commit()
        conn.close()
        print(f"Database updated at {current_time}")
        
    except Exception as e:
        print(f"Error updating database: {e}")
        return
    
    # Check database status after change
    print(f"\nWaiting 2 seconds for change detection...")
    time.sleep(2)
    
    try:
        response = requests.get("http://localhost:8001/ml/database-status")
        if response.ok:
            data = response.json()
            print(f"Database status after change: {data}")
            if data.get('last_change'):
                change_time = data['last_change']
                print(f"Last change detected at: {change_time}")
            else:
                print("No change detected yet")
        else:
            print("Could not get database status after change")
    except Exception as e:
        print(f"Error checking database status after change: {e}")
    
    print(f"\nTest completed. Check frontend to see if notification appeared only once.")

if __name__ == "__main__":
    test_database_change_notification()