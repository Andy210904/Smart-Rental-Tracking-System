import requests
import json

def test_anomaly_counting():
    url = "http://localhost:8001/ml/anomaly-detection"
    
    try:
        print("Testing Anomaly Detection API for counting...")
        response = requests.post(url, json={})
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ API Response Success:")
            print(f"Total anomalies: {len(data['anomalies'])}")
            
            # Count anomalies by type
            anomaly_counts = {}
            for anomaly in data['anomalies']:
                alert_type = anomaly.get('alert_type', 'unknown')
                anomaly_counts[alert_type] = anomaly_counts.get(alert_type, 0) + 1
            
            print(f"\nAnomaly breakdown by type:")
            for alert_type, count in anomaly_counts.items():
                print(f"  {alert_type}: {count}")
            
            print(f"\nDetailed anomalies:")
            for i, anomaly in enumerate(data['anomalies'], 1):
                print(f"  {i}. {anomaly['equipment_id']} - {anomaly['alert_type']} ({anomaly.get('utilization', 'N/A'):.1%} utilization)")
                
            print(f"\nSummary from API:")
            if 'summary' in data:
                print(f"  total_anomalies: {data['summary']['total_anomalies']}")
                print(f"  total_records: {data['summary']['total_records']}")
                
        else:
            print(f"❌ API Error: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Request Failed: {str(e)}")

if __name__ == "__main__":
    test_anomaly_counting()