import requests
import json
from pprint import pprint

def test_equipment_stats():
    try:
        # Test ML API directly
        ml_url = "http://localhost:8001/ml/equipment-stats"
        print(f"Testing ML API equipment stats endpoint: {ml_url}")
        
        try:
            ml_response = requests.get(ml_url, timeout=5)
            if ml_response.status_code == 200:
                ml_stats = ml_response.json()
                print("ML API Stats retrieved successfully!")
                
                # Check by_equipment_type
                if "by_equipment_type" in ml_stats:
                    print(f"Equipment types found: {len(ml_stats['by_equipment_type'])}")
                    print("Equipment types:")
                    for equipment_type, data in ml_stats['by_equipment_type'].items():
                        print(f"  {equipment_type}: {data['count']} units")
                else:
                    print("No by_equipment_type data in ML API response")
                
                # Save ML API response
                with open("ml_equipment_stats.json", "w") as f:
                    json.dump(ml_stats, f, indent=2)
                    print("ML API response saved to ml_equipment_stats.json")
            else:
                print(f"ML API Error: {ml_response.status_code}")
                print(ml_response.text)
        except Exception as e:
            print(f"Error testing ML API: {e}")
        
        # Test Node.js backend
        node_url = "http://localhost:4000/dashboard"
        print(f"\nTesting Node.js backend endpoint: {node_url}")
        
        try:
            node_response = requests.get(node_url, timeout=5)
            if node_response.status_code == 200:
                node_data = node_response.json()
                print("Node.js backend data retrieved successfully!")
                
                # Check equipment_stats
                if "equipment_stats" in node_data:
                    node_stats = node_data["equipment_stats"]
                    
                    # Check by_equipment_type
                    if "by_equipment_type" in node_stats:
                        print(f"Equipment types found: {len(node_stats['by_equipment_type'])}")
                        print("Equipment types:")
                        for equipment_type, data in node_stats['by_equipment_type'].items():
                            print(f"  {equipment_type}: {data['count']} units")
                    else:
                        print("No by_equipment_type data in Node.js response")
                    
                    # Save Node.js response
                    with open("node_equipment_stats.json", "w") as f:
                        json.dump(node_stats, f, indent=2)
                        print("Node.js response saved to node_equipment_stats.json")
                else:
                    print("No equipment_stats in Node.js response")
            else:
                print(f"Node.js Error: {node_response.status_code}")
                print(node_response.text)
        except Exception as e:
            print(f"Error testing Node.js backend: {e}")
            
    except Exception as e:
        print(f"Error testing equipment stats: {e}")

if __name__ == "__main__":
    test_equipment_stats()