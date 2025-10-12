from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
from anomaly_detection import preprocess_data, detect_anomalies
from alerting import send_email_alert

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

UPLOAD_DIR = "uploads"

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

        # Send email alert if anomalies are found
        if anomalies:
            send_email_alert('nyangurukupakwashe@gmail.com', anomalies)

        return jsonify({
            'anomalies': anomalies,
            'chartData': chart_data
        })

if __name__ == '__main__':
    app.run(debug=True, port=5001) # Running on a different port
