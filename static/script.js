document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const fileInput = document.getElementById('csv-file');
    const fileNameDisplay = document.getElementById('file-name');
    const dataPreviewSection = document.getElementById('data-preview-section');
    const dataPreviewTable = document.getElementById('data-preview');
    const visualizationSection = document.getElementById('visualization-section');
    const analysisSection = document.getElementById('analysis-section');
    const chartTypeSelect = document.getElementById('chart-type');
    const xAxisSelect = document.getElementById('x-axis');
    const yAxisSelect = document.getElementById('y-axis');
    const colorBySelect = document.getElementById('color-by');
    const colorGroup = document.getElementById('color-group');
    const generateChartBtn = document.getElementById('generate-chart');
    const chartContainer = document.getElementById('chart-container');
    const summaryContainer = document.getElementById('summary-container');

    // Global state
    let parsedData = null;
    let columns = [];
    let columnTypes = {};
    let currentChart = null;
    let currentFileId = null;

    // Listen for file upload
    fileInput.addEventListener('change', handleFileUpload);
    
    // Handle drag and drop
    const uploadLabel = document.querySelector('.file-upload label');
    
    uploadLabel.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    uploadLabel.addEventListener('dragleave', function() {
        this.classList.remove('dragover');
    });
    
    uploadLabel.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        fileInput.files = e.dataTransfer.files;
        handleFileUpload();
    });
    
    // Show loading spinner
    function showLoading(element) {
        const loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading-spinner';
        loadingSpinner.innerHTML = '<div class="spinner"></div>';
        element.appendChild(loadingSpinner);
    }
    
    // Hide loading spinner
    function hideLoading(element) {
        const spinner = element.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }
    
    // Display error message
    function showError(message) {
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        errorContainer.textContent = message;
        document.querySelector('.upload-container').appendChild(errorContainer);
        
        // Remove after 5 seconds
        setTimeout(() => {
            errorContainer.remove();
        }, 5000);
    }

    // Generate chart button click
    generateChartBtn.addEventListener('click', function() {
        generateChart();
        
        // After chart generation, ensure proper sizing
        setTimeout(function() {
            if (typeof resizeChart === 'function') {
                resizeChart();
            }
        }, 300);
    });
    
    // Chart type change event
    chartTypeSelect.addEventListener('change', updateControlsVisibility);
    
    // Create event listeners for all the form controls
    xAxisSelect.addEventListener('change', updateControlsVisibility);
    yAxisSelect.addEventListener('change', updateControlsVisibility);
    
    // Add window resize handler for better chart scaling
    window.addEventListener('resize', function() {
        // If there's an active chart, resize it to fit the container
        if (chartContainer && chartContainer.innerHTML !== '') {
            // Trigger Plotly resize if available
            try {
                Plotly.Plots.resize(chartContainer);
            } catch (e) {
                console.log('Could not resize chart:', e);
            }
        }
    });

    // Function to handle file upload
    function handleFileUpload() {
        if (!fileInput.files.length) return;
        
        const file = fileInput.files[0];
        fileNameDisplay.textContent = file.name;
        
        // Show loading on the upload container
        const uploadContainer = document.querySelector('.upload-container');
        showLoading(uploadContainer);
        
        // Create form data for file upload
        const formData = new FormData();
        formData.append('file', file);
        
        // Send file to backend
        fetch('/api/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Hide loading spinner
            hideLoading(uploadContainer);
            
            // Store file ID for future API calls
            currentFileId = data.fileId;
            
            // Store data received from the backend
            parsedData = data.sampleData;
            columns = data.columns;
            columnTypes = data.columnTypes;
            
            // Display data preview
            displayDataPreview(parsedData);
            
            // Populate control dropdowns
            populateDropdowns(columns, columnTypes);
            
            // Show sections
            dataPreviewSection.classList.remove('hidden');
            visualizationSection.classList.remove('hidden');
            analysisSection.classList.remove('hidden');
            
            // Load and display summary statistics
            loadSummaryStatistics();
            
            // Show first visualization automatically
            generateChart();
        })
        .catch(error => {
            hideLoading(uploadContainer);
            console.error('Error uploading file:', error);
            showError('Error uploading file. Please try again.');
        });
    }
    
    // Function to load summary statistics from backend
    function loadSummaryStatistics() {
        if (!currentFileId) return;
        
        // Show loading on the summary container
        showLoading(summaryContainer);
        
        fetch(`/api/stats/${currentFileId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            hideLoading(summaryContainer);
            displaySummaryStatistics(data.stats);
        })
        .catch(error => {
            hideLoading(summaryContainer);
            console.error('Error loading statistics:', error);
            summaryContainer.innerHTML = '<p class="error">Error loading statistics.</p>';
        });
    }

    // Function to display data preview
    function displayDataPreview(data) {
        if (!data || !data.length) return;
        
        // Clear existing table content
        dataPreviewTable.innerHTML = '';
        
        // Create table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        // Make sure we have columns defined
        if (!columns || columns.length === 0) {
            columns = Object.keys(data[0]);
        }
        
        columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column;
            th.setAttribute('title', column); // Add tooltip for long column names
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        dataPreviewTable.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        
        // Display up to 10 rows for preview
        const rowLimit = Math.min(10, data.length);
        
        for (let i = 0; i < rowLimit; i++) {
            const row = document.createElement('tr');
            
            columns.forEach(column => {
                const td = document.createElement('td');
                
                // Handle different data types appropriately
                let cellValue = data[i][column];
                
                if (cellValue === undefined || cellValue === null) {
                    cellValue = '';
                } else if (typeof cellValue === 'number') {
                    // Format numbers with commas for thousands
                    cellValue = new Intl.NumberFormat().format(cellValue);
                } else if (typeof cellValue === 'string' && cellValue.includes('|')) {
                    // Handle pipe-separated values (like cast lists) with better formatting
                    const values = cellValue.split('|');
                    if (values.length > 1) {
                        const list = document.createElement('ul');
                        list.className = 'cell-list';
                        values.forEach(value => {
                            const item = document.createElement('li');
                            item.textContent = value.trim();
                            list.appendChild(item);
                        });
                        td.appendChild(list);
                        
                        // Make cell expandable if it has many items
                        if (values.length > 3) {
                            td.classList.add('expandable');
                            td.classList.add('has-more');
                            
                            // Add click event to expand/collapse
                            td.addEventListener('click', function() {
                                this.classList.toggle('expanded');
                            });
                        }
                        
                        row.appendChild(td);
                        return; // Skip the rest of this iteration
                    }
                } else if (typeof cellValue === 'string' && cellValue.length > 50) {
                    // Handle long text with ellipsis and expandable
                    const shortValue = cellValue.substring(0, 50);
                    const fullValue = cellValue;
                    
                    // Create expandable element
                    const expandableText = document.createElement('div');
                    expandableText.className = 'expandable-text';
                    expandableText.innerHTML = `
                        <span class="short-text">${shortValue}...</span>
                        <span class="full-text" style="display:none">${fullValue}</span>
                    `;
                    
                    td.appendChild(expandableText);
                    td.classList.add('expandable');
                    td.classList.add('has-more');
                    
                    // Add click event to expand/collapse
                    td.addEventListener('click', function() {
                        const shortText = this.querySelector('.short-text');
                        const fullText = this.querySelector('.full-text');
                        
                        if (shortText.style.display !== 'none') {
                            shortText.style.display = 'none';
                            fullText.style.display = 'block';
                            this.classList.add('expanded');
                        } else {
                            shortText.style.display = 'inline';
                            fullText.style.display = 'none';
                            this.classList.remove('expanded');
                        }
                    });
                    
                    row.appendChild(td);
                    return; // Skip the rest of this iteration
                } else if (typeof cellValue === 'string' && cellValue.startsWith('http')) {
                    // Handle URLs
                    const link = document.createElement('a');
                    link.href = cellValue;
                    link.target = '_blank';
                    link.textContent = cellValue;
                    td.appendChild(link);
                    row.appendChild(td);
                    return; // Skip the rest of this iteration
                }
                
                // For regular values
                td.textContent = cellValue;
                row.appendChild(td);
            });
            
            tbody.appendChild(row);
        }
        
        dataPreviewTable.appendChild(tbody);
    }

    // Function to populate dropdowns
    function populateDropdowns(columns, columnTypes) {
        // Clear existing options
        xAxisSelect.innerHTML = '';
        yAxisSelect.innerHTML = '';
        colorBySelect.innerHTML = '<option value="">None</option>';
        
        // Add options for each column
        columns.forEach(column => {
            const type = columnTypes[column];
            
            // X-axis (all columns)
            const xOption = document.createElement('option');
            xOption.value = column;
            xOption.textContent = column;
            if (type) {
                xOption.dataset.type = type;
            }
            xAxisSelect.appendChild(xOption);
            
            // Y-axis (prefer numeric)
            const yOption = document.createElement('option');
            yOption.value = column;
            yOption.textContent = column;
            if (type) {
                yOption.dataset.type = type;
            }
            yAxisSelect.appendChild(yOption);
            
            // Color by (all columns)
            const colorOption = document.createElement('option');
            colorOption.value = column;
            colorOption.textContent = column;
            if (type) {
                colorOption.dataset.type = type;
            }
            colorBySelect.appendChild(colorOption);
        });
        
        // Select numeric columns by default if possible
        let numericFound = false;
        for (let i = 0; i < yAxisSelect.options.length; i++) {
            const option = yAxisSelect.options[i];
            if (option.dataset.type === 'numeric') {
                yAxisSelect.selectedIndex = i;
                numericFound = true;
                break;
            }
        }
        
        // If no numeric column found, select the second column if available
        if (!numericFound && columns.length > 1) {
            yAxisSelect.selectedIndex = 1;
        }
        
        // Update visibility based on chart type
        updateControlsVisibility();
    }

    // Function to update controls visibility based on chart type
    function updateControlsVisibility() {
        const chartType = chartTypeSelect.value;
        
        // Show/hide Y-axis for pie charts
        if (chartType === 'pie') {
            document.querySelector('label[for="y-axis"]').textContent = 'Value:';
            colorGroup.style.display = 'none';
        } else {
            document.querySelector('label[for="y-axis"]').textContent = 'Y-Axis:';
            colorGroup.style.display = 'flex';
        }
        
        // For histogram, only X-axis matters
        if (chartType === 'histogram') {
            document.querySelector('label[for="x-axis"]').textContent = 'Value to Analyze:';
            document.querySelector('label[for="y-axis"]').textContent = 'Frequency (Auto)';
            yAxisSelect.disabled = true;
        } else {
            document.querySelector('label[for="x-axis"]').textContent = 'X-Axis:';
            yAxisSelect.disabled = false;
        }
    }

    // Function to generate the chart
    function generateChart() {
        if (!currentFileId) {
            console.error("No file uploaded yet");
            showError("Please upload a file first");
            return;
        }
        
        const chartType = chartTypeSelect.value;
        const xAxis = xAxisSelect.value;
        const yAxis = yAxisSelect.value;
        const colorBy = colorBySelect.value;
        
        if (!xAxis) {
            console.error("No X-axis selected");
            showError("Please select an X-axis column");
            return;
        }
        
        // For charts that require Y-axis, make sure it's selected
        if ((chartType === 'bar' || chartType === 'line' || chartType === 'scatter') && !yAxis) {
            console.error("No Y-axis selected");
            showError("Please select a Y-axis column");
            return;
        }
        
        // Show loading in chart container
        showLoading(chartContainer);
        
        // Clear any previous chart
        chartContainer.innerHTML = '';
        
        // Prepare analysis request
        const analysisParams = {
            type: chartType,
            xColumn: xAxis,
            yColumn: yAxis,
            groupBy: colorBy || null
        };
        
        console.log("Sending analysis request:", analysisParams);
        
        // Send analysis request to backend
        fetch(`/api/analyze/${currentFileId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(analysisParams)
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.error || 'Server error');
                });
            }
            return response.json();
        })
        .then(result => {
            hideLoading(chartContainer);
            console.log("Received chart data:", result);
            
            try {
                // Create chart based on type and backend data
                switch (chartType) {
                    case 'bar':
                        createBarChart(result, xAxis, yAxis, colorBy);
                        break;
                    case 'line':
                        createLineChart(result, xAxis, yAxis, colorBy);
                        break;
                    case 'scatter':
                        createScatterPlot(result, xAxis, yAxis, colorBy);
                        break;
                    case 'pie':
                        createPieChart(result, xAxis, yAxis);
                        break;
                    case 'histogram':
                        createHistogram(result, xAxis);
                        break;
                    default:
                        createBarChart(result, xAxis, yAxis, colorBy);
                }
            } catch (error) {
                console.error("Error rendering chart:", error);
                chartContainer.innerHTML = `<div class="error-message">Error rendering chart: ${error.message}. Try a different chart type or data columns.</div>`;
            }
        })
        .catch(error => {
            hideLoading(chartContainer);
            console.error('Error generating chart:', error);
            chartContainer.innerHTML = `<div class="error-message">Error generating chart: ${error.message || 'Unknown error'}</div>`;
        });
    }

    // Function to create a scatter plot
    function createScatterPlot(result, xAxis, yAxis, colorBy) {
        let traces = [];
        
        if (colorBy && result.groupBy && result.data && result.data.length > 0) {
            // Get unique values for colorBy from the dataset
            const uniqueColorValues = [...new Set(result.data.map(item => item[result.groupBy]))];
            
            // Create a trace for each color value
            uniqueColorValues.forEach(colorValue => {
                const filteredData = result.data.filter(item => item[result.groupBy] === colorValue);
                
                const trace = {
                    x: filteredData.map(item => item[xAxis]),
                    y: filteredData.map(item => item[yAxis]),
                    name: `${colorBy}: ${colorValue}`,
                    type: 'scatter',
                    mode: 'markers',
                    marker: {
                        size: 10,
                        opacity: 0.7
                    }
                };
                
                traces.push(trace);
            });
        } else if (result.data && result.data.length > 0) {
            // Simple scatter plot
            traces = [{
                x: result.data.map(item => item[xAxis]),
                y: result.data.map(item => item[yAxis]),
                type: 'scatter',
                mode: 'markers',
                marker: {
                    size: 10,
                    color: 'rgba(67, 97, 238, 0.7)',
                    line: {
                        color: 'rgba(67, 97, 238, 1.0)',
                        width: 1
                    }
                }
            }];
        } else {
            throw new Error('Invalid or empty data format for scatter plot');
        }
        
        const layout = {
            title: `${yAxis} vs ${xAxis}`,
            xaxis: { title: xAxis },
            yaxis: { title: yAxis },
            autosize: true,
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
            font: {
                family: 'Inter, Segoe UI, sans-serif'
            },
            hovermode: 'closest'
        };
        
        Plotly.newPlot(chartContainer, traces, layout, {responsive: true});
    }

    // Function to create a pie chart
    function createPieChart(result, labelField, valueField) {
        if (!result.data || result.data.length === 0) {
            throw new Error('No data available for pie chart');
        }
        
        // Use the pre-calculated data from the backend
        const trace = {
            labels: result.data.map(item => item[result.labelColumn]),
            values: result.data.map(item => item[result.valueColumn]),
            type: 'pie',
            textinfo: 'percent',
            hoverinfo: 'label+value+percent',
            hole: 0.4,
            marker: {
                colors: [
                    'rgba(67, 97, 238, 0.8)',
                    'rgba(94, 120, 255, 0.8)',
                    'rgba(72, 191, 227, 0.8)',
                    'rgba(86, 207, 225, 0.8)',
                    'rgba(105, 153, 255, 0.8)',
                    'rgba(131, 166, 240, 0.8)',
                    'rgba(86, 119, 218, 0.8)',
                    'rgba(114, 179, 231, 0.8)',
                    'rgba(58, 86, 212, 0.8)',
                    'rgba(77, 169, 255, 0.8)'
                ]
            }
        };
        
        const layout = {
            title: `Distribution of ${valueField} by ${labelField}`,
            autosize: true,
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
            font: {
                family: 'Inter, Segoe UI, sans-serif'
            },
            margin: {
                l: 20,
                r: 20,
                b: 20,
                t: 80,
                pad: 0
            },
            showlegend: true,
            legend: {
                orientation: 'h',
                xanchor: 'center',
                yanchor: 'bottom',
                y: -0.2,
                x: 0.5
            },
            width: 600,  // Explicit width helps with centering
            height: 450  // Explicit height helps with proportion
        };
        
        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d', 'toggleHover'],
            displaylogo: false,
            toImageButtonOptions: {
                format: 'png',
                filename: 'chart',
                height: 600,
                width: 800,
                scale: 2
            }
        };
        
        // Force a clear of the container first
        chartContainer.innerHTML = '';
        
        // Render the chart with specific size to help centering
        Plotly.newPlot(chartContainer, [trace], layout, config);
        
        // Add class for centering
        chartContainer.classList.add('pie-chart-container');
    }

    // Function to create a histogram
    function createHistogram(result, valueField) {
        if (!result.bins || result.bins.length === 0) {
            throw new Error('No data available for histogram');
        }
        
        // Use the pre-calculated bin data from the backend
        const trace = {
            x: result.bins.map(bin => bin.bin),
            y: result.bins.map(bin => bin.count),
            type: 'bar',
            marker: {
                color: 'rgba(67, 97, 238, 0.7)',
                line: {
                    color: 'rgba(67, 97, 238, 1.0)',
                    width: 1
                }
            }
        };
        
        const layout = {
            title: `Distribution of ${valueField}`,
            xaxis: { title: valueField },
            yaxis: { title: 'Frequency' },
            bargap: 0.05,
            autosize: true,
            plot_bgcolor: 'rgba(0,0,0,0)',
            paper_bgcolor: 'rgba(0,0,0,0)',
            font: {
                family: 'Inter, Segoe UI, sans-serif'
            }
        };
        
        Plotly.newPlot(chartContainer, [trace], layout, {responsive: true});
    }

    // Function to generate summary statistics
    function generateSummaryStatistics(data, columns) {
        summaryContainer.innerHTML = '';
        
        // For each numeric column, calculate statistics
        columns.forEach(column => {
            const values = data.map(item => item[column]).filter(value => 
                value !== null && 
                value !== undefined && 
                typeof value === 'number'
            );
            
            // Skip if no numeric values
            if (!values.length) return;
            
            // Calculate statistics
            const stats = calculateStats(values);
            
            // Create stats cards
            const statGrid = document.createElement('div');
            statGrid.className = 'stat-grid';
            statGrid.innerHTML = `
                <h3>${column}</h3>
                <div class="stat-cards">
                    <div class="stat-card">
                        <h4>Mean</h4>
                        <div class="value">${stats.mean.toFixed(2)}</div>
                    </div>
                    <div class="stat-card">
                        <h4>Median</h4>
                        <div class="value">${stats.median.toFixed(2)}</div>
                    </div>
                    <div class="stat-card">
                        <h4>Min</h4>
                        <div class="value">${stats.min.toFixed(2)}</div>
                    </div>
                    <div class="stat-card">
                        <h4>Max</h4>
                        <div class="value">${stats.max.toFixed(2)}</div>
                    </div>
                    <div class="stat-card">
                        <h4>Std Dev</h4>
                        <div class="value">${stats.stdDev.toFixed(2)}</div>
                    </div>
                </div>
            `;
            
            summaryContainer.appendChild(statGrid);
        });
        
        // Add some basic style to the stat grid
        const style = document.createElement('style');
        style.textContent = `
            .stat-grid {
                margin-bottom: 20px;
                padding-bottom: 20px;
                border-bottom: 1px solid var(--border-color);
            }
            .stat-grid h3 {
                margin-bottom: 10px;
                color: var(--primary-color);
            }
            .stat-cards {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                gap: 10px;
            }
        `;
        summaryContainer.appendChild(style);
    }

    // Function to display summary statistics
    function displaySummaryStatistics(stats) {
        summaryContainer.innerHTML = '';
        
        // For each column, display its statistics
        Object.keys(stats).forEach(column => {
            const columnStats = stats[column];
            
            // Create a section for this column
            const statSection = document.createElement('div');
            statSection.className = 'stat-grid';
            
            // Add a header for the column with marker dot
            const header = document.createElement('h3');
            header.innerHTML = `<span class="stat-marker"></span> ${column}`;
            statSection.appendChild(header);
            
            // Create container for the stat cards
            const statCards = document.createElement('div');
            statCards.className = 'stat-cards';
            
            // For numeric columns
            if ('mean' in columnStats) {
                // Format function for large numbers
                const formatNumber = (num) => {
                    if (num === 0) return '0';
                    if (Math.abs(num) >= 1000000) {
                        return new Intl.NumberFormat('en-US', { 
                            maximumFractionDigits: 2,
                            notation: 'compact',
                            compactDisplay: 'short'
                        }).format(num);
                    }
                    return new Intl.NumberFormat('en-US', { 
                        maximumFractionDigits: 2 
                    }).format(num);
                };
                
                // Add numerical statistics
                const numericStats = [
                    { label: 'Mean', value: formatNumber(columnStats.mean) },
                    { label: 'Median', value: formatNumber(columnStats.median) },
                    { label: 'Min', value: formatNumber(columnStats.min) },
                    { label: 'Max', value: formatNumber(columnStats.max) },
                    { label: 'Std Dev', value: formatNumber(columnStats.std) },
                    { label: 'Unique Values', value: columnStats.uniqueCount }
                ];
                
                numericStats.forEach(stat => {
                    const card = createStatCard(stat.label, stat.value);
                    statCards.appendChild(card);
                });
            } else {
                // For categorical columns
                // Add a card for unique count
                const uniqueCard = createStatCard('Unique Values', columnStats.uniqueCount);
                statCards.appendChild(uniqueCard);
                
                // Add top values if available
                if (columnStats.topValues) {
                    const topValuesCard = document.createElement('div');
                    topValuesCard.className = 'stat-card top-values';
                    topValuesCard.innerHTML = '<h4>Top Values</h4>';
                    
                    // Create a list of top values
                    const topValuesList = document.createElement('ul');
                    Object.entries(columnStats.topValues)
                        .sort((a, b) => b[1] - a[1]) // Sort by count
                        .forEach(([value, count]) => {
                            const item = document.createElement('li');
                            item.innerHTML = `<span class="value-name">${value}</span> <span class="value-count">${count}</span>`;
                            topValuesList.appendChild(item);
                        });
                    
                    topValuesCard.appendChild(topValuesList);
                    statCards.appendChild(topValuesCard);
                }
            }
            
            statSection.appendChild(statCards);
            summaryContainer.appendChild(statSection);
        });
    }
    
    // Helper function to create a stat card
    function createStatCard(label, value) {
        const card = document.createElement('div');
        card.className = 'stat-card';
        
        const labelElement = document.createElement('h4');
        labelElement.textContent = label;
        
        const valueElement = document.createElement('div');
        valueElement.className = 'value';
        valueElement.textContent = value;
        
        card.appendChild(labelElement);
        card.appendChild(valueElement);
        
        return card;
    }
});