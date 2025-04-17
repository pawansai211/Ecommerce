document.addEventListener('DOMContentLoaded', async () => {
    const apiUrl = 'http://localhost:3000/api/v1/products';
    const recommendationsApiUrl = 'http://localhost:3000/api/v1/recommendations';
    const productList = document.getElementById('product-list');
    const recommendationsList = document.getElementById('recommendations');

    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    async function fetchRecommendations() {
        if (!userId) {
            fetchFeaturedProducts(); // Show featured products if not logged in
            fetchAllProducts(); // Load all products
            return;
        }

        try {
            const response = await fetch(`${recommendationsApiUrl}/${userId}`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();

            if (response.ok && data.recommendations.length > 0) {
                displayProducts(data.recommendations, recommendationsList);
            } else {
                fetchFeaturedProducts();
            }
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            fetchFeaturedProducts();
        } finally {
            fetchAllProducts(); // Load all products regardless
        }
    }

    async function fetchFeaturedProducts() {
        try {
            const response = await fetch(apiUrl);
            const products = await response.json();
            const featuredProducts = products.filter(p => p.isFeatured).slice(0, 5);
            displayProducts(featuredProducts, recommendationsList);
        } catch (error) {
            console.error('Error fetching featured products:', error);
        }
    }

    async function fetchAllProducts() {
        try {
            const response = await fetch(apiUrl);
            const products = await response.json();
            displayProducts(products, productList);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    }

    function displayProducts(products, container) {
        container.innerHTML = '';

        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.classList.add('product-card');

            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${product.description}</p>
                <p><strong>Price:</strong> $${product.price}</p>
                ${product.isFeatured ? '<span class="featured">Featured</span>' : ''}
                <button class="add-to-cart" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-image="${product.image}">Add to Cart</button>
            `;

            container.appendChild(productCard);
        });

        document.querySelectorAll('.add-to-cart').forEach(button => {
            button.addEventListener('click', function () {
                const productId = this.getAttribute('data-id');
                const productName = this.getAttribute('data-name');
                const productPrice = this.getAttribute('data-price');
                const productImage = this.getAttribute('data-image');

                let cart = JSON.parse(localStorage.getItem('cart')) || [];
                let product = cart.find(item => item.id === productId);

                if (product) {
                    product.quantity += 1;
                } else {
                    cart.push({ id: productId, name: productName, price: productPrice, image: productImage, quantity: 1 });
                }

                localStorage.setItem('cart', JSON.stringify(cart));
                alert(`${productName} added to cart!`);

                // Update cart count in the dashboard
                updateCartCount();
            });
        });
    }

    function updateCartCount() {
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const cartCountElement = document.getElementById('cart-count');
        if (cartCountElement) {
            cartCountElement.innerText = cart.reduce((total, item) => total + item.quantity, 0);
        }
    }

    fetchRecommendations();
});
