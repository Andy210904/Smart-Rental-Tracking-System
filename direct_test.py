import sys
import os
sys.path.append('ml')

from smart_ml_system import SmartMLSystem

def test_direct_anomaly_detection():
    print("🧪 Direct Anomaly Detection Test")
    print("=" * 50)
    
    try:
        # Initialize the ML system
        print("1. Initializing SmartMLSystem...")
        ml_system = SmartMLSystem()
        
        # Run anomaly detection directly
        print("\n2. Running anomaly detection...")
        result = ml_system.detect_anomalies()
        
        print(f"\n3. Results:")
        print(f"Result type: {type(result)}")
        
        if isinstance(result, dict):
            print(f"Keys in result: {list(result.keys())}")
            
            if 'anomalies' in result:
                anomalies = result['anomalies']
                print(f"Number of anomalies: {len(anomalies)}")
                
                if anomalies:
                    print("\nDetected anomalies:")
                    for i, anomaly in enumerate(anomalies):
                        print(f"  {i+1}. {anomaly}")
                else:
                    print("No anomalies detected")
                    
            if 'summary' in result:
                print(f"\nSummary: {result['summary']}")
        else:
            print(f"Unexpected result format: {result}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_direct_anomaly_detection()