import os
import base64
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these SCOPES, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def get_credentials():
    """Gets valid user credentials from storage or initiates the OAuth 2.0 flow."""
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first time.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'NetGuard_AI/credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return creds

def send_email_alert(recipient_email, anomalies):
    """
    Sends an email alert using the Gmail API with OAuth 2.0.
    """
    if not anomalies:
        return

    creds = get_credentials()
    try:
        service = build('gmail', 'v1', credentials=creds)
        
        # Create the email message
        message = MIMEMultipart()
        message['to'] = recipient_email
        message['subject'] = f"[NetGuard AI] Anomaly Alert: {len(anomalies)} issues detected"

        # Email body
        body = "<h2>NetGuard AI has detected the following anomalies:</h2>"
        body += "<table border='1' style='border-collapse: collapse; width: 100%;'>"
        body += "<tr><th style='padding: 8px;'>Base Station ID</th><th style='padding: 8px;'>Anomaly Type</th><th style='padding: 8px;'>Timestamp</th><th style='padding: 8px;'>Details</th></tr>"

        for anomaly in anomalies:
            body += f"<tr><td style='padding: 8px;'>{anomaly['base_station_id']}</td><td style='padding: 8px;'>{anomaly['anomaly_type']}</td><td style='padding: 8px;'>{anomaly['timestamp']}</td><td style='padding: 8px;'>{anomaly.get('details', 'N/A')}</td></tr>"
        
        body += "</table>"
        message.attach(MIMEText(body, 'html'))

        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {'raw': raw_message}

        # Send the email
        send_message = (service.users().messages().send(userId="me", body=create_message).execute())
        print(f'Sent message to {recipient_email}. Message Id: {send_message["id"]}')
    except HttpError as error:
        print(f'An error occurred: {error}')
        return False
    return True
