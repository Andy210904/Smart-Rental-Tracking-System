import requests
import json

def test_anomaly_api():
    url = "http://localhost:8001/ml/anomaly-detection"
    
    try:
        print("Testing ML Anomaly Detection API...")
        print(f"URL: {url}")
        
        response = requests.post(url, json={})
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ API Response Success:")
            print(f"Status Code: {response.status_code}")
            print(f"Response Data: {json.dumps(data, indent=2)}")
            
            # Check specific fields
            if 'anomalies' in data:
                print(f"\n📊 Anomaly Details:")
                print(f"Total anomalies: {len(data['anomalies'])}")
                if data['anomalies']:
                    for i, anomaly in enumerate(data['anomalies']):
                        print(f"  Anomaly {i+1}: {anomaly}")
                        
            if 'summary' in data:
                print(f"\n📈 Summary Statistics:")
                summary = data['summary']
                for key, value in summary.items():
                    print(f"  {key}: {value}")
                    
        else:
            print(f"❌ API Error:")
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Request Failed: {str(e)}")

if __name__ == "__main__":
    test_anomaly_api()