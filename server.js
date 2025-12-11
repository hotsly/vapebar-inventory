const http = require('http');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const PORT = process.env.PORT || 3000;

// Load service account credentials
let credentials;
if (process.env.GOOGLE_CREDENTIALS) {
    // Production: Load from environment variable
    try {
        credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        console.log('✓ Loaded credentials from environment variable');
    } catch (error) {
        console.error('Error parsing GOOGLE_CREDENTIALS:', error.message);
        process.exit(1);
    }
} else {
    // Local Development: Load from file
    const CREDENTIALS_PATH = path.join(__dirname, 'vapebar-api-5b17d0b56303.json');
    if (fs.existsSync(CREDENTIALS_PATH)) {
        credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
        console.log('✓ Loaded credentials from local file');
    } else {
        console.error('No credentials found! Set GOOGLE_CREDENTIALS env var or ensure json file exists.');
        process.exit(1);
    }
}

// Create JWT client for Google Sheets API
const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Ensure sheet exists, if not create it with headers
 */
async function ensureSheetExists(spreadsheetId, sheetName, headers = []) {
    try {
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId,
        });

        // Check if sheet exists
        const sheetExists = spreadsheet.data.sheets?.some(s => s.properties.title === sheetName);

        if (!sheetExists) {
            console.log(`Creating sheet: ${sheetName}`);

            // Add new sheet
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: sheetName
                            }
                        }
                    }]
                }
            });

            // Add headers if provided
            if (headers.length > 0) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `${sheetName}!A1`,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [headers]
                    }
                });
            }

            console.log(`✓ Sheet created: ${sheetName}`);
        }
    } catch (error) {
        console.error('Error ensuring sheet exists:', error.message);
    }
}

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Log request
    console.log(`${new Date().toLocaleTimeString()} - ${req.method} ${req.url}`);

    // API Routes
    if (req.url.startsWith('/api/')) {
        if (req.url.startsWith('/api/sheets/read')) {
            const urlParams = new URL(req.url, `http://localhost:${PORT}`).searchParams;
            const spreadsheetId = urlParams.get('spreadsheetId');
            const range = urlParams.get('range') || 'Sheet1';

            try {
                // Choose headers based on sheet name
                let headers = [];
                if (range === 'Inventory') {
                    headers = ['ID', 'Category', 'Item Name', 'Version', 'Flavor', 'Quantity', 'Price', 'Date Added', 'Notes'];
                } else if (range === 'Sales') {
                    headers = ['Sale ID', 'Item ID', 'Item Name', 'Category', 'Quantity Sold', 'Price Per Unit', 'Total', 'Date', 'Customer', 'Sale Type', 'Payment Method', 'Notes'];
                } else if (range === 'Loans') {
                    headers = ['Loan ID', 'Sale ID', 'Customer', 'Item Name', 'Amount', 'Date Issued', 'Due Date', 'Status', 'Date Paid', 'Notes'];
                }

                // Ensure sheet exists
                await ensureSheetExists(spreadsheetId, range, headers);

                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range,
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    headers: response.data.values?.[0] || [],
                    data: response.data.values?.slice(1) || []
                }));
            } catch (error) {
                console.error('Error reading sheet:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        } else if (req.url === '/api/sheets/delete') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const { spreadsheetId, sheetName, rowIndex } = JSON.parse(body);

                    // Get sheet ID
                    const spreadsheet = await sheets.spreadsheets.get({
                        spreadsheetId,
                    });

                    const sheet = spreadsheet.data.sheets?.find(s => s.properties.title === sheetName);
                    if (!sheet) {
                        throw new Error('Sheet not found');
                    }

                    // Delete the row
                    await sheets.spreadsheets.batchUpdate({
                        spreadsheetId,
                        resource: {
                            requests: [{
                                deleteRange: {
                                    range: {
                                        sheetId: sheet.properties.sheetId,
                                        startRowIndex: rowIndex,
                                        endRowIndex: rowIndex + 1
                                    },
                                    shiftDimension: 'ROWS'
                                }
                            }]
                        }
                    });

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error('Error deleting row:', error.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
        } else if (req.url.startsWith('/api/sheets/append')) {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const { spreadsheetId, range, values } = JSON.parse(body);

                    // Choose headers based on sheet name
                    let headers = [];
                    if (range === 'Inventory') {
                        headers = ['ID', 'Category', 'Item Name', 'Version', 'Flavor', 'Quantity', 'Price', 'Date Added', 'Notes'];
                    } else if (range === 'Sales') {
                        headers = ['Sale ID', 'Item ID', 'Item Name', 'Category', 'Quantity Sold', 'Price Per Unit', 'Total', 'Date', 'Customer', 'Sale Type', 'Payment Method', 'Notes'];
                    }

                    // Ensure sheet exists
                    await ensureSheetExists(spreadsheetId, range, headers);

                    const response = await sheets.spreadsheets.values.append({
                        spreadsheetId,
                        range,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: [values] },
                    });

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error('Error appending to sheet:', error.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
        } else if (req.url === '/api/sheets/update') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const { spreadsheetId, range, values } = JSON.parse(body);

                    const response = await sheets.spreadsheets.values.update({
                        spreadsheetId,
                        range,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values }
                    });

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error('Error updating range:', error.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
        } else if (req.url === '/api/sheets/recordSale') {
            // Record a sale: append to Sales sheet and decrement Inventory quantity
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    console.log('Received body:', body);
                    const { spreadsheetId, sale } = JSON.parse(body);
                    console.log('Parsed - spreadsheetId:', spreadsheetId, 'sale:', sale);

                    if (!spreadsheetId || !sale) {
                        console.error('Missing fields - spreadsheetId:', spreadsheetId, 'sale:', sale);
                        throw new Error('Missing required fields');
                    }

                    // Ensure Sales sheet exists
                    await ensureSheetExists(spreadsheetId, 'Sales', ['Sale ID', 'Item ID', 'Item Name', 'Category', 'Quantity Sold', 'Price Per Unit', 'Total', 'Date', 'Customer', 'Sale Type', 'Payment Method', 'Notes']);

                    // Ensure Loans sheet exists
                    await ensureSheetExists(spreadsheetId, 'Loans', ['Loan ID', 'Sale ID', 'Customer', 'Item Name', 'Amount', 'Date Issued', 'Due Date', 'Status', 'Date Paid', 'Notes']);

                    // Load inventory values to find item rows and details
                    const invRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Inventory' });
                    const values = invRes.data.values || [];

                    // Handle bulk sales with multiple items
                    if (sale.bulkItems && sale.bulkItems.length > 0) {
                        // Process multiple items for bulk sale
                        const saleId = Date.now().toString();
                        const sellQty = parseInt(sale.quantitySold || 0);
                        const appliedPrice = parseFloat(sale.appliedPrice || 0) || 0;
                        const total = (appliedPrice * sellQty).toFixed(2);
                        const date = sale.date || new Date().toISOString().slice(0, 10);
                        const saleType = sale.saleType || 'bulk';

                        // Get category from first item (assuming all bulk items are same category)
                        let category = 'Bulk';
                        let itemName = `Bulk Sale (${sale.bulkItems.length} flavors)`;

                        console.log('Bulk sale payment method:', sale.paymentMethod);
                        console.log('Full sale object:', sale);

                        // Prepare sale row
                        const saleRow = [saleId, 'BULK', itemName, category, sellQty, appliedPrice, total, date, sale.customer || '', saleType, sale.paymentMethod || 'Cash', sale.notes || ''];
                        console.log('Sale row array:', saleRow);
                        console.log('Sale row length:', saleRow.length);

                        // Append sale
                        const bulkAppendPayload = {
                            spreadsheetId,
                            range: 'Sales',
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: [saleRow] }
                        };
                        console.log('BULK: ABOUT TO SEND TO GOOGLE SHEETS API:', JSON.stringify(bulkAppendPayload, null, 2));

                        const bulkAppendResponse = await sheets.spreadsheets.values.append(bulkAppendPayload);
                        console.log('BULK: GOOGLE SHEETS API RESPONSE:', JSON.stringify(bulkAppendResponse.data, null, 2));

                        // If payment method is Loan, record it in Loans sheet
                        if (sale.paymentMethod === 'Loan') {
                            const loanId = `LOAN-${saleId}`;
                            const customerName = sale.customer || 'Unknown Customer';
                            const dueDate = ''; // Can be set by user later
                            const loanRow = [loanId, saleId, customerName, itemName, total, date, dueDate, 'Unpaid', '', sale.notes || ''];

                            await sheets.spreadsheets.values.append({
                                spreadsheetId,
                                range: 'Loans',
                                valueInputOption: 'USER_ENTERED',
                                resource: { values: [loanRow] }
                            });
                            console.log('Loan recorded:', loanId);
                        }

                        // Update inventory for each item in the bulk
                        for (const bulkItem of sale.bulkItems) {
                            const itemId = bulkItem.itemId;
                            const qtyToDeduct = parseInt(bulkItem.qty || 0);

                            // Find item row
                            let foundIndex = -1;
                            for (let i = 1; i < values.length; i++) {
                                if (values[i][0] && String(values[i][0]) === String(itemId)) {
                                    foundIndex = i;
                                    break;
                                }
                            }

                            if (foundIndex === -1) {
                                console.warn(`Item ID ${itemId} not found in Inventory`);
                                continue;
                            }

                            const itemRow = values[foundIndex];
                            const existingQty = parseInt(itemRow[5] || '0');

                            if (qtyToDeduct > existingQty) {
                                throw new Error(`Insufficient stock for ${itemRow[2]} - ${itemRow[4]}`);
                            }

                            const newQty = existingQty - qtyToDeduct;

                            // Update inventory quantity
                            const rowNumber = foundIndex + 1;
                            const qtyRange = `Inventory!F${rowNumber}`;
                            await sheets.spreadsheets.values.update({
                                spreadsheetId,
                                range: qtyRange,
                                valueInputOption: 'USER_ENTERED',
                                resource: { values: [[String(newQty)]] }
                            });

                            // Update the values array for next iteration
                            values[foundIndex][5] = String(newQty);
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, saleId }));
                    } else {
                        // Handle single item sale (retail or simple sale)
                        if (!sale.itemId) {
                            throw new Error('Item ID is required for non-bulk sales');
                        }

                        // Find item row (values includes header at index 0)
                        let foundIndex = -1;
                        for (let i = 1; i < values.length; i++) {
                            if (values[i][0] && String(values[i][0]) === String(sale.itemId)) {
                                foundIndex = i; // index in values array
                                break;
                            }
                        }

                        if (foundIndex === -1) {
                            throw new Error('Item ID not found in Inventory');
                        }

                        // Extract existing quantity and item details
                        const itemRow = values[foundIndex];
                        const existingQty = parseInt(itemRow[5] || '0');
                        const sellQty = parseInt(sale.quantitySold || 0);

                        if (isNaN(sellQty) || sellQty <= 0) {
                            throw new Error('Invalid quantitySold');
                        }

                        if (sellQty > existingQty) {
                            throw new Error('Insufficient stock');
                        }

                        const newQty = existingQty - sellQty;

                        // Prepare sale row
                        const saleId = Date.now().toString();
                        const itemName = itemRow[2] || '';
                        const category = itemRow[1] || '';

                        // Use applied price (bulk) if available, otherwise use pricePerUnit, otherwise inventory price
                        const appliedPrice = parseFloat(sale.appliedPrice || sale.pricePerUnit || itemRow[6] || 0) || 0;
                        const total = (appliedPrice * sellQty).toFixed(2);
                        const date = sale.date || new Date().toISOString().slice(0, 10);
                        const saleType = sale.saleType || 'retail';

                        console.log('Retail sale payment method:', sale.paymentMethod);
                        console.log('Retail sale payment method type:', typeof sale.paymentMethod);
                        console.log('Full sale object:', JSON.stringify(sale, null, 2));

                        const paymentMethod = sale.paymentMethod || 'Cash';
                        const notes = sale.notes || '';

                        const saleRow = [saleId, sale.itemId, itemName, category, sellQty, appliedPrice, total, date, sale.customer || '', saleType, paymentMethod, notes];
                        console.log('Sale row array:', JSON.stringify(saleRow, null, 2));
                        console.log('Sale row length:', saleRow.length);
                        console.log('Payment method in row (index 10):', saleRow[10]);
                        console.log('Notes in row (index 11):', saleRow[11]);

                        // Append sale
                        const appendPayload = {
                            spreadsheetId,
                            range: 'Sales',
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: [saleRow] }
                        };
                        console.log('ABOUT TO SEND TO GOOGLE SHEETS API:', JSON.stringify(appendPayload, null, 2));

                        const appendResponse = await sheets.spreadsheets.values.append(appendPayload);
                        console.log('GOOGLE SHEETS API RESPONSE:', JSON.stringify(appendResponse.data, null, 2));

                        // If payment method is Loan, record it in Loans sheet
                        if (paymentMethod === 'Loan') {
                            const loanId = `LOAN-${saleId}`;
                            const customerName = sale.customer || 'Unknown Customer';
                            const dueDate = ''; // Can be set by user later
                            const loanRow = [loanId, saleId, customerName, itemName, total, date, dueDate, 'Unpaid', '', notes];

                            await sheets.spreadsheets.values.append({
                                spreadsheetId,
                                range: 'Loans',
                                valueInputOption: 'USER_ENTERED',
                                resource: { values: [loanRow] }
                            });
                            console.log('Loan recorded:', loanId);
                        }

                        // Update inventory quantity cell (Quantity is column F)
                        const rowNumber = foundIndex + 1; // spreadsheet row number
                        const qtyRange = `Inventory!F${rowNumber}`;
                        await sheets.spreadsheets.values.update({
                            spreadsheetId,
                            range: qtyRange,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: [[String(newQty)]] }
                        });

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, saleId, newQuantity: newQty }));
                    }
                } catch (error) {
                    console.error('Error recording sale:', error.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
        }
        return;
    }

    // Serve static files
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Access denied');
        return;
    }

    // Check if file exists
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'text/javascript'
        };

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error');
                return;
            }
            res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
            res.end(data);
        });
    });
});

server.listen(PORT, () => {
    console.log(`\n✅ Server running at http://localhost:${PORT}`);
    console.log(`📁 Using service account: ${credentials.client_email}\n`);
});
