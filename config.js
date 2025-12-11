// Configuration file for Google Sheets API

const CONFIG = {
    API_BASE_URL: 'https://sheets.googleapis.com/v4/spreadsheets',
    // Set your credentials here
    sheetId: '1PNzpurUlFilnZvbXP7PmY16pU_Va5XuwchhVJFa5ZII',
    sheetName: 'Sheet1',
    apiKey: 'AIzaSyCljZNrc5QTVSjOm5-uyK5BSX-dWvQmhM4',
};

// Store configuration in localStorage
function saveConfig(sheetId, sheetName, apiKey) {
    localStorage.setItem('sheetId', sheetId);
    localStorage.setItem('sheetName', sheetName);
    localStorage.setItem('apiKey', apiKey);
    CONFIG.sheetId = sheetId;
    CONFIG.sheetName = sheetName;
    CONFIG.apiKey = apiKey;
}

// Get stored configuration
function loadConfig() {
    // Use localStorage if available, otherwise fall back to hardcoded config
    CONFIG.sheetId = localStorage.getItem('sheetId') || CONFIG.sheetId;
    CONFIG.sheetName = localStorage.getItem('sheetName') || CONFIG.sheetName;
    CONFIG.apiKey = localStorage.getItem('apiKey') || CONFIG.apiKey;
    return CONFIG;
}

// Check if configuration is complete
function isConfigValid() {
    return CONFIG.sheetId && CONFIG.apiKey;
}
