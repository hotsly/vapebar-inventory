// Google Sheets API Integration

class SheetsAPI {
    constructor() {
        this.data = [];
        this.headers = [];
        this.apiUrl = 'http://localhost:3000/api/sheets';
    }

    /**
     * Update a range (server-side)
     */
    async updateRange(range, values) {
        try {
            const url = `${this.apiUrl}/update`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ spreadsheetId: CONFIG.sheetId, range, values })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to update range');
            }

            return await response.json();
        } catch (error) {
            console.error('Error updating range:', error);
            throw error;
        }
    }

    /**
     * Record a sale: append to Sales sheet and decrement inventory (server-side atomic)
     */
    async recordSale(sale) {
        try {
            const url = `${this.apiUrl}/recordSale`;
            const payload = { spreadsheetId: CONFIG.sheetId, sale };
            console.log('Recording sale with payload:', JSON.stringify(payload, null, 2));
            console.log('Payment method in payload:', sale.paymentMethod);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to record sale');
            }

            return result;
        } catch (error) {
            console.error('Error recording sale:', error);
            throw error;
        }
    }

    /**
     * Fetch data from Google Sheets via backend
     */
    async fetchData(sheetName = null) {
        try {
            const sheet = sheetName || CONFIG.sheetName;
            const url = `${this.apiUrl}/read?spreadsheetId=${CONFIG.sheetId}&range=${encodeURIComponent(sheet)}`;
            console.log('Fetching from:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Failed to fetch data from Google Sheets');
            }

            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }

            this.headers = result.headers || [];
            this.data = result.data || [];
            
            return {
                headers: this.headers,
                data: this.data
            };
        } catch (error) {
            console.error('Error fetching data:', error);
            throw error;
        }
    }

    /**
     * Append a new row to the Google Sheet
     */
    async appendRow(rowData, sheetName = null) {
        try {
            const sheet = sheetName || CONFIG.sheetName;
            const url = `${this.apiUrl}/append`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    spreadsheetId: CONFIG.sheetId,
                    range: sheet,
                    values: rowData
                })
            });

            if (!response.ok) {
                throw new Error('Failed to append row');
            }

            const result = await response.json();
            if (result.error) {
                throw new Error(result.error);
            }

            return result;
        } catch (error) {
            console.error('Error appending row:', error);
            throw error;
        }
    }

    /**
     * Clear all data from the sheet (except headers)
     */
    async clearData() {
        try {
            const range = `${CONFIG.sheetName}!A2:Z1000`;
            const url = new URL(`${CONFIG.API_BASE_URL}/${CONFIG.sheetId}/values/${encodeURIComponent(range)}`);
            url.searchParams.append('key', CONFIG.apiKey);

            const response = await fetch(url.toString(), {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || 'Failed to clear data');
            }

            return await response.json();
        } catch (error) {
            console.error('Error clearing data:', error);
            throw error;
        }
    }

    /**
     * Search data locally (client-side search)
     */
    searchData(query) {
        if (!query) return this.data;

        const lowerQuery = query.toLowerCase();
        return this.data.filter(row => 
            row.some(cell => 
                String(cell).toLowerCase().includes(lowerQuery)
            )
        );
    }

    /**
     * Sort data by column index
     */
    sortData(columnIndex, ascending = true) {
        return [...this.data].sort((a, b) => {
            const aVal = a[columnIndex] || '';
            const bVal = b[columnIndex] || '';
            
            // Try numeric comparison first
            if (!isNaN(aVal) && !isNaN(bVal)) {
                return ascending ? aVal - bVal : bVal - aVal;
            }
            
            // Fall back to string comparison
            return ascending 
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
        });
    }

    /**
     * Get unique values from a column
     */
    getUniqueValues(columnIndex) {
        return [...new Set(this.data.map(row => row[columnIndex]))].filter(v => v);
    }
}

// Create a global instance
const sheetsAPI = new SheetsAPI();
