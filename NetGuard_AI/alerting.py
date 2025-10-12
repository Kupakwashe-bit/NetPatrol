import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# IMPORTANT: Set these environment variables in your system
# GMAIL_USER: Your Gmail address (e.g., your-email@gmail.com)
# GMAIL_APP_PASSWORD: The 16-character App Password generated from your Google account
SENDER_EMAIL = os.getenv("GMAIL_USER")
SENDER_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")

def send_email_alert(recipient_email, anomalies):
    """
    Sends an email alert with a summary of detected anomalies.
    """
    if not SENDER_EMAIL or not SENDER_PASSWORD:
        print("Email credentials not set. Skipping email alert.")
        print("Please set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.")
        return

    if not anomalies:
        return

    # Create the email message
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = recipient_email
    msg['Subject'] = f"[NetGuard AI] Anomaly Alert: {len(anomalies)} issues detected"

    # Email body
    body = "<h2>NetGuard AI has detected the following anomalies:</h2>"
    body += "<table border='1' style='border-collapse: collapse; width: 100%;'>"
    body += "<tr><th style='padding: 8px;'>Base Station ID</th><th style='padding: 8px;'>Anomaly Type</th><th style='padding: 8px;'>Timestamp</th><th style='padding: 8px;'>Details</th></tr>"

    for anomaly in anomalies:
        body += f"<tr><td style='padding: 8px;'>{anomaly['base_station_id']}</td><td style='padding: 8px;'>{anomaly['anomaly_type']}</td><td style='padding: 8px;'>{anomaly['timestamp']}</td><td style='padding: 8px;'>{anomaly.get('details', 'N/A')}</td></tr>"
    
    body += "</table>"
    msg.attach(MIMEText(body, 'html'))

    try:
        # Connect to Gmail's SMTP server and send the email
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"Successfully sent alert email to {recipient_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")
