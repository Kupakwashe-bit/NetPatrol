import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from prophet import Prophet
import pandas as pd

def preprocess_data(df):
    """
    Preprocesses the raw data by converting timestamps and extracting features.
    """
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    return df

def detect_anomalies(df):
    """
    Detects anomalies using a hybrid approach: Prophet for temporal anomalies
    and Isolation Forest for general outliers.
    """
    # 1. Temporal Anomaly Detection with Prophet
    prophet_df = df[['timestamp', 'traffic_volume']].rename(columns={'timestamp': 'ds', 'traffic_volume': 'y'})
    model = Prophet(daily_seasonality=True, weekly_seasonality=True)
    model.fit(prophet_df)
    forecast = model.predict(prophet_df)
    
    # Merge forecast with original dataframe
    df['yhat'] = forecast['yhat']
    df['yhat_lower'] = forecast['yhat_lower']
    df['yhat_upper'] = forecast['yhat_upper']
    df['temporal_anomaly'] = (df['traffic_volume'] < df['yhat_lower']) | (df['traffic_volume'] > df['yhat_upper'])

    # 2. General Anomaly Detection with Isolation Forest
    features = ['traffic_volume', 'hour']
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(df[features])
    iso_forest = IsolationForest(contamination='auto', random_state=42)
    df['iso_anomaly'] = iso_forest.fit_predict(X_scaled)

    # Combine anomalies
    anomalies_df = df[(df['temporal_anomaly'] == True) | (df['iso_anomaly'] == -1)]

    # Format the output
    anomaly_list = []
    for _, row in anomalies_df.iterrows():
        anomaly_type = "Temporal Shift" if row['temporal_anomaly'] else "Unusual Traffic Spike/Drop"
        anomaly_list.append({
            "base_station_id": row['cell_id'],
            "anomaly_type": anomaly_type,
            "timestamp": row['timestamp'].isoformat(),
            "severity": "high",
            "details": f"Observed: {row['traffic_volume']:.2f}, Expected Range: [{row['yhat_lower']:.2f}, {row['yhat_upper']:.2f}]"
        })
        
    return anomaly_list