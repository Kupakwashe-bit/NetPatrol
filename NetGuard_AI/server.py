from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
import requests
from anomaly_detection import preprocess_data, detect_anomalies
from alerting import send_email_alert

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

UPLOAD_DIR = "uploads"

@app.route('/api/alerts/send-report', methods=['POST'])
def send_alert_report():
    data = request.get_json()
    recipient_email = data.get('email')

    if not recipient_email:
        return jsonify({'error': 'Email is required'}), 400

    try:
        # Fetch live alerts from the Node.js server
        response = requests.get('http://localhost:5000/api/alerts')
        response.raise_for_status() # Raise an exception for bad status codes
        live_alerts = response.json()
    except requests.exceptions.RequestException as e:
        print(f"Failed to fetch live alerts: {e}")
        return jsonify({'error': 'Failed to fetch live alerts from the main server.'}), 500

    if not live_alerts:
        return jsonify({'message': 'No active alerts to report.'}), 200

    email_sent = send_email_alert(recipient_email, live_alerts)

    if email_sent:
        return jsonify({'message': f'Successfully sent alert report to {recipient_email}.'}), 200
    else:
        return jsonify({'error': 'Failed to send email report.'}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_traffic():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if file:
        if not os.path.exists(UPLOAD_DIR):
            os.makedirs(UPLOAD_DIR)
        
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        file.save(file_path)

        try:
            df = pd.read_csv(file_path)
        except Exception as e:
            return jsonify({'error': f'Error reading file: {e}'}), 400

        # Standardize column names
        df.columns = df.columns.str.strip()
        column_mapping = {
            'Time': 'timestamp',
            'Cell_ID': 'cell_id',
            'Total _Traffic(GigaBytes)': 'traffic_volume'
        }
        df.rename(columns=column_mapping, inplace=True)

        required_columns = ['timestamp', 'cell_id', 'traffic_volume']
        if not all(col in df.columns for col in required_columns):
            return jsonify({'error': 'Dataset must contain the required columns'}), 400

        processed_df = preprocess_data(df.copy())
        anomalies = detect_anomalies(processed_df.copy())
        
        # Prepare data for charting
        chart_data = processed_df[['timestamp', 'traffic_volume']].to_dict(orient='records')

        # Convert timestamps to ISO format for consistency
        for item in chart_data:
            item['timestamp'] = item['timestamp'].isoformat()

        return jsonify({
            'anomalies': anomalies,
            'chartData': chart_data
        })

if __name__ == '__main__':
    app.run(debug=True, port=5001) # Running on a different port
