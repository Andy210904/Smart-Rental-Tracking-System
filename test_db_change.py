#!/usr/bin/env python3
"""
Simple ML service test with database monitoring
"""
import time
import sqlite3
import os

# Test database change by updating the rental.db
def test_database_update():
    db_path = r"c:\Users\adity\OneDrive\Desktop\VIT\Projects\Smart_Rental_Tracking_Node\smart-rental-tracker\database\rental.db"
    
    if not os.path.exists(db_path):
        print(f"Database not found at: {db_path}")
        return
        
    try:
        # Connect to database and make a small change
        print(f"Updating database at: {db_path}")
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Add a simple test update (just update a timestamp or similar)
        current_time = time.strftime('%Y-%m-%d %H:%M:%S')
        print(f"Adding timestamp update: {current_time}")
        
        # Check if there's a test table we can update
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"Available tables: {[table[0] for table in tables]}")
        
        # Try to update a rental record to trigger change detection
        cursor.execute("SELECT COUNT(*) FROM Rental")
        rental_count = cursor.fetchone()[0]
        print(f"Found {rental_count} rental records")
        
        if rental_count > 0:
            # Update the first rental record's check-in date
            cursor.execute("UPDATE Rental SET check_in_date = ? WHERE rental_id = (SELECT MIN(rental_id) FROM Rental)", (current_time,))
            print("Updated rental record check-in date")
        
        conn.commit()
        conn.close()
        
        print("Database update completed successfully!")
        
    except Exception as e:
        print(f"Error updating database: {e}")

if __name__ == "__main__":
    print("Testing database change detection...")
    test_database_update()