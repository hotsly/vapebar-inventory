# Google Sheets Database App

A modern web application that connects to Google Sheets and uses it as a database. This project allows you to view, search, and add data to a Google Sheet directly from a web interface.

## Features

✨ **Key Features:**
- 🔗 Connect to any Google Sheet using API credentials
- 📊 Display and view all data in a table format
- 🔍 Search functionality to filter data in real-time
- ➕ Add new rows directly from the web form
- 🔄 Refresh data with one click
- 💾 Store configuration in browser's local storage
- 📱 Fully responsive design
- ⚡ Real-time data synchronization

## Getting Started

### Prerequisites

Before you start, you need:
1. A Google Account
2. A Google Sheet created (can be empty or with existing data)
3. Google API Key with Sheets API enabled

### Step 1: Create a Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Add column headers in the first row (e.g., Name, Email, Phone)
4. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/**SHEET_ID**/edit`

### Step 2: Get Google API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the **Google Sheets API**
4. Create an API key (credentials → API key)
5. Restrict the key to Google Sheets API only

### Step 3: Configure the App

1. Open `index.html` in a web browser
2. Enter your:
   - **Google Sheet ID** (from Step 1)
   - **Sheet Name** (default is "Sheet1")
   - **Google API Key** (from Step 2)
3. Click "Connect to Sheet"

## Usage

### Viewing Data
Once connected, your Google Sheet data will display in a table format.

### Searching
Use the search box to filter data in real-time by any value in any column.

### Adding New Rows
Fill in the form fields and click "Add Row" to append a new row to your Google Sheet.

### Refreshing Data
Click the "Refresh Data" button to sync with the latest changes in your Google Sheet.

## File Structure

```
├── index.html       # Main HTML structure
├── styles.css       # Styling and responsive design
├── config.js        # Configuration management
├── sheets-api.js    # Google Sheets API wrapper
├── app.js           # Main application logic
└── README.md        # Documentation
```

## API Functions

### sheets-api.js

- `fetchData()` - Retrieve all data from the sheet
- `appendRow(rowData)` - Add a new row to the sheet
- `searchData(query)` - Client-side data search
- `sortData(columnIndex, ascending)` - Sort data by column
- `getUniqueValues(columnIndex)` - Get unique values from a column

## Security Notes

⚠️ **Important:**
- This app uses Google's public API and stores the API key in browser local storage
- For production use, consider using a backend server to handle API credentials
- Never share your API key in public repositories
- Restrict API key usage to your domain in Google Cloud Console

## Troubleshooting

### "Failed to fetch data" error
- Check if the API key is correct
- Verify the Google Sheets API is enabled
- Ensure the sheet is accessible (not private)
- Check browser console for more details

### Data not displaying
- Confirm the Sheet ID is correct
- Verify the Sheet Name matches exactly (case-sensitive)
- Ensure the sheet has data with headers in the first row

### Cannot add rows
- Check that you have edit permissions on the Google Sheet
- Verify the API key has write access enabled
- Check browser console for error messages

## Future Enhancements

- 🔐 Backend authentication for security
- 📝 Edit existing rows
- 🗑️ Delete rows
- 📊 Data visualization and charts
- 📥 Export data to CSV
- 🔔 Real-time notifications
- 👥 Multi-user support

## License

This project is open source and available for personal and commercial use.

## Support

For issues or questions, check the Google Sheets API [documentation](https://developers.google.com/sheets/api).
