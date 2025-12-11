// VapeBar Inventory Management System

class InventoryManager {
    constructor() {
        this.items = [];
        this.sheetName = 'Inventory';
        this.headers = ['ID', 'Category', 'Item Name', 'Version', 'Flavor', 'Quantity', 'Price', 'Date Added', 'Notes'];
    }

    /**
     * Get item by ID
     */
    getItemById(itemId) {
        return this.items.find(item => item[0] === itemId) || null;
    }

    /**
     * Initialize the inventory system
     */
    async init() {
        try {
            await this.loadInventory();
            this.renderInventory();
        } catch (error) {
            console.error('Error initializing inventory:', error);
            showError('Failed to load inventory');
        }
    }

    /**
     * Load inventory from Google Sheets
     */
    async loadInventory() {
        try {
            const result = await sheetsAPI.fetchData(this.sheetName);
            this.headers = result.headers || this.headers;
            this.items = result.data || [];
            console.log(`Loaded ${this.items.length} items from inventory`);
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.items = [];
        }
    }

    /**
     * Add new item to inventory
     */
    async addItem(itemData) {
        try {
            // Generate ID (timestamp based)
            const id = Date.now().toString();
            
            // Prepare row data matching headers
            const rowData = [
                id,
                itemData.category,
                itemData.itemName,
                itemData.version,
                itemData.flavor || '',
                itemData.quantity,
                itemData.price,
                itemData.dateAdded,
                itemData.notes || ''
            ];

            // Append to Google Sheets
            await sheetsAPI.appendRow(rowData, this.sheetName);
            
            // Refresh local data
            await this.loadInventory();
            
            return true;
        } catch (error) {
            console.error('Error adding item:', error);
            throw error;
        }
    }

    /**
     * Delete item from inventory
     */
    async deleteItem(itemId) {
        if (!confirm('Are you sure you want to delete this item?')) {
            return false;
        }

        try {
            // Find the row index
            const itemIndex = this.items.findIndex(item => item[0] === itemId);
            if (itemIndex === -1) {
                throw new Error('Item not found');
            }

            // Call delete API
            const response = await fetch('http://localhost:3000/api/sheets/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    spreadsheetId: CONFIG.sheetId,
                    sheetName: this.sheetName,
                    rowIndex: itemIndex + 1 // +1 for header row
                })
            });

            if (!response.ok) {
                throw new Error('Failed to delete item');
            }

            // Refresh data
            await this.loadInventory();
            return true;
        } catch (error) {
            console.error('Error deleting item:', error);
            throw error;
        }
    }

    /**
     * Update item quantity
     */
    async updateQuantity(itemId, newQuantity) {
        try {
            const itemIndex = this.items.findIndex(item => item[0] === itemId);
            if (itemIndex !== -1) {
                this.items[itemIndex][5] = newQuantity; // Quantity is at index 5
                await this.rebuildSheet();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating quantity:', error);
            throw error;
        }
    }

    /**
     * Rebuild the entire sheet with current items
     */
    async rebuildSheet() {
        try {
            // This would require clearing and re-adding all rows
            // For now, we'll just refresh from the actual sheet
            await this.loadInventory();
        } catch (error) {
            console.error('Error rebuilding sheet:', error);
            throw error;
        }
    }

    /**
     * Get items by category
     */
    getByCategory(category) {
        return this.items.filter(item => item[1] === category);
    }

    /**
     * Get items by brand
     */
    getByBrand(brand) {
        return this.items.filter(item => item[2].toLowerCase() === brand.toLowerCase());
    }

    /**
     * Search items
     */
    searchItems(query) {
        const lowerQuery = query.toLowerCase();
        return this.items.filter(item => {
            const itemName = item[2].toLowerCase();
            const flavor = item[4].toLowerCase();
            return itemName.includes(lowerQuery) || flavor.includes(lowerQuery);
        });
    }

    /**
     * Get low stock items (quantity < 10)
     */
    getLowStockItems() {
        return this.items.filter(item => parseInt(item[5]) < 10);
    }

    /**
     * Get analytics data
     */
    getAnalytics() {
        const juiceItems = this.getByCategory('Vape Juice/Pod');
        const deviceItems = this.getByCategory('Vape Device');
        const brands = new Set(this.items.map(item => item[2]));
        
        const totalQuantity = this.items.reduce((sum, item) => sum + parseInt(item[5] || 0), 0);
        const totalValue = this.items.reduce((sum, item) => {
            return sum + (parseInt(item[5] || 0) * parseFloat(item[6] || 0));
        }, 0);

        return {
            totalItems: this.items.length,
            totalQuantity,
            totalValue: totalValue.toFixed(2),
            juiceItems: juiceItems.length,
            deviceItems: deviceItems.length,
            totalBrands: brands.size,
            brands: Array.from(brands)
        };
    }

    /**
     * Render inventory items
     */
    renderInventory(items = null) {
        const grid = document.getElementById('inventoryGrid');
        const emptyState = document.getElementById('emptyState');
        const displayItems = items || this.items;

        grid.innerHTML = '';

        if (displayItems.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        grid.style.display = 'grid';

        displayItems.forEach(item => {
            const card = this.createItemCard(item);
            grid.appendChild(card);
        });
    }

    /**
     * Create item card element
     */
    createItemCard(item) {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.dataset.id = item[0];

        const quantity = parseInt(item[5]);
        const isLowStock = quantity < 10;

        card.innerHTML = `
            <div class="item-header">
                <h3>${item[2]}</h3>
                <span class="category-badge ${item[1].includes('Device') ? 'device' : 'juice'}">${item[1]}</span>
            </div>
            <div class="item-body">
                <div class="item-detail">
                    <span class="label">Version:</span>
                    <span class="value">${item[3]}</span>
                </div>
                ${item[4] ? `
                <div class="item-detail">
                    <span class="label">Flavor:</span>
                    <span class="value">${item[4]}</span>
                </div>
                ` : ''}
                <div class="item-detail">
                    <span class="label">Quantity:</span>
                    <span class="value ${isLowStock ? 'low-stock' : ''}">${quantity} ${isLowStock ? '⚠️ LOW' : ''}</span>
                </div>
                <div class="item-detail">
                    <span class="label">Price:</span>
                    <span class="value">₱${parseFloat(item[6]).toFixed(2)}</span>
                </div>
                <div class="item-detail">
                    <span class="label">Total Value:</span>
                    <span class="value">₱${(quantity * parseFloat(item[6])).toFixed(2)}</span>
                </div>
                <div class="item-detail">
                    <span class="label">Added:</span>
                    <span class="value">${item[7]}</span>
                </div>
                ${item[8] ? `
                <div class="item-detail">
                    <span class="label">Notes:</span>
                    <span class="value">${item[8]}</span>
                </div>
                ` : ''}
            </div>
            <div class="item-footer">
                <button class="btn-small btn-edit" onclick="inventoryUI.handleEditQuantity('${item[0]}', ${quantity})">✏️ Edit Qty</button>
                <button class="btn-small btn-delete" onclick="inventoryUI.handleDelete('${item[0]}')">🗑️ Delete</button>
            </div>
        `;

        return card;
    }
}

// UI Controller
class InventoryUI {
    constructor(inventoryManager) {
        this.manager = inventoryManager;
        this.initEventListeners();
    }

    initEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Inventory controls
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.handleCategoryFilter(e.target.value);
        });

        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.handleRefresh();
        });

        // Form submission
        document.getElementById('itemForm').addEventListener('submit', (e) => {
            this.handleFormSubmit(e);
        });

        // Set today's date as default
        document.getElementById('dateAdded').valueAsDate = new Date();

        // Sales form defaults and listener
        const salesDate = document.getElementById('saleDate');
        if (salesDate) salesDate.valueAsDate = new Date();
        
        const bulkSalesDate = document.getElementById('bulkSaleDate');
        if (bulkSalesDate) bulkSalesDate.valueAsDate = new Date();

        const salesForm = document.getElementById('salesForm');
        if (salesForm) salesForm.addEventListener('submit', (e) => this.handleSalesSubmit(e));

        // Real-time price calculation for sales (retail)
        document.getElementById('retailPrice')?.addEventListener('input', () => this.updatePriceSummary());

        // Real-time price calculation for bulk sales
        document.getElementById('bulkSalePrice')?.addEventListener('input', () => this.updateBulkPriceSummary());

        document.getElementById('saleQuantity')?.addEventListener('input', () => {
            this.updatePriceSummary();
        });

        document.getElementById('bulkSaleQuantity')?.addEventListener('input', () => {
            this.updateBulkPriceSummary();
            this.updateSelectedFlavorsDisplay();
        });

        // Sales type selector (Retail/Bulk)
        document.querySelectorAll('.sales-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleSalesTypeChange(e));
        });

        // Quick bulk quantity buttons
        document.querySelectorAll('.qty-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const qty = parseInt(btn.dataset.qty);
                document.getElementById('bulkSaleQuantity').value = qty;
                this.updateBulkPriceSummary();
                this.updateSelectedBulkItemsDisplay();
            });
        });

        // Clear items button (new)
        const clearBulkItemsBtn = document.getElementById('clearBulkItemsBtn');
        if (clearBulkItemsBtn) {
            clearBulkItemsBtn.addEventListener('click', () => {
                document.querySelectorAll('.bulk-item-qty-input').forEach(input => {
                    input.value = '0';
                });
                this.updateSelectedBulkItemsDisplay();
            });
        }

        // Clear flavors button (legacy - kept for compatibility)
        const clearFlavorsBtn = document.getElementById('clearFlavorsBtn');
        if (clearFlavorsBtn) {
            clearFlavorsBtn.addEventListener('click', () => {
                document.querySelectorAll('.flavor-qty-input').forEach(input => {
                    input.value = '0';
                });
                this.updateSelectedFlavorsDisplay();
            });
        }

        // Brand select change handler (legacy - kept for compatibility)
        const brandSelect = document.getElementById('brandSelect');
        if (brandSelect) {
            brandSelect.addEventListener('change', (e) => {
                const selectedBrand = e.target.value;
                if (selectedBrand) {
                    this.populateFlavorsByBrand(selectedBrand);
                    document.getElementById('brandFlavorsContainer').style.display = 'block';
                    document.getElementById('selectedBrandName').textContent = selectedBrand;
                } else {
                    document.getElementById('brandFlavorsContainer').style.display = 'none';
                    document.getElementById('flavorCheckboxes').innerHTML = '';
                }
            });
        }

        // Retail brand select change handler
        const retailBrandSelect = document.getElementById('retailBrandSelect');
        if (retailBrandSelect) {
            retailBrandSelect.addEventListener('change', (e) => {
                const selectedBrand = e.target.value;
                if (selectedBrand) {
                    this.populateRetailFlavorsByBrand(selectedBrand);
                    document.getElementById('retailFlavorSection').style.display = 'block';
                } else {
                    document.getElementById('retailFlavorSection').style.display = 'none';
                    document.getElementById('retailFlavorSelect').innerHTML = '<option value="">-- Choose a Flavor --</option>';
                }
            });
        }

        // Retail flavor select change handler (update price)
        const retailFlavorSelect = document.getElementById('retailFlavorSelect');
        if (retailFlavorSelect) {
            retailFlavorSelect.addEventListener('change', () => {
                const selectedItemId = retailFlavorSelect.value;
                if (selectedItemId) {
                    const item = this.manager.items.find(i => i[0] === selectedItemId);
                    if (item) {
                        const price = parseFloat(item[6] || 0);
                        document.getElementById('retailPrice').value = price.toFixed(2);
                        this.updatePriceSummary();
                    }
                }
            });
        }
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active from buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab
        document.getElementById(tabName).classList.add('active');
        event.target.classList.add('active');

        // Update analytics when switching to analytics tab
        if (tabName === 'analytics') {
            this.updateAnalytics();
        }

        // Update loans when switching to loans tab
        if (tabName === 'loans') {
            this.updateLoans();
        }
    }

    /**
     * Handle search
     */
    handleSearch(query) {
        if (!query) {
            this.manager.renderInventory();
            return;
        }

        const results = this.manager.searchItems(query);
        this.manager.renderInventory(results);
    }

    /**
     * Handle category filter
     */
    handleCategoryFilter(category) {
        if (!category) {
            this.manager.renderInventory();
            return;
        }

        const filtered = this.manager.getByCategory(category);
        this.manager.renderInventory(filtered);
    }

    /**
     * Handle refresh
     */
    async handleRefresh() {
        const btn = document.getElementById('refreshBtn');
        btn.disabled = true;
        btn.textContent = '⏳ Refreshing...';

        try {
            await this.manager.loadInventory();
            this.manager.renderInventory();
            this.updateAnalytics();
            showSuccess('✓ Inventory refreshed');
        } catch (error) {
            showError('✗ Failed to refresh inventory');
        } finally {
            btn.disabled = false;
            btn.textContent = '🔄 Refresh';
        }
    }

    /**
     * Populate retail brand dropdown
     */
    populateSalesSelect() {
        // Populate retail brand select
        const retailBrandSelect = document.getElementById('retailBrandSelect');
        if (!retailBrandSelect) return;

        retailBrandSelect.innerHTML = '<option value="">-- Choose a Brand --</option>';

        // Get all items from inventory that have flavors (Vape Juice/Pod items)
        const flavorItems = this.manager.items.filter(item => {
            return item[1] === 'Vape Juice/Pod' && item[4]; // Category is Vape Juice/Pod and has a flavor
        });

        if (flavorItems.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No flavor items available';
            option.disabled = true;
            retailBrandSelect.appendChild(option);
            return;
        }

        // Group items by brand name (Item Name)
        const brandMap = {};
        flavorItems.forEach(item => {
            const brandName = item[2]; // Item Name column
            if (!brandMap[brandName]) {
                brandMap[brandName] = [];
            }
            brandMap[brandName].push(item);
        });

        // Sort brands alphabetically
        const sortedBrands = Object.keys(brandMap).sort();

        // Populate brand dropdown
        sortedBrands.forEach(brandName => {
            const option = document.createElement('option');
            option.value = brandName;
            option.textContent = `${brandName} (${brandMap[brandName].length} flavors)`;
            retailBrandSelect.appendChild(option);
        });

        // Store brand map for later use
        this.retailBrandFlavorMap = brandMap;
    }

    /**
     * Populate retail flavor dropdown for a specific brand
     */
    populateRetailFlavorsByBrand(brandName) {
        const flavorSelect = document.getElementById('retailFlavorSelect');
        if (!flavorSelect || !this.retailBrandFlavorMap) return;

        flavorSelect.innerHTML = '<option value="">-- Choose a Flavor --</option>';

        const brandItems = this.retailBrandFlavorMap[brandName] || [];

        if (brandItems.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No flavors available';
            option.disabled = true;
            flavorSelect.appendChild(option);
            return;
        }

        // Sort flavors alphabetically
        brandItems.sort((a, b) => {
            const flavorA = a[4] || '';
            const flavorB = b[4] || '';
            return flavorA.localeCompare(flavorB);
        });

        // Add options for each flavor
        brandItems.forEach(item => {
            const itemId = item[0];
            const flavor = item[4];
            const quantity = parseInt(item[5] || 0);
            const price = parseFloat(item[6] || 0);

            const option = document.createElement('option');
            option.value = itemId;
            option.textContent = `${flavor} (${quantity} left, ₱${price.toFixed(2)})`;

            if (quantity <= 0) {
                option.disabled = true;
                option.textContent = `${flavor} (Out of Stock)`;
            }

            flavorSelect.appendChild(option);
        });
    }

    /**
     * Handle sales type change (Retail/Bulk)
     */
    handleSalesTypeChange(e) {
        const saleType = e.target.dataset.type;
        document.getElementById('saleType').value = saleType;

        // Update active button
        document.querySelectorAll('.sales-type-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.classList.add('active');

        // Toggle form sections
        if (saleType === 'bulk') {
            // Show bulk sections, hide retail
            document.getElementById('retailItemSection').style.display = 'none';
            document.getElementById('bulkQuantitySection').style.display = 'block';
            document.getElementById('retailSection').style.display = 'none';
            document.getElementById('retailPaymentSection').style.display = 'none';
            document.getElementById('bulkSection').style.display = 'block';
            document.getElementById('bulkFlavorSection').style.display = 'block';
            document.getElementById('bulkPriceSection').style.display = 'grid';
            document.getElementById('bulkPaymentSection').style.display = 'block';
            document.getElementById('bulkQuantityButtons').style.display = 'block';

            // Set default bulk quantity to 10
            document.getElementById('bulkSaleQuantity').value = 10;

            // Populate flavor checkboxes
            this.populateBulkFlavors();

            // Clear retail fields
            document.getElementById('retailPrice').value = '';
            document.getElementById('saleDate').value = new Date().toISOString().slice(0, 10);
        } else {
            // Show retail section, hide bulk
            document.getElementById('retailItemSection').style.display = 'block';
            document.getElementById('bulkQuantitySection').style.display = 'none';
            document.getElementById('retailSection').style.display = 'grid';
            document.getElementById('retailPaymentSection').style.display = 'block';
            document.getElementById('bulkSection').style.display = 'none';
            document.getElementById('bulkFlavorSection').style.display = 'none';
            document.getElementById('bulkPriceSection').style.display = 'none';
            document.getElementById('bulkPaymentSection').style.display = 'none';
            document.getElementById('bulkQuantityButtons').style.display = 'none';

            // Set default retail quantity to 1
            document.getElementById('saleQuantity').value = 1;

            // Clear bulk fields
            document.getElementById('bulkSaleDate').value = new Date().toISOString().slice(0, 10);

            // Repopulate retail brands
            this.populateSalesSelect();
        }

        this.updatePriceSummary();
    }

    /**
     * Populate brand dropdown for bulk sales
     */
    populateBulkFlavors() {
        const categorySelect = document.getElementById('bulkCategorySelect');
        if (!categorySelect) return;

        // Populate category dropdown (already has options from HTML)
        
        // Add change event listener to category select
        if (!this.bulkCategoryListenerAdded) {
            categorySelect.addEventListener('change', (e) => this.onBulkCategoryChange(e));
            this.bulkCategoryListenerAdded = true;
        }
    }

    /**
     * Handle bulk category selection change
     */
    onBulkCategoryChange(e) {
        const category = e.target.value;
        const container = document.getElementById('bulkItemCheckboxes');
        const itemsContainer = document.getElementById('bulkItemsContainer');
        const selectedCategoryName = document.getElementById('selectedCategoryName');

        if (!category) {
            itemsContainer.style.display = 'none';
            return;
        }

        selectedCategoryName.textContent = category;
        itemsContainer.style.display = 'block';
        container.innerHTML = '';

        // Get all items from inventory of selected category
        const categoryItems = this.manager.items.filter(item => {
            return item[1] === category; // Match category
        });

        if (categoryItems.length === 0) {
            container.innerHTML = '<p style="color: #999;">No items available for this category</p>';
            return;
        }

        // Sort by item name then flavor (for juice) or version (for devices)
        categoryItems.sort((a, b) => {
            const nameA = a[2]; // Item Name
            const nameB = b[2];
            if (nameA !== nameB) {
                return nameA.localeCompare(nameB);
            }
            // If same name, sort by flavor/version
            const subA = (a[4] || a[3] || '').toString();
            const subB = (b[4] || b[3] || '').toString();
            return subA.localeCompare(subB);
        });

        // Create quantity input for each item
        categoryItems.forEach(item => {
            const itemId = item[0];
            const itemName = item[2];
            const version = item[3];
            const flavor = item[4];
            const quantity = parseInt(item[5] || 0);
            const price = parseFloat(item[6] || 0);

            // Display label based on category
            let displayLabel = itemName;
            if (category === 'Vape Juice/Pod' && flavor) {
                displayLabel = `${itemName} - ${flavor}`;
            } else if (category === 'Vape Device' && version) {
                displayLabel = `${itemName} ${version}`;
            }

            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'display: flex; align-items: center; padding: 8px; background: var(--form-bg); border-radius: 4px; gap: 8px;';

            const label = document.createElement('label');
            label.htmlFor = `bulk-item-qty-${itemId}`;
            label.style.cssText = 'font-size: 14px; flex: 1;';
            label.textContent = `${displayLabel} (${quantity} left, ₱${price.toFixed(2)})`;

            const qtyInput = document.createElement('input');
            qtyInput.type = 'number';
            qtyInput.id = `bulk-item-qty-${itemId}`;
            qtyInput.className = 'bulk-item-qty-input';
            qtyInput.value = '0';
            qtyInput.min = '0';
            qtyInput.max = quantity.toString();
            qtyInput.style.cssText = 'width: 70px; padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; background-color: var(--input-bg); color: var(--text-color);';
            qtyInput.dataset.itemId = itemId;
            qtyInput.dataset.itemName = itemName;
            qtyInput.dataset.flavor = flavor || '';
            qtyInput.dataset.version = version || '';
            qtyInput.dataset.price = price;
            qtyInput.dataset.maxQty = quantity;

            // Disable if out of stock
            if (quantity <= 0) {
                qtyInput.disabled = true;
                label.style.color = '#999';
            }

            itemDiv.appendChild(label);
            itemDiv.appendChild(qtyInput);
            container.appendChild(itemDiv);

            // Add input event to update selected items display
            qtyInput.addEventListener('input', () => this.updateSelectedBulkItemsDisplay());
        });

        // Clear previous selections
        this.updateSelectedBulkItemsDisplay();
    }

    /**
     * Update the display of selected bulk items
     */
    updateSelectedBulkItemsDisplay() {
        const qtyInputs = document.querySelectorAll('.bulk-item-qty-input');
        const displayContainer = document.getElementById('selectedBulkItemsDisplay');
        const listContainer = document.getElementById('selectedBulkItemsList');

        let totalPrice = 0;
        let totalQty = 0;
        const selectedItems = [];

        qtyInputs.forEach(input => {
            const qty = parseInt(input.value || 0);
            if (qty > 0) {
                const itemName = input.dataset.itemName;
                const flavor = input.dataset.flavor;
                const version = input.dataset.version;
                const price = parseFloat(input.dataset.price || 0);
                const itemTotal = price * qty;
                totalPrice += itemTotal;
                totalQty += qty;

                // Create label based on what's available
                let label = itemName;
                if (flavor) {
                    label += ` - ${flavor}`;
                } else if (version) {
                    label += ` ${version}`;
                }

                selectedItems.push({
                    label,
                    qty,
                    price,
                    itemTotal
                });
            }
        });

        if (selectedItems.length === 0) {
            listContainer.style.display = 'none';
            document.getElementById('summaryUnitPrice').textContent = '₱0.00';
            document.getElementById('summaryTotal').textContent = '₱0.00';
            return;
        }

        listContainer.style.display = 'block';
        displayContainer.innerHTML = '';

        selectedItems.forEach(item => {
            const itemDisplay = document.createElement('div');
            itemDisplay.style.cssText = 'padding: 4px 0; font-size: 14px;';
            itemDisplay.textContent = `• ${item.qty}× ${item.label} (₱${item.price.toFixed(2)} each) = ₱${item.itemTotal.toFixed(2)}`;
            displayContainer.appendChild(itemDisplay);
        });

        // Add total
        const totalDiv = document.createElement('div');
        totalDiv.style.cssText = 'padding-top: 8px; margin-top: 8px; border-top: 1px solid var(--border-color); font-weight: bold;';
        totalDiv.textContent = `Total: ₱${totalPrice.toFixed(2)} (${totalQty} pieces)`;
        displayContainer.appendChild(totalDiv);

        // Check if total quantity matches the bulk quantity
        const bulkQty = parseInt(document.getElementById('bulkSaleQuantity')?.value || document.getElementById('saleQuantity').value || 0);
        if (totalQty !== bulkQty && bulkQty > 0) {
            const warningDiv = document.createElement('div');
            warningDiv.style.cssText = 'padding-top: 8px; color: #f44336; font-size: 13px;';
            warningDiv.textContent = `⚠️ Selected ${totalQty} pieces, need ${bulkQty} pieces`;
            displayContainer.appendChild(warningDiv);
        } else if (totalQty === bulkQty && bulkQty > 0) {
            const successDiv = document.createElement('div');
            successDiv.style.cssText = 'padding-top: 8px; color: #27ae60; font-size: 13px;';
            successDiv.textContent = `✓ Perfect! ${totalQty} pieces selected`;
            displayContainer.appendChild(successDiv);
        }

        // Update price summary
        const bulkSalePrice = parseFloat(document.getElementById('bulkSalePrice')?.value || 0);
        if (bulkSalePrice > 0) {
            const totalSalePrice = bulkSalePrice * totalQty;
            document.getElementById('summaryUnitPrice').textContent = `₱${bulkSalePrice.toFixed(2)}`;
            document.getElementById('summaryTotal').textContent = `₱${totalSalePrice.toFixed(2)}`;
        }
    }

    /**
     * Populate flavors for a specific brand (legacy - kept for compatibility)
     */
    populateFlavorsByBrand(brandName) {
        // This function is no longer used but kept for backward compatibility
        // The new system uses onBulkCategoryChange instead
    }

    /**
     * Update price summary
     */
    updatePriceSummary() {
        const saleType = document.getElementById('saleType').value;
        const qty = parseInt(document.getElementById('saleQuantity').value || '0');

        let appliedPrice = 0;

        if (saleType === 'bulk') {
            // For bulk sales, use the bulk sale price if available
            appliedPrice = parseFloat(document.getElementById('bulkSalePrice')?.value || '0');
        } else {
            // Retail pricing (simple)
            appliedPrice = parseFloat(document.getElementById('retailPrice').value || '0');
        }

        const total = (appliedPrice * qty).toFixed(2);

        document.getElementById('summaryUnitPrice').textContent = `₱${appliedPrice.toFixed(2)}`;
        document.getElementById('summaryTotal').textContent = `₱${total}`;
        document.getElementById('bulkIndicator').style.display = 'none';
    }

    /**
     * Update bulk price summary with cost comparison
     */
    updateBulkPriceSummary() {
        const saleType = document.getElementById('saleType').value;
        if (saleType !== 'bulk') return;

        const qty = parseInt(document.getElementById('bulkSaleQuantity')?.value || '0');
        const bulkSalePrice = parseFloat(document.getElementById('bulkSalePrice')?.value || '0');

        if (qty > 0 && bulkSalePrice > 0) {
            const total = (bulkSalePrice * qty).toFixed(2);
            document.getElementById('summaryUnitPrice').textContent = `₱${bulkSalePrice.toFixed(2)}`;
            document.getElementById('summaryTotal').textContent = `₱${total}`;

            // Show cost breakdown from selected items
            const qtyInputs = document.querySelectorAll('.bulk-item-qty-input');
            let totalCost = 0;
            let totalQtySelected = 0;

            qtyInputs.forEach(input => {
                const itemQty = parseInt(input.value || 0);
                if (itemQty > 0) {
                    const price = parseFloat(input.dataset.price || 0);
                    totalCost += (price * itemQty);
                    totalQtySelected += itemQty;
                }
            });

            // Show profit/margin info if flavors are selected
            if (totalQtySelected > 0) {
                const totalRevenue = bulkSalePrice * totalQtySelected;
                const profit = totalRevenue - totalCost;
                const marginPercent = totalCost > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : 0;

                const infoDiv = document.getElementById('bulkPriceInfo');
                if (infoDiv) {
                    infoDiv.innerHTML = `
                        <div style="font-size: 13px; color: #666; margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
                            <div>Cost: ₱${totalCost.toFixed(2)} | Revenue: ₱${totalRevenue.toFixed(2)}</div>
                            <div style="color: ${profit >= 0 ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
                                Profit: ₱${profit.toFixed(2)} (${marginPercent}% margin)
                            </div>
                        </div>
                    `;
                }
            }
        }
    }

    /**
     * Handle form submission
     */
    async handleFormSubmit(e) {
        e.preventDefault();

        const itemData = {
            category: document.getElementById('category').value,
            itemName: document.getElementById('itemName').value,
            version: document.getElementById('version').value,
            flavor: document.getElementById('flavor').value,
            quantity: document.getElementById('quantity').value,
            price: document.getElementById('price').value,
            dateAdded: document.getElementById('dateAdded').value,
            notes: document.getElementById('notes').value
        };

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = '⏳ Adding...';

        try {
            await this.manager.addItem(itemData);
            this.manager.renderInventory();
            this.updateAnalytics();
            document.getElementById('itemForm').reset();
            document.getElementById('dateAdded').valueAsDate = new Date();
            showSuccess('✓ Item added successfully!');
        } catch (error) {
            showError(`✗ Failed to add item: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = '➕ Add to Inventory';
        }
    }

    /**
     * Handle sales form submission
     */
    async handleSalesSubmit(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = '⏳ Recording...';

        const saleType = document.getElementById('saleType').value || 'retail';
        const customer = document.getElementById('saleCustomer').value;
        const notes = document.getElementById('saleNotes').value;

        let itemId, quantity;

        if (saleType === 'bulk') {
            // For bulk sales, no item selection needed
            quantity = parseInt(document.getElementById('bulkSaleQuantity').value || '0');

            if (isNaN(quantity) || quantity <= 0) {
                showError('Please enter a valid bulk quantity');
                btn.disabled = false;
                btn.textContent = '✅ Record Sale';
                return;
            }
        } else {
            // For retail sales, need item selection from flavor dropdown
            itemId = document.getElementById('retailFlavorSelect').value;
            quantity = parseInt(document.getElementById('saleQuantity').value || '0');

            if (!itemId || isNaN(quantity) || quantity <= 0) {
                showError('Please select a brand, flavor, and enter a valid quantity');
                btn.disabled = false;
                btn.textContent = '✅ Record Sale';
                return;
            }
        }

        try {
            let sale = {
                itemId,
                quantitySold: quantity,
                saleType,
                date: '',
                customer,
                notes
            };

            if (saleType === 'retail') {
                // Retail sale
                const retailPrice = parseFloat(document.getElementById('retailPrice').value || '0');
                const date = document.getElementById('saleDate').value;
                const paymentMethod = document.getElementById('retailPaymentMethod').value;

                console.log('Retail payment method selected:', paymentMethod);

                if (isNaN(retailPrice) || retailPrice <= 0) {
                    showError('Please enter a valid retail price');
                    btn.disabled = false;
                    btn.textContent = '✅ Record Sale';
                    return;
                }

                sale.pricePerUnit = retailPrice;
                sale.appliedPrice = retailPrice;
                sale.date = date;
                sale.paymentMethod = paymentMethod;

                console.log('Sale object for retail:', sale);
            } else {
                // Bulk sale - use custom bulk sale price
                const date = document.getElementById('bulkSaleDate').value;
                const bulkSalePrice = parseFloat(document.getElementById('bulkSalePrice').value || '0');
                const paymentMethod = document.getElementById('bulkPaymentMethod').value;

                console.log('Bulk payment method selected:', paymentMethod);

                if (isNaN(bulkSalePrice) || bulkSalePrice <= 0) {
                    showError('Please enter a valid bulk sale price per piece');
                    btn.disabled = false;
                    btn.textContent = '✅ Record Sale';
                    return;
                }

                // Get all quantity inputs with values > 0
                const qtyInputs = document.querySelectorAll('.bulk-item-qty-input');
                const selectedItems = [];
                let totalCost = 0;
                let totalQty = 0;

                qtyInputs.forEach(input => {
                    const qty = parseInt(input.value || 0);
                    if (qty > 0) {
                        const itemId = input.dataset.itemId;
                        const itemName = input.dataset.itemName;
                        const flavor = input.dataset.flavor;
                        const version = input.dataset.version;
                        const costPrice = parseFloat(input.dataset.price || 0);
                        const maxQty = parseInt(input.dataset.maxQty || 0);

                        if (qty > maxQty) {
                            const displayName = flavor ? `${itemName} - ${flavor}` : `${itemName} ${version}`;
                            showError(`Not enough stock for ${displayName}. Only ${maxQty} available.`);
                            btn.disabled = false;
                            btn.textContent = '✅ Record Sale';
                            throw new Error('Insufficient stock');
                        }

                        totalCost += (costPrice * qty);
                        totalQty += qty;
                        selectedItems.push({
                            itemId,
                            itemName,
                            flavor: flavor || '',
                            version: version || '',
                            qty,
                            price: costPrice
                        });
                    }
                });

                if (selectedItems.length === 0) {
                    showError('Please select at least one flavor for the bulk sale');
                    btn.disabled = false;
                    btn.textContent = '✅ Record Sale';
                    return;
                }

                if (totalQty !== quantity) {
                    showError(`Selected flavors total ${totalQty} pieces, but bulk quantity is ${quantity}. Please adjust.`);
                    btn.disabled = false;
                    btn.textContent = '✅ Record Sale';
                    return;
                }

                // Use the custom bulk sale price
                const totalRevenue = bulkSalePrice * totalQty;
                const profit = totalRevenue - totalCost;

                // Build flavor list for notes
                const flavorsList = selectedItems.map(item => `${item.qty}× ${item.itemName} - ${item.flavor}`).join(', ');
                const bulkNotes = (notes ? notes + '\n' : '') + `Bulk items: ${flavorsList}\nCost: ₱${totalCost.toFixed(2)} | Revenue: ₱${totalRevenue.toFixed(2)} | Profit: ₱${profit.toFixed(2)}`;

                // Set all sale properties
                sale.pricePerUnit = bulkSalePrice;
                sale.appliedPrice = bulkSalePrice;
                sale.date = date;
                sale.notes = bulkNotes;
                sale.bulkItems = selectedItems; // Store for inventory updates

                // IMPORTANT: Set payment method LAST to ensure it's not overwritten
                sale.paymentMethod = paymentMethod;

                console.log('Sale object for bulk:', JSON.stringify(sale, null, 2));
                console.log('Payment method value:', sale.paymentMethod);
            }

            await sheetsAPI.recordSale(sale);

            // Refresh inventory and UI
            await this.manager.loadInventory();
            this.manager.renderInventory();
            this.updateAnalytics();
            this.populateSalesSelect();

            showSuccess('✓ Sale recorded and inventory updated');
            document.getElementById('salesForm').reset();
            document.getElementById('saleDate').valueAsDate = new Date();
            document.getElementById('bulkSaleDate').valueAsDate = new Date();

            // Clear all flavor quantity inputs and bulk sale price
            document.querySelectorAll('.flavor-qty-input').forEach(input => {
                input.value = '0';
            });

            const bulkSalePriceInput = document.getElementById('bulkSalePrice');
            if (bulkSalePriceInput) bulkSalePriceInput.value = '';

            // Clear profit info
            const infoDiv = document.getElementById('bulkPriceInfo');
            if (infoDiv) infoDiv.innerHTML = '';

            this.updatePriceSummary();
            this.updateSelectedFlavorsDisplay();
        } catch (error) {
            showError(`✗ Failed to record sale: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = '✅ Record Sale';
        }
    }

    /**
     * Handle edit quantity
     */
    handleEditQuantity(itemId, currentQuantity) {
        const newQuantity = prompt(`Enter new quantity for this item:\n(Current: ${currentQuantity})`, currentQuantity);
        
        if (newQuantity !== null && newQuantity !== '' && !isNaN(newQuantity)) {
            this.updateItemQuantity(itemId, parseInt(newQuantity));
        }
    }

    /**
     * Update item quantity
     */
    async updateItemQuantity(itemId, newQuantity) {
        try {
            await this.manager.updateQuantity(itemId, newQuantity);
            this.manager.renderInventory();
            this.updateAnalytics();
            showSuccess('✓ Quantity updated');
        } catch (error) {
            showError('✗ Failed to update quantity');
        }
    }

    /**
     * Handle delete
     */
    async handleDelete(itemId) {
        try {
            await this.manager.deleteItem(itemId);
            this.manager.renderInventory();
            this.updateAnalytics();
            showSuccess('✓ Item deleted');
        } catch (error) {
            showError('✗ Failed to delete item');
        }
    }

    /**
     * Update analytics display
     */
    async updateAnalytics() {
        const analytics = this.manager.getAnalytics();

        document.getElementById('totalItems').textContent = analytics.totalItems;
        document.getElementById('totalQuantity').textContent = analytics.totalQuantity;
        document.getElementById('totalValue').textContent = `₱${analytics.totalValue}`;
        document.getElementById('juiceItems').textContent = analytics.juiceItems;
        document.getElementById('deviceItems').textContent = analytics.deviceItems;
        document.getElementById('totalBrands').textContent = analytics.totalBrands;

        // Category breakdown
        const categoryBreakdown = document.getElementById('categoryBreakdown');
        categoryBreakdown.innerHTML = `
            <div class="breakdown-item">
                <span>🧴 Vape Juice/Pod</span>
                <span class="breakdown-value">${analytics.juiceItems} items</span>
            </div>
            <div class="breakdown-item">
                <span>⚙️ Vape Device</span>
                <span class="breakdown-value">${analytics.deviceItems} items</span>
            </div>
        `;

        // Low stock items
        const lowStockItems = this.manager.getLowStockItems();
        const lowStockList = document.getElementById('lowStockItems');
        
        if (lowStockItems.length === 0) {
            lowStockList.innerHTML = '<p class="no-items">✓ All items are well stocked!</p>';
        } else {
                lowStockList.innerHTML = lowStockItems.map(item => `
                <div class="low-stock-item">
                    <span>${item[2]} (${item[3]})</span>
                    <span class="stock-value">${item[5]} units</span>
                </div>
            `).join('');
        }

        // Fetch sales data and compute totals (with breakdown by type)
        try {
            const salesRes = await sheetsAPI.fetchData('Sales');
            const sales = salesRes.data || [];

            let totalSales = sales.length;
            let totalRevenue = 0;
            let bulkSales = 0;
            let bulkRevenue = 0;
            let retailSales = 0;
            let retailRevenue = 0;

            sales.forEach(row => {
                // Total is at index 6 per headers: [Sale ID, Item ID, Item Name, Category, Quantity Sold, Price Per Unit, Total, Date, Customer, Sale Type, Notes]
                const total = parseFloat(row[6] || '0');
                const saleType = row[9] || 'retail'; // Sale Type is at index 9
                totalRevenue += isNaN(total) ? 0 : total;

                if (saleType === 'bulk') {
                    bulkSales++;
                    bulkRevenue += isNaN(total) ? 0 : total;
                } else {
                    retailSales++;
                    retailRevenue += isNaN(total) ? 0 : total;
                }
            });

            document.getElementById('totalSales').textContent = totalSales;
            document.getElementById('totalRevenue').textContent = `₱${totalRevenue.toFixed(2)}`;

            // Add breakdown section showing bulk vs retail
            const categoryBreakdown = document.getElementById('categoryBreakdown');
            const currentHTML = categoryBreakdown.innerHTML;
            categoryBreakdown.innerHTML = currentHTML + `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <h4 style="margin-bottom: 10px;">Sales Breakdown</h4>
                    <div class="breakdown-item">
                        <span>🛍️ Retail Sales</span>
                        <span class="breakdown-value">${retailSales} (₱${retailRevenue.toFixed(2)})</span>
                    </div>
                    <div class="breakdown-item">
                        <span>📦 Bulk Sales</span>
                        <span class="breakdown-value">${bulkSales} (₱${bulkRevenue.toFixed(2)})</span>
                    </div>
                </div>
            `;

            // Populate recent sales list
            this.populateRecentSales(sales);
        } catch (err) {
            console.warn('Could not load sales for analytics:', err.message);
            document.getElementById('totalSales').textContent = '0';
            document.getElementById('totalRevenue').textContent = '₱0.00';
            this.populateRecentSales([]);
        }
    }

    /**
     * Populate recent sales list
     */
    populateRecentSales(salesData) {
        const container = document.getElementById('recentSales');
        if (!container) return;

        let sales = salesData;
        if (!sales) sales = [];

        if (sales.length === 0) {
            container.innerHTML = '<p class="no-items">No sales recorded yet.</p>';
            return;
        }

        // Show most recent 10 (sales data is in sheet order; assume appended rows are chronological)
        const recent = sales.slice(-10).reverse();

        container.innerHTML = recent.map(row => {
            const saleId = row[0] || '';
            const itemName = row[2] || '';
            const qty = row[4] || '';
            const total = row[6] ? `₱${parseFloat(row[6]).toFixed(2)}` : '₱0.00';
            const date = row[7] || '';
            const customer = row[8] || '';
            const saleType = row[9] || 'retail';
            const paymentMethod = row[10] || 'Cash';
            const notes = row[11] || '';
            const typeLabel = saleType === 'bulk' ? '📦 Bulk' : '🛍️ Retail';

            console.log('Sale row:', {saleId, itemName, saleType, paymentMethod, rowData: row});

            // Payment method icon
            let paymentIcon = '💵';
            if (paymentMethod === 'GCash') paymentIcon = '📱';
            else if (paymentMethod === 'Maya') paymentIcon = '💳';
            else if (paymentMethod === 'Loan') paymentIcon = '📝';

            // Extract flavors from notes for bulk sales (compact display)
            let flavorsDisplay = '';
            if (saleType === 'bulk' && notes.includes('Bulk items:')) {
                const match = notes.match(/Bulk items: ([^\n]+)/);
                if (match) {
                    const flavorsList = match[1];
                    // Extract just the flavor names (compact format)
                    const flavors = flavorsList.split(',').map(item => {
                        // Format: "3× Black King - Banana" -> "Banana(3)"
                        const parts = item.trim().match(/(\d+)×.*?-\s*(.+)/);
                        if (parts) {
                            return `${parts[2]}(${parts[1]})`;
                        }
                        return item.trim();
                    });
                    flavorsDisplay = `<div class="sale-flavors" style="font-size: 11px; color: #666; margin-top: 2px;">${flavors.join(', ')}</div>`;
                }
            }

            return `
                <div class="sale-row">
                    <div class="sale-left">
                        <strong>${itemName}</strong>
                        <div class="sale-meta">${qty} × — ${total} · ${typeLabel} · ${paymentIcon} ${paymentMethod}</div>
                        ${flavorsDisplay}
                    </div>
                    <div class="sale-right">
                        <div>${date}</div>
                        <div class="sale-customer">${customer}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update loans display
     */
    async updateLoans() {
        try {
            console.log('Fetching loans data...');
            const loansRes = await sheetsAPI.fetchData('Loans');
            const loans = loansRes.data || [];
            console.log('Loans fetched:', loans.length, 'rows');
            console.log('Loans data:', loans);

            let unpaidLoans = [];
            let paidLoans = [];
            let totalUnpaidAmount = 0;

            loans.forEach(row => {
                const status = row[7] || 'Unpaid';
                if (status === 'Unpaid') {
                    unpaidLoans.push(row);
                    totalUnpaidAmount += parseFloat(row[4] || 0);
                } else {
                    paidLoans.push(row);
                }
            });

            console.log('Unpaid loans:', unpaidLoans.length);
            console.log('Paid loans:', paidLoans.length);

            // Update summary stats
            document.getElementById('totalUnpaidLoans').textContent = unpaidLoans.length;
            document.getElementById('totalUnpaidAmount').textContent = `₱${totalUnpaidAmount.toFixed(2)}`;
            document.getElementById('totalPaidLoans').textContent = paidLoans.length;

            // Display unpaid loans
            this.displayLoansList(unpaidLoans, 'unpaidLoansList', true);

            // Display paid loans
            this.displayLoansList(paidLoans, 'paidLoansList', false);
        } catch (err) {
            console.error('Error loading loans:', err);
            document.getElementById('unpaidLoansList').innerHTML = '<p class="no-items">No loans recorded yet.</p>';
            document.getElementById('paidLoansList').innerHTML = '<p class="no-items">No paid loans yet.</p>';
        }
    }

    /**
     * Display loans list
     */
    displayLoansList(loans, containerId, showMarkPaidButton) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (loans.length === 0) {
            container.innerHTML = '<p class="no-items">No loans found.</p>';
            return;
        }

        container.innerHTML = loans.map(row => {
            const loanId = row[0] || '';
            const saleId = row[1] || '';
            const customer = row[2] || 'Unknown';
            const itemName = row[3] || '';
            const amount = row[4] ? `₱${parseFloat(row[4]).toFixed(2)}` : '₱0.00';
            const dateIssued = row[5] || '';
            const dueDate = row[6] || 'Not set';
            const status = row[7] || 'Unpaid';
            const datePaid = row[8] || '';
            const notes = row[9] || '';

            const markPaidBtn = showMarkPaidButton
                ? `<button class="btn-small" style="background-color: #27ae60; color: white;" onclick="inventoryUI.markLoanAsPaid('${loanId}')">✓ Mark as Paid</button>`
                : `<span style="color: #27ae60; font-size: 12px;">Paid on ${datePaid}</span>`;

            return `
                <div class="loan-row">
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 15px; align-items: center;">
                        <div>
                            <strong style="font-size: 16px; color: var(--text-color);">${customer}</strong>
                            <div style="font-size: 13px; color: #888; margin-top: 4px;">${itemName}</div>
                            ${notes ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${notes}</div>` : ''}
                        </div>
                        <div>
                            <div style="font-size: 14px; color: #888;">Amount</div>
                            <div style="font-size: 16px; font-weight: bold; color: #e74c3c;">${amount}</div>
                        </div>
                        <div>
                            <div style="font-size: 14px; color: #888;">Date Issued</div>
                            <div style="font-size: 14px; color: var(--text-color);">${dateIssued}</div>
                            ${dueDate !== 'Not set' ? `<div style="font-size: 12px; color: #666;">Due: ${dueDate}</div>` : ''}
                        </div>
                        <div>
                            ${markPaidBtn}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Mark loan as paid
     */
    async markLoanAsPaid(loanId) {
        if (!confirm('Mark this loan as paid?')) {
            return;
        }

        try {
            // Load loans sheet
            const loansRes = await sheetsAPI.fetchData('Loans');
            const loans = loansRes.data || [];

            // Find loan index
            let loanIndex = -1;
            for (let i = 0; i < loans.length; i++) {
                if (loans[i][0] === loanId) {
                    loanIndex = i;
                    break;
                }
            }

            if (loanIndex === -1) {
                throw new Error('Loan not found');
            }

            // Update loan row: set status to "Paid" and date paid to today
            const loanRow = loans[loanIndex];
            loanRow[7] = 'Paid';
            loanRow[8] = new Date().toISOString().slice(0, 10);

            // Update the row in Google Sheets (row index + 2 because of header and 0-based index)
            const rowNumber = loanIndex + 2;
            const range = `Loans!H${rowNumber}:I${rowNumber}`;
            await sheetsAPI.updateRange(range, [[loanRow[7], loanRow[8]]]);

            showSuccess('✓ Loan marked as paid');
            this.updateLoans();
        } catch (error) {
            showError(`✗ Failed to mark loan as paid: ${error.message}`);
        }
    }
}

// Helper functions
function showSuccess(message) {
    const status = document.getElementById('formStatus');
    status.textContent = message;
    status.className = 'status-message success';
    setTimeout(() => status.style.display = 'none', 3000);
}

function showError(message) {
    const status = document.getElementById('formStatus');
    if (!status) {
        alert(message);
        return;
    }
    status.textContent = message;
    status.className = 'status-message error';
}

// Initialize when page loads
let inventoryManager, inventoryUI;

document.addEventListener('DOMContentLoaded', async function() {
    loadConfig();
    
    if (!isConfigValid()) {
        alert('Please configure Google Sheet credentials in config.js');
        return;
    }

    inventoryManager = new InventoryManager();
    inventoryUI = new InventoryUI(inventoryManager);
    const warrantyManager = new WarrantyManager(inventoryManager);
    
    document.getElementById('loadingMessage').style.display = 'block';
    
    try {
        await inventoryManager.init();
        document.getElementById('loadingMessage').style.display = 'none';
        
        // Load warranty claims
        await warrantyManager.loadClaims();
        warrantyManager.renderClaims();
        
        // Populate warranty product select
        const warrantySelect = document.getElementById('warrantyItemId');
        if (warrantySelect) {
            warrantySelect.innerHTML = '<option value="">Select Product</option>';
            inventoryManager.items.forEach(item => {
                const [id, category, name, version, flavor] = item;
                const displayName = `${name} ${version} ${flavor ? '- ' + flavor : ''}`.trim();
                warrantySelect.innerHTML += `<option value="${id}">${displayName}</option>`;
            });
        }
        
        // Populate sales select
        if (inventoryUI && typeof inventoryUI.populateSalesSelect === 'function') {
            inventoryUI.populateSalesSelect();
            // Also refresh analytics (includes sales) and recent sales
            if (typeof inventoryUI.updateAnalytics === 'function') inventoryUI.updateAnalytics();
        }
        
        // Warranty form submission
        const warrantyForm = document.getElementById('warrantyForm');
        if (warrantyForm) {
            // Set default date to today
            const warrantyDateInput = document.getElementById('warrantyDate');
            if (warrantyDateInput) {
                warrantyDateInput.valueAsDate = new Date();
            }
            
            warrantyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const statusDiv = document.getElementById('warrantyStatus');
                
                try {
                    const claimData = {
                        itemId: document.getElementById('warrantyItemId').value,
                        quantity: document.getElementById('warrantyQuantity').value,
                        date: document.getElementById('warrantyDate').value,
                        customer: document.getElementById('warrantyCustomer').value,
                        reason: document.getElementById('warrantyReason').value,
                        notes: document.getElementById('warrantyNotes').value
                    };

                    if (!claimData.itemId) {
                        throw new Error('Please select a product');
                    }

                    const result = await warrantyManager.processClaim(claimData);
                    
                    // Show success message
                    statusDiv.className = 'status-message success';
                    statusDiv.textContent = `✅ ${result.message} Claim ID: ${result.claimId.substring(0, 8)}`;
                    statusDiv.style.display = 'block';

                    // Reset form
                    warrantyForm.reset();

                    // Refresh warranty history
                    warrantyManager.renderClaims();

                    // Refresh inventory display
                    inventoryUI.renderInventory();

                    // Clear message after 5 seconds
                    setTimeout(() => {
                        statusDiv.style.display = 'none';
                    }, 5000);
                } catch (error) {
                    statusDiv.className = 'status-message error';
                    statusDiv.textContent = `❌ Error: ${error.message}`;
                    statusDiv.style.display = 'block';
                }
            });
        }
        
    } catch (error) {
        document.getElementById('loadingMessage').style.display = 'none';
        document.getElementById('errorMessage').textContent = `Error: ${error.message}`;
        document.getElementById('errorMessage').style.display = 'block';
    }
});

// Dark Mode Toggle
function initDarkMode() {
    const toggle = document.getElementById('darkModeToggle');
    const html = document.documentElement;
    
    // Load saved preference from localStorage
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    if (isDarkMode) {
        html.classList.add('dark-mode');
        toggle.textContent = '☀️';
    }
    
    // Add click listener to toggle
    toggle.addEventListener('click', () => {
        html.classList.toggle('dark-mode');
        const isNowDark = html.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isNowDark);
        toggle.textContent = isNowDark ? '☀️' : '🌙';
    });
}

/**
 * Warranty Management System
 */
class WarrantyManager {
    constructor(manager) {
        this.manager = manager;
        this.claims = [];
        this.sheetName = 'Warranty';
        this.headers = ['Claim ID', 'Date', 'Product ID', 'Product Name', 'Quantity', 'Reason', 'Customer', 'Notes', 'Status'];
    }

    /**
     * Load warranty claims from Google Sheets
     */
    async loadClaims() {
        try {
            const result = await sheetsAPI.fetchData(this.sheetName);
            this.headers = result.headers || this.headers;
            this.claims = result.data || [];
            console.log(`Loaded ${this.claims.length} warranty claims`);
        } catch (error) {
            console.error('Error loading warranty claims:', error);
            this.claims = [];
        }
    }

    /**
     * Process a warranty claim and replace the defective product
     */
    async processClaim(claimData) {
        try {
            // Validate product exists
            const product = this.manager.getItemById(claimData.itemId);
            if (!product) {
                throw new Error('Product not found');
            }

            // Validate sufficient inventory for replacement
            const currentQty = parseInt(product[5]) || 0;
            const replaceQty = parseInt(claimData.quantity) || 0;
            if (currentQty < replaceQty) {
                throw new Error(`Insufficient inventory. Available: ${currentQty}, Requested: ${replaceQty}`);
            }

            // Create warranty claim record
            const claimId = Date.now().toString();
            const rowData = [
                claimId,
                claimData.date,
                claimData.itemId,
                product[2], // Product name
                replaceQty,
                claimData.reason,
                claimData.customer || '',
                claimData.notes || '',
                'Completed'
            ];

            // Save warranty claim to sheet
            await sheetsAPI.appendRow(rowData, this.sheetName);

            // Decrement inventory (as items were replaced)
            const newQuantity = currentQty - replaceQty;
            await this.manager.updateQuantity(claimData.itemId, newQuantity);

            // Reload claims
            await this.loadClaims();

            return { success: true, claimId, message: `Warranty claim processed. ${replaceQty} units replaced.` };
        } catch (error) {
            console.error('Error processing warranty claim:', error);
            throw error;
        }
    }

    /**
     * Render warranty claims history
     */
    renderClaims() {
        const container = document.getElementById('warrantyHistory');
        if (!container) return;

        if (this.claims.length === 0) {
            container.innerHTML = '<p class="empty-state">No warranty claims yet</p>';
            return;
        }

        container.innerHTML = this.claims.map((claim, index) => {
            const [claimId, date, productId, productName, quantity, reason, customer, notes, status] = claim;
            return `
                <div class="warranty-claim">
                    <div class="warranty-claim-header">
                        <div class="warranty-claim-title">${productName} - Claim #${claimId.substring(0, 8)}</div>
                        <div class="warranty-claim-date">${date}</div>
                    </div>
                    <div class="warranty-claim-details">
                        <div class="warranty-detail">
                            <label>Reason:</label>
                            <value>${reason}</value>
                        </div>
                        <div class="warranty-detail">
                            <label>Quantity Replaced:</label>
                            <value>${quantity} units</value>
                        </div>
                        <div class="warranty-detail">
                            <label>Customer:</label>
                            <value>${customer || 'N/A'}</value>
                        </div>
                        <div class="warranty-detail">
                            <label>Status:</label>
                            <value style="color: var(--success-color); font-weight: 600;">${status}</value>
                        </div>
                    </div>
                    ${notes ? `<div style="padding-top: 10px; border-top: 1px solid var(--border-color); margin-top: 10px;"><strong>Notes:</strong> ${notes}</div>` : ''}
                </div>
            `;
        }).join('');
    }
}

// Initialize dark mode when page loads

document.addEventListener('DOMContentLoaded', initDarkMode);
