from flask import Flask, request, jsonify, send_from_directory
import pandas as pd
import numpy as np
import os
import json
import uuid
from werkzeug.utils import secure_filename

app = Flask(__name__, static_folder='static')

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Allowed file extensions
ALLOWED_EXTENSIONS = {'csv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

@app.route('/api/upload', methods=['POST'])
def upload_file():
    # Check if file is present in request
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    # Check if file was selected
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    # Check if file type is allowed
    if file and allowed_file(file.filename):
        # Generate a random unique ID for the file
        file_id = str(uuid.uuid4())
        
        # Secure the filename and save the file
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}_{filename}")
        file.save(file_path)
        
        # Process the file with pandas
        try:
            df = pd.read_csv(file_path)
            
            # Get basic info about the dataset
            columns = df.columns.tolist()
            num_rows = len(df)
            
            # Get sample data (first 10 rows)
            sample_data = df.head(10).to_dict(orient='records')
            
            # Determine column types
            column_types = {}
            for column in columns:
                if pd.api.types.is_numeric_dtype(df[column]):
                    column_types[column] = 'numeric'
                elif pd.api.types.is_datetime64_dtype(df[column]):
                    column_types[column] = 'datetime'
                else:
                    column_types[column] = 'categorical'
            
            return jsonify({
                'fileId': file_id,
                'filename': filename,
                'columns': columns,
                'columnTypes': column_types,
                'numRows': num_rows,
                'sampleData': sample_data
            })
            
        except Exception as e:
            # If there's an error processing the file
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/data/<file_id>', methods=['GET'])
def get_data(file_id):
    # Find the file with the given ID
    files = [f for f in os.listdir(app.config['UPLOAD_FOLDER']) if f.startswith(file_id)]
    
    if not files:
        return jsonify({'error': 'File not found'}), 404
    
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], files[0])
    
    try:
        df = pd.read_csv(file_path)
        data = df.to_dict(orient='records')
        return jsonify({'data': data})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats/<file_id>', methods=['GET'])
def get_stats(file_id):
    # Find the file with the given ID
    files = [f for f in os.listdir(app.config['UPLOAD_FOLDER']) if f.startswith(file_id)]
    
    if not files:
        return jsonify({'error': 'File not found'}), 404
    
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], files[0])
    
    try:
        df = pd.read_csv(file_path)
        
        # Calculate statistics for numeric columns
        stats = {}
        for column in df.columns:
            if pd.api.types.is_numeric_dtype(df[column]):
                # Calculate statistics for numeric columns
                stats[column] = {
                    'mean': float(df[column].mean()),
                    'median': float(df[column].median()),
                    'min': float(df[column].min()),
                    'max': float(df[column].max()),
                    'std': float(df[column].std()),
                    'nullCount': int(df[column].isna().sum()),
                    'uniqueCount': int(df[column].nunique())
                }
            else:
                # For non-numeric columns, provide categorical statistics
                stats[column] = {
                    'uniqueCount': int(df[column].nunique()),
                    'nullCount': int(df[column].isna().sum()),
                    'topValues': df[column].value_counts().head(5).to_dict()
                }
        
        return jsonify({'stats': stats})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze/<file_id>', methods=['POST'])
def analyze_data(file_id):
    # Find the file with the given ID
    files = [f for f in os.listdir(app.config['UPLOAD_FOLDER']) if f.startswith(file_id)]
    
    if not files:
        return jsonify({'error': 'File not found'}), 404
    
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], files[0])
    
    # Get analysis parameters from request
    params = request.json
    analysis_type = params.get('type', 'histogram')
    x_column = params.get('xColumn')
    y_column = params.get('yColumn')
    group_by = params.get('groupBy')
    
    if not x_column:
        return jsonify({'error': 'X column is required'}), 400
    
    try:
        print(f"Reading file: {file_path}")
        df = pd.read_csv(file_path)
        print(f"Columns available: {df.columns.tolist()}")
        
        # Check if the requested columns exist
        if x_column not in df.columns:
            return jsonify({'error': f'Column {x_column} not found in dataset'}), 400
        
        if y_column and y_column not in df.columns:
            return jsonify({'error': f'Column {y_column} not found in dataset'}), 400
            
        if group_by and group_by not in df.columns:
            return jsonify({'error': f'Column {group_by} not found in dataset'}), 400
        
        # Perform analysis based on the type
        result = {}
        
        if analysis_type == 'histogram':
            # Create histogram data
            hist_data = df[x_column].dropna()
            counts, bin_edges = np.histogram(hist_data, bins='auto')
            
            # Create bins with labels (use middle of bin as label)
            bins = []
            for i in range(len(counts)):
                bin_center = (bin_edges[i] + bin_edges[i+1]) / 2
                bins.append({
                    'bin': float(bin_center),
                    'count': int(counts[i])
                })
            
            result = {
                'type': 'histogram',
                'xColumn': x_column,
                'bins': bins
            }
            
        elif analysis_type == 'scatter':
            if not y_column:
                return jsonify({'error': 'Y column is required for scatter plot'}), 400
            
            # Create scatter plot data
            scatter_data = df[[x_column, y_column]].dropna().to_dict(orient='records')
            
            # If group_by is provided, add that information
            if group_by:
                scatter_data = df[[x_column, y_column, group_by]].dropna().to_dict(orient='records')
            
            result = {
                'type': 'scatter',
                'xColumn': x_column,
                'yColumn': y_column,
                'groupBy': group_by,
                'data': scatter_data[:1000]  # Limit data points to prevent browser overload
            }
            
        elif analysis_type == 'bar' or analysis_type == 'line':
            if not y_column:
                return jsonify({'error': 'Y column is required for bar/line chart'}), 400
            
            try:
                # Group by x_column and calculate mean of y_column
                if group_by:
                    # For grouped bar/line charts
                    print(f"Creating grouped {analysis_type} chart: {x_column}, {y_column}, grouped by {group_by}")
                    grouped = df.groupby([x_column, group_by])[y_column].mean().reset_index()
                    categories = sorted(df[x_column].unique().tolist())
                    groups = sorted(df[group_by].unique().tolist())
                    
                    # Reshape data for easier consumption by frontend
                    data = []
                    for category in categories:
                        category_data = {'category': category}
                        for group in groups:
                            value = grouped[(grouped[x_column] == category) & 
                                            (grouped[group_by] == group)][y_column].values
                            category_data[str(group)] = float(value[0]) if len(value) > 0 else 0
                        data.append(category_data)
                    
                    result = {
                        'type': analysis_type,
                        'xColumn': x_column,
                        'yColumn': y_column,
                        'groupBy': group_by,
                        'categories': categories,
                        'groups': groups,
                        'data': data
                    }
                else:
                    # For simple bar/line charts
                    print(f"Creating simple {analysis_type} chart: {x_column}, {y_column}")
                    grouped = df.groupby(x_column)[y_column].mean().reset_index()
                    data = grouped.to_dict(orient='records')
                    
                    result = {
                        'type': analysis_type,
                        'xColumn': x_column,
                        'yColumn': y_column,
                        'data': data
                    }
            except Exception as e:
                print(f"Error creating {analysis_type} chart: {str(e)}")
                return jsonify({'error': f'Error creating chart: {str(e)}'}), 500
                
        elif analysis_type == 'pie':
            # Create pie chart data (count or sum)
            try:
                if y_column:
                    # Sum y_column values for each x_column category
                    print(f"Creating pie chart with values: {x_column} (labels), {y_column} (values)")
                    grouped = df.groupby(x_column)[y_column].sum().reset_index()
                else:
                    # Count occurrences of each x_column category
                    print(f"Creating pie chart with counts: {x_column}")
                    grouped = df[x_column].value_counts().reset_index()
                    grouped.columns = [x_column, 'count']
                    y_column = 'count'
                
                # Limit to top 10 categories for readability
                grouped = grouped.nlargest(10, y_column)
                data = grouped.to_dict(orient='records')
                
                result = {
                    'type': 'pie',
                    'labelColumn': x_column,
                    'valueColumn': y_column,
                    'data': data
                }
            except Exception as e:
                print(f"Error creating pie chart: {str(e)}")
                return jsonify({'error': f'Error creating pie chart: {str(e)}'}), 500
            
        elif analysis_type == 'correlation':
            # Calculate correlation matrix for numeric columns
            numeric_df = df.select_dtypes(include=[np.number])
            corr_matrix = numeric_df.corr().round(2)
            
            # Convert to list of records for easier consumption
            corr_data = []
            for col1 in corr_matrix.columns:
                for col2 in corr_matrix.columns:
                    corr_data.append({
                        'column1': col1,
                        'column2': col2,
                        'correlation': float(corr_matrix.loc[col1, col2])
                    })
            
            result = {
                'type': 'correlation',
                'columns': numeric_df.columns.tolist(),
                'data': corr_data
            }
        
        print(f"Analysis complete, result type: {result.get('type')}")
        return jsonify(result)
    except Exception as e:
        print(f"Error in analyze_data: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)