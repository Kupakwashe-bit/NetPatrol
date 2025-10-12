import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
from data_upload import handle_upload
from anomaly_detection import preprocess_data, detect_anomalies
from alerts import generate_alerts

st.title("NetGuard AI: Base Station Anomaly Detection")

# Data Upload
st.header("1. Upload Dataset")
df = handle_upload()

if df is not None:
    # Anomaly Detection
    st.header("2. Anomaly Detection")
    processed_df = preprocess_data(df.copy())
    anomalies = detect_anomalies(processed_df.copy())
    
    # Display Alerts
    generate_alerts(anomalies)
    
    # Data Visualization
    st.header("3. Traffic Visualization")
    st.line_chart(processed_df.set_index('timestamp')['traffic_volume'])
    
    # Highlight anomalies on the chart
    if anomalies:
        anomaly_df = processed_df[processed_df['anomaly'] == -1]
        st.write("Anomalies Detected:")
        st.dataframe(anomaly_df)
        
        fig, ax = plt.subplots()
        ax.plot(processed_df['timestamp'], processed_df['traffic_volume'], label='Normal Traffic')
        ax.scatter(anomaly_df['timestamp'], anomaly_df['traffic_volume'], color='red', label='Anomaly')
        ax.legend()
        st.pyplot(fig)