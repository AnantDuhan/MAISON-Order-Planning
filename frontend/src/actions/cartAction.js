import {
    ADD_TO_CART,
    REMOVE_CART_ITEM,
    SAVE_SHIPPING_INFO,
    CLEAR_CART_ITEMS
} from '../constants/cartConstants';
import axios from 'axios';

// Logged-in carts are mirrored to the server so a cart left behind can be
// recovered (reminder emails, other devices). Debounced; failures are silent —
// localStorage stays the source of truth on this device.
let syncTimer = null;
const syncCartToServer = getState => {
    if (!getState().user?.isAuthenticated) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
        const items = getState().cart.cartItems.map(item => ({
            product: item.product,
            name: item.name,
            price: item.price,
            image: item.image,
            quantity: item.quantity,
        }));
        axios.put('/api/v1/cart', { items }).catch(() => {});
    }, 800);
};

export const pushCartToServer = () => (dispatch, getState) => syncCartToServer(getState);

// Bring back a cart saved on the server (e.g. from a reminder email) into this
// device. Re-reads each product, so prices and stock are current.
export const restoreCartFromServer = () => async (dispatch, getState) => {
    const { data } = await axios.get('/api/v1/cart');
    const saved = data.items || [];
    for (const item of saved) {
        try {
            await dispatch(addItemsToCart(item.product, item.quantity));
        } catch {
            // Product removed since: skip it.
        }
    }
    return saved.length;
};

// Add to Cart
export const addItemsToCart = (id, quantity) => async (dispatch, getState) => {
    const { data } = await axios.get(`/api/v1/product/${id}`);

    dispatch({
        type: ADD_TO_CART,
        payload: {
            product: data.product._id,
            name: data.product.name,
            price: data.product.price,
            image: data.product.images[0].url,
            stock: data.product.Stock,
            quantity
        }
    });

    localStorage.setItem(
        'cartItems',
        JSON.stringify(getState().cart.cartItems)
    );
    syncCartToServer(getState);
};

// REMOVE FROM CART
export const removeItemsFromCart = id => async (dispatch, getState) => {
    dispatch({
        type: REMOVE_CART_ITEM,
        payload: id
    });

    localStorage.setItem(
        'cartItems',
        JSON.stringify(getState().cart.cartItems)
    );
    syncCartToServer(getState);
};

// SAVE SHIPPING INFO
export const saveShippingInfo = data => async dispatch => {
    dispatch({
        type: SAVE_SHIPPING_INFO,
        payload: data
    });

    localStorage.setItem('shippingInfo', JSON.stringify(data));
};

export const clearCart = () => (dispatch, getState) => {
    dispatch({
        type: CLEAR_CART_ITEMS
    });

    localStorage.removeItem('cartItems');
    syncCartToServer(getState);
};
