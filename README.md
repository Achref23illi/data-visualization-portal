# Data Visualization and Exploration Portal

A platform that allows users to upload their own datasets (CSV files), perform exploratory data analysis, and visualize the results dynamically.

## Overview

This web application lets users upload CSV files, explore the data through interactive visualizations, and automatically generate statistical summaries. The application features a modern, premium user interface with responsive design and supports various chart types for comprehensive data analysis.

## Technologies & Techniques

### Front-end
- HTML5, CSS3, and JavaScript for the user interface
- Interactive charts created with Plotly.js
- CSV parsing with PapaParse
- Premium UI with modern design elements

### Back-end
- Python Flask for server-side processing
- Pandas for data analysis and manipulation
- NumPy for numerical operations

## Features

- **File Upload**: Drag-and-drop interface for CSV files
- **Data Preview**: Interactive table display of uploaded data
- **Visualization Types**:
  - Bar Charts
  - Line Charts
  - Scatter Plots
  - Pie Charts
  - Histograms
- **Data Analysis**: Automatic calculation of summary statistics
- **Responsive Design**: Works on desktop and mobile devices

## Project Structure

```
data_visualization_portal/
├── app.py                 # Flask backend
├── requirements.txt       # Python dependencies
├── uploads/               # Folder for uploaded files (created automatically)
│
└── static/                # Static files for the frontend
    ├── index.html         # Main HTML file
    ├── premium-styles.css # CSS styles for the UI
    └── script.js          # JavaScript functionality
```

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/data-visualization-portal.git
   cd data-visualization-portal
   ```

2. Create a virtual environment and activate it:
   ```
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Start the Flask application:
   ```
   python app.py
   ```

5. Open your browser and navigate to `http://localhost:5000`

## Usage

1. **Upload a Dataset**:
   - Click on the upload area or drag and drop a CSV file
   - The application will parse the file and display a preview

2. **Explore the Data**:
   - Review the data in the preview table
   - Check the automatically generated summary statistics

3. **Create Visualizations**:
   - Select the desired chart type
   - Choose columns for X and Y axes
   - Optionally select a column for color grouping
   - Click "Generate Visualization" to create the chart

4. **Interact with Charts**:
   - Hover over data points for details
   - Zoom in/out of the visualization
   - Download charts as images

## Customization

- Modify `premium-styles.css` to change the appearance
- Edit column detection logic in `script.js` for specific data formats
- Adjust chart parameters in the visualization functions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Plotly.js](https://plotly.com/javascript/) for visualization capabilities
- [PapaParse](https://www.papaparse.com/) for CSV parsing
- [Flask](https://flask.palletsprojects.com/) for the web framework
- [Pandas](https://pandas.pydata.org/) for data analysis