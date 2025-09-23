import pandas as pd
import os

def find_data_file():
    """Try to find the data.csv file"""
    possible_paths = [
        os.path.join('database', 'data.csv'),
        os.path.join('..', 'database', 'data.csv'),
        os.path.join('..', '..', 'database', 'data.csv'),
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            return path
    return None

def analyze_rental_data():
    """Analyze the rental data in the CSV file"""
    data_path = find_data_file()
    if not data_path:
        print("Error: Could not find data.csv file")
        return
    
    try:
        print(f"Loading data from: {data_path}")
        data = pd.read_csv(data_path)
        print(f"Data loaded successfully: {len(data)} total records")
        
        # Print column names
        print("\nColumns in the dataset:")
        print(data.columns.tolist())
        
        # Basic stats
        print("\nBasic statistics:")
        print(f"Total records: {len(data)}")
        
        # Check if we have check-in/check-out dates
        if 'Check-Out Date' in data.columns and 'Check-in Date' in data.columns:
            # Convert to datetime
            data['Check-Out Date'] = pd.to_datetime(data['Check-Out Date'])
            data['Check-in Date'] = pd.to_datetime(data['Check-in Date'])
            
            # Count active rentals (null check-in date)
            active_rentals = data[data['Check-in Date'].isnull()]
            print(f"Active rentals (null check-in date): {len(active_rentals)}")
            
            # Count completed rentals (non-null check-in date)
            completed_rentals = data[~data['Check-in Date'].isnull()]
            print(f"Completed rentals (non-null check-in date): {len(completed_rentals)}")
            
            # Equipment types
            print("\nEquipment types:")
            type_counts = data['Type'].value_counts()
            for equipment_type, count in type_counts.items():
                print(f"  {equipment_type}: {count}")
                
            # Equipment by site
            print("\nEquipment by site:")
            site_counts = data['User ID'].value_counts()
            for site, count in site_counts.items():
                print(f"  {site}: {count}")
        
    except Exception as e:
        print(f"Error analyzing data: {e}")

if __name__ == "__main__":
    analyze_rental_data()