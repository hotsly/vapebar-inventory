// Main Application Logic

document.addEventListener('DOMContentLoaded', function() {
    loadConfig();
    initializeEventListeners();
    checkExistingConfig();
});

/**
 * Initialize all event listeners
 */
function initializeEventListeners() {
    // Connection button
    document.getElementById('connectBtn').addEventListener('click', handleConnect);

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', handleRefresh);

    // Search input
    document.getElementById('searchInput').addEventListener('input', handleSearch);

    // Form submission
    document.getElementById('dataForm').addEventListener('submit', handleFormSubmit);
}

/**
 * Check if configuration already exists
 */
function checkExistingConfig() {
    loadConfig();
    if (isConfigValid()) {
        showDataSection();
        loadData(); // Auto-connect and load data
    }
}

/**
 * Handle connection to Google Sheet
 */
async function handleConnect() {
    const sheetId = document.getElementById('sheetId').value.trim();
    const sheetName = document.getElementById('sheetName').value.trim();
    const apiKey = document.getElementById('apiKey').value.trim();

    if (!sheetId || !apiKey) {
        showStatus('Please fill in Sheet ID and API Key', 'error');
        return;
    }

    saveConfig(sheetId, sheetName, apiKey);
    showStatus('Connecting...', 'info');

    try {
        await sheetsAPI.fetchData();
        showStatus('✓ Connected successfully!', 'success');
        
        // Hide config section and show data section
        document.querySelector('.config-section').style.display = 'none';
        showDataSection();
        
        // Load and display data
        await loadData();
    } catch (error) {
        showStatus(`✗ Connection failed: ${error.message}`, 'error');
        console.error(error);
    }
}

/**
 * Show the data section
 */
function showDataSection() {
    document.getElementById('dataSection').style.display = 'block';
    document.getElementById('formSection').style.display = 'block';
}

/**
 * Load and display data from Google Sheet
 */
async function loadData() {
    const dataSection = document.getElementById('dataSection');
    const loadingMsg = document.getElementById('loadingMessage');
    const errorMsg = document.getElementById('errorMessage');
    
    loadingMsg.style.display = 'block';
    errorMsg.style.display = 'none';

    try {
        await sheetsAPI.fetchData();
        
        renderTable(sheetsAPI.headers, sheetsAPI.data);
        renderFormFields(sheetsAPI.headers);
        
        loadingMsg.style.display = 'none';
    } catch (error) {
        loadingMsg.style.display = 'none';
        errorMsg.textContent = `Error: ${error.message}`;
        errorMsg.style.display = 'block';
        console.error('Error loading data:', error);
    }
}

/**
 * Render the data table
 */
function renderTable(headers, data) {
    const headerRow = document.getElementById('headerRow');
    const dataBody = document.getElementById('dataBody');

    // Clear existing content
    headerRow.innerHTML = '';
    dataBody.innerHTML = '';

    // Render headers
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });

    // Render data rows
    data.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell || '';
            tr.appendChild(td);
        });
        dataBody.appendChild(tr);
    });
}

/**
 * Handle table refresh
 */
async function handleRefresh() {
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Refreshing...';

    try {
        await loadData();
        showStatus('✓ Data refreshed', 'success');
    } catch (error) {
        showStatus(`✗ Refresh failed: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Refresh Data';
    }
}

/**
 * Handle search functionality
 */
function handleSearch(event) {
    const query = event.target.value;
    const searchResults = sheetsAPI.searchData(query);
    renderTable(sheetsAPI.headers, searchResults);
}

/**
 * Render form fields based on headers
 */
function renderFormFields(headers) {
    const formFields = document.getElementById('formFields');
    formFields.innerHTML = '';

    headers.forEach((header, index) => {
        const div = document.createElement('div');
        div.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = header;
        label.htmlFor = `field-${index}`;
        
        const input = document.createElement('input');
        input.type = 'text';
        input.id = `field-${index}`;
        input.className = 'input-field';
        input.placeholder = `Enter ${header}`;
        input.dataset.column = index;
        
        div.appendChild(label);
        div.appendChild(input);
        formFields.appendChild(div);
    });
}

/**
 * Handle form submission to add new row
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    // Collect form data
    const formInputs = document.querySelectorAll('#formFields .input-field');
    const rowData = Array.from(formInputs).map(input => input.value);

    // Validate at least one field is filled
    if (rowData.every(val => !val)) {
        showStatus('Please fill in at least one field', 'error');
        return;
    }

    const btn = event.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = '⏳ Adding...';

    try {
        await sheetsAPI.appendRow(rowData);
        showStatus('✓ Row added successfully!', 'success');
        
        // Clear form
        document.getElementById('dataForm').reset();
        
        // Refresh data
        await loadData();
    } catch (error) {
        showStatus(`✗ Failed to add row: ${error.message}`, 'error');
        console.error('Error adding row:', error);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Row';
    }
}

/**
 * Show status message
 */
function showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    
    // Auto-hide success messages
    if (type === 'success') {
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
}

/**
 * Handle disconnection (optional)
 */
function handleDisconnect() {
    localStorage.removeItem('sheetId');
    localStorage.removeItem('sheetName');
    localStorage.removeItem('apiKey');
    location.reload();
}
