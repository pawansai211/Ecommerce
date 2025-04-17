document.addEventListener('DOMContentLoaded', () => {
    const cartItemsContainer = document.getElementById('cart-items');
    const placeOrderButton = document.getElementById('place-order');
    const message = document.getElementById('message');

    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId'); // Get userId from localStorage

    function renderCart() {
        cartItemsContainer.innerHTML = '';
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p>Your cart is empty.</p>';
            placeOrderButton.style.display = 'none';
            return;
        }

        cart.forEach((item, index) => {
            const cartItem = document.createElement('div');
            cartItem.classList.add('cart-item');
            cartItem.innerHTML = `
                <img src="${item.image}" alt="${item.name}">
                <p><strong>${item.name}</strong></p>
                <p>Price: $${item.price}</p>
                <p>Quantity: <input type="number" value="${item.quantity}" min="1" data-index="${index}" class="quantity-input"></p>
                <button class="remove-btn" data-index="${index}">Remove</button>
            `;

            cartItemsContainer.appendChild(cartItem);
        });

        placeOrderButton.style.display = 'block';
    }

    // Handle quantity update
    cartItemsContainer.addEventListener('input', (event) => {
        if (event.target.classList.contains('quantity-input')) {
            const index = event.target.getAttribute('data-index');
            cart[index].quantity = parseInt(event.target.value);
            localStorage.setItem('cart', JSON.stringify(cart));
        }
    });

    // Handle item removal
    cartItemsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-btn')) {
            const index = event.target.getAttribute('data-index');
            cart.splice(index, 1);
            localStorage.setItem('cart', JSON.stringify(cart));
            renderCart();
        }
    });

    // Handle order placement
    placeOrderButton.addEventListener('click', async () => {
        if (!token || !userId) {
            message.innerText = 'You must be logged in to place an order.';
            return;
        }

        const apiUrl = 'http://localhost:3000/api/v1/orders';
        const orderData = {
            orderItems: cart.map(item => ({ product: item.id, quantity: item.quantity })),
            shippingAddress1: '123 Main Street',
            city: 'Your City',
            zip: '12345',
            country: 'Your Country',
            phone: '123-456-7890',
            user: userId // Attach userId to the order
        };

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(orderData)
            });

            if (!response.ok) {
                throw new Error('Failed to place order.');
            }

            localStorage.removeItem('cart');
            message.innerText = 'Order placed successfully!';
            renderCart();
        } catch (error) {
            message.innerText = error.message;
        }
    });

    renderCart();
});
