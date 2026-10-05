import {
    ADD_TO_CART,
    REMOVE_CART_ITEM,
    SAVE_SHIPPING_INFO,
    CLEAR_CART_ITEMS
} from '../constants/cartConstants';

export const cartReducer = (
    state = { cartItems: [], shippingInfo: {} },
    action
) => {
    switch (action.type) {
        case ADD_TO_CART:
            const item = action.payload;

            // Same product in a different size/colour is a separate line.
            const sameLine = i => i.product === item.product && (i.variant || null) === (item.variant || null);
            const isItemExist = state.cartItems.find(sameLine);

            if (isItemExist) {
                return {
                    ...state,
                    cartItems: state.cartItems.map(i => (sameLine(i) ? item : i))
                };
            } else {
                return {
                    ...state,
                    cartItems: [...state.cartItems, item]
                };
            }

        case REMOVE_CART_ITEM:
            return {
                ...state,
                // Payload is { product, variant }; older callers pass just the id.
                cartItems: state.cartItems.filter(i => {
                    const target = typeof action.payload === 'object' ? action.payload : { product: action.payload };
                    return !(i.product === target.product && (i.variant || null) === (target.variant || null));
                })
            };

        case SAVE_SHIPPING_INFO:
            return {
                ...state,
                shippingInfo: action.payload
            };
        case CLEAR_CART_ITEMS: // Handle the new action type
            return {
                ...state,
                cartItems: [] // Clear cart items when an order is successfully placed
            };

        default:
            return state;
    }
};
