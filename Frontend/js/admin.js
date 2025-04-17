document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    if (!token || !isAdmin) {
        alert('Unauthorized access');
        window.location.href = 'index.html';
        return;
    }

    const categoryApiUrl = 'http://localhost:3000/api/v1/categories';
    const productApiUrl = 'http://localhost:3000/api/v1/products';
    let editingProductId = null; // Track product being edited
    const userApiUrl = 'http://localhost:3000/api/v1/users'; // Adjust if needed
    const chatbotApiUrl = 'http://localhost:3000/api/v1/recommendations/chatbot';

    // Load users into dropdown
    async function loadUsers() {
        try {
            const response = await fetch(userApiUrl, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                },
            });
            const users = await response.json();
            const userDropdown = document.getElementById('user-list');

            userDropdown.innerHTML = '<option value="">Select a User</option>';
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name || user.email;
                userDropdown.appendChild(option);
            });

        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }

    // Handle chatbot form submission
    document.getElementById('chatbot-form').addEventListener('submit', async function (event) {
        event.preventDefault();

        const selectedUserId = document.getElementById('user-list').value;
        const userQuery = document.getElementById('chatbot-query').value;
        const chatbotResponseDiv = document.getElementById('chatbot-response');

        if (!selectedUserId) {
            alert('Please select a user.');
            return;
        }

        chatbotResponseDiv.innerHTML = '<p>Generating recommendations...</p>';

        try {
            const response = await fetch(chatbotApiUrl, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ query: userQuery, customerId: selectedUserId })
            });

            const data = await response.json();
            if (response.ok) {
                chatbotResponseDiv.innerHTML = `
                    <p><strong>Chatbot Response:</strong> ${data.message}</p>
                    <h4>Recommended Products:</h4>
                    <div class="recommendations">
                        ${data.recommendations.map(p => `
                            <div class="recommendation-item">
                                <img src="${p.image}" alt="${p.name}">
                                <p><strong>${p.name}</strong></p>
                                <p>${p.description}</p>
                                <p>Price: $${p.price}</p>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                chatbotResponseDiv.innerHTML = `<p>Error: ${data.error}</p>`;
            }

        } catch (error) {
            chatbotResponseDiv.innerHTML = `<p>Error: Unable to fetch recommendations.</p>`;
            console.error('Chatbot API Error:', error);
        }
    });

    

    // Load categories for selection
    async function loadCategories() {
        try {
            const response = await fetch(categoryApiUrl);
            const categories = await response.json();
            const categoryDropdown = document.getElementById('product-category');
            categoryDropdown.innerHTML = '<option value="">Select Category</option>';

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                categoryDropdown.appendChild(option);
            });

        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }

    // Load existing products
    async function loadProducts() {
        try {
            const response = await fetch(productApiUrl);
            const products = await response.json();
            const productList = document.getElementById('product-list');

            productList.innerHTML = '';

            products.forEach(product => {
                const productItem = document.createElement('div');
                productItem.classList.add('product-item');

                productItem.innerHTML = `
                    <img src="${product.image}" alt="${product.name}" class="product-image">
                    <div class="product-info">
                        <p><strong>${product.name}</strong> - $${product.price}</p>
                        <p>Brand: ${product.brand}</p>
                        <p>Stock: ${product.countInStock}</p>
                        <button class="edit-btn" data-id="${product.id}">Edit</button>
                        <button class="delete-btn" data-id="${product.id}">Delete</button>
                    </div>
                `;

                productList.appendChild(productItem);
            });

            // Handle edit and delete
            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', async function () {
                    const productId = this.getAttribute('data-id');
                    await deleteProduct(productId);
                });
            });

            document.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', function () {
                    editingProductId = this.getAttribute('data-id');
                    editProduct(editingProductId);
                });
            });

        } catch (error) {
            console.error('Error fetching products:', error);
        }
    }

    // Handle product form submission (Create / Edit)
    document.getElementById('product-form').addEventListener('submit', async function (event) {
        event.preventDefault();

        const formData = new FormData();
        formData.append('name', document.getElementById('name').value);
        formData.append('description', document.getElementById('description').value);
        formData.append('richDescription', document.getElementById('richDescription').value);
        formData.append('brand', document.getElementById('brand').value);
        formData.append('price', document.getElementById('price').value);
        formData.append('category', document.getElementById('product-category').value);
        formData.append('countInStock', document.getElementById('countInStock').value);
        formData.append('isFeatured', document.getElementById('isFeatured').checked);
        if (document.getElementById('image').files[0]) {
            formData.append('image', document.getElementById('image').files[0]);
        }
        const images = document.getElementById('images').files;
        for (let i = 0; i < images.length; i++) {
            formData.append('images', images[i]);
        }

        const method = editingProductId ? 'PUT' : 'POST';
        const url = editingProductId ? `${productApiUrl}/${editingProductId}` : productApiUrl;

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to save product.');
            }

            alert('Product saved successfully!');
            editingProductId = null;
            loadProducts();
        } catch (error) {
            console.error(error.message);
        }
    });

    // Load product details for editing
    async function editProduct(productId) {
        try {
            const response = await fetch(`${productApiUrl}/${productId}`);
            const product = await response.json();

            document.getElementById('name').value = product.name;
            document.getElementById('description').value = product.description;
            document.getElementById('richDescription').value = product.richDescription;
            document.getElementById('brand').value = product.brand;
            document.getElementById('price').value = product.price;
            document.getElementById('product-category').value = product.category;
            document.getElementById('countInStock').value = product.countInStock;
            document.getElementById('isFeatured').checked = product.isFeatured;

            editingProductId = productId;

        } catch (error) {
            console.error('Error loading product for editing:', error);
        }
    }

    loadCategories();
    loadProducts();
    loadUsers();
});
