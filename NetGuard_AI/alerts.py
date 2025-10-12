import streamlit as st

def generate_alerts(anomalies):
    """
    Generates and displays alerts for detected anomalies.
    """
    if not anomalies:
        st.info("No anomalies detected.")
        return

    st.subheader("Anomaly Alerts")
    for anomaly in anomalies:
        severity = anomaly.get("severity", "low").lower()
        if severity == "high":
            st.error(f"**High Severity Anomaly** at Base Station `{anomaly['base_station_id']}`")
        elif severity == "medium":
            st.warning(f"**Medium Severity Anomaly** at Base Station `{anomaly['base_station_id']}`")
        else:
            st.info(f"**Low Severity Anomaly** at Base Station `{anomaly['base_station_id']}`")
        
        st.json(anomaly)