import streamlit as st
import pandas as pd
import os

UPLOAD_DIR = "uploads"

def handle_upload():
    """
    Handles the file upload and validation.
    """
    uploaded_file = st.file_uploader("Choose a dataset", type=["csv", "json"])
    
    if uploaded_file is not None:
        # Validate file type
        # Streamlit handles type validation with the 'type' parameter, 
        # but we can add extra checks if needed.
        
        # Save the uploaded file to a temporary directory
        if not os.path.exists(UPLOAD_DIR):
            os.makedirs(UPLOAD_DIR)
        
        file_path = os.path.join(UPLOAD_DIR, uploaded_file.name)
        with open(file_path, "wb") as f:
            f.write(uploaded_file.getbuffer())
        
        # Load and validate the dataset
        try:
            # Attempt to read as CSV first, as it's the more common format
            df = pd.read_csv(file_path)
        except Exception as csv_error:
            try:
                # If CSV reading fails, attempt to read as JSON
                df = pd.read_json(file_path)
            except Exception as json_error:
                st.error(f"Error reading file. Could not parse as CSV or JSON.")
                st.error(f"CSV Error: {csv_error}")
                st.error(f"JSON Error: {json_error}")
                return None
            
        # Standardize column names
        df.columns = df.columns.str.strip()
        column_mapping = {
            'Time': 'timestamp',
            'Cell_ID': 'cell_id',
            'Total _Traffic(GigaBytes)': 'traffic_volume' # Corrected key with space
        }
        df.rename(columns=column_mapping, inplace=True)

        # Validate columns
        required_columns = ['timestamp', 'cell_id', 'traffic_volume']
        if not all(col in df.columns for col in required_columns):
            st.error(f"Dataset must contain the following columns or their equivalents: {required_columns}")
            st.write("Columns found after processing:")
            st.write(list(df.columns))
            return None
            
        st.success("Dataset uploaded and validated successfully!")
        return df
        
    return None