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
            ...(item.variant && { variant: item.variant, variantLabel: item.variantLabel }),
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
            await dispatch(addItemsToCart(item.product, item.quantity, item.variant || null));
        } catch {
            // Product removed since: skip it.
        }
    }
    return saved.length;
};

// Add to Cart
// A cart line is a product plus, for products with options, the chosen
// variant (e.g. Size M / Colour Black). The same product in two sizes is two
// lines.
export const cartLineKey = item => `${item.product}|${item.variant || ''}`;

const labelFor = (product, variant) =>
    (product.options || [])
        .map(o => (variant?.options?.[o.name] ? `${o.name}: ${variant.options[o.name]}` : null))
        .filter(Boolean)
        .join(' · ');

const photoForVariant = (product, variant) => {
    const colour = (product.options || []).find(o => o.kind === 'color');
    const value = colour && variant.options?.[colour.name];
    return (product.images || []).find(img => value && img.color === value) || product.images?.[0];
};

export const addItemsToCart = (id, quantity, variantId = null) => async (dispatch, getState) => {
    const { data } = await axios.get(`/api/v1/product/${id}`);
    const product = data.product;
    const variant = variantId ? (product.variants || []).find(v => v._id === variantId) : null;
    if ((product.variants || []).length && !variant) {
        throw new Error('Please choose an option for this product');
    }

    dispatch({
        type: ADD_TO_CART,
        payload: {
            product: product._id,
            ...(variant && { variant: variant._id, variantLabel: labelFor(product, variant) }),
            name: product.name,
            price: variant?.price ?? product.price,
            // The chosen colour's photo, so the bag shows what was picked.
            image: (variant ? photoForVariant(product, variant) : product.images?.[0])?.url,
            stock: variant ? variant.Stock : product.Stock,
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
export const removeItemsFromCart = (id, variant = null) => async (dispatch, getState) => {
    dispatch({
        type: REMOVE_CART_ITEM,
        payload: { product: id, variant }
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
