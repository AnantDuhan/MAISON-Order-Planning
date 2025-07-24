// import { Elements } from '@stripe/react-stripe-js';
// import { loadStripe } from '@stripe/stripe-js';
// import axios from 'axios';
import { Fragment, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Route, Routes, useLocation } from 'react-router-dom';
import WebFont from 'webfontloader';

import { loadUser } from './actions/userAction';
import Dashboard from './components/Admin/Dashboard';
import NewProduct from './components/Admin/NewProduct';
import OrderList from './components/Admin/OrderList';
import ProcessOrder from './components/Admin/ProcessOrder';
import ProductList from './components/Admin/ProductList';
import ProductReviews from './components/Admin/ProductReviews';
import RefundList from './components/Admin/RefundList';
import ReturnList from './components/Admin/ReturnList';
import UpdateProduct from './components/Admin/UpdateProduct';
import UpdateUser from './components/Admin/UpdateUser';
import UsersList from './components/Admin/UsersList';
import Cart from './components/Cart/Cart';
import ConfirmOrder from './components/Cart/ConfirmOrder';
import OrderSuccess from './components/Cart/OrderSuccess';
import Payment from './components/Cart/Payment';
import Shipping from './components/Cart/Shipping';
import Home from './components/Home/Home';
import About from './components/layout/About/About';
import Contact from './components/layout/Contact/Contact';
import AdminHeader from './components/layout/Header/AdminHeader';
import MainHeader from './components/layout/Header/MainHeader';
import NotFound from './components/layout/Not-Found/NotFound';
import MyOrders from './components/Order/MyOrders';
import OrderDetails from './components/Order/OrderDetails';
import ReturnRequest from './components/Order/ReturnRequest';
import ProductDetails from './components/Product/ProductDetails';
import Products from './components/Product/Products';
import SearchResult from './components/Product/SearchResult';
import Wishlist from './components/Product/Wishlist';
import PaymentPlusMembership from './components/Subscription/PaymentPlusMembership';
import PlusMembership from './components/Subscription/PlusMembership';
import ForgotPassword from './components/User/ForgotPassword';
import LoginAndRegister from './components/User/LoginAndRegister';
import Profile from './components/User/Profile';
import ResetPassword from './components/User/ResetPassword';
import UpdatePassword from './components/User/UpdatePassword';
import UpdateProfile from './components/User/UpdateProfile';
import store from './store';

import './App.css';

function App() {
    const { isAuthenticated } = useSelector(state => state.user);
    // const [stripeApiKey, setStripeApiKey] = useState('');

    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');

    // const [stripePromise] = useState(() => loadStripe('pk_test_51K9RkSSDvITsgzEyN1XtfELWFWiUetYQEU3NWsuHgEmnn07jtXs0HJKJ1x2cXldIX2hOc9qrm81fS6Fi1Z0pHsvu000MvtXP6h'));

    useEffect(() => {
        // async function getStripeApiKey() {
        //     try {
        //         const { data } = await axios.get('/api/v1/stripeapikey');
        //         setStripeApiKey(data.stripeApiKey);
        //     } catch (error) {
        //         console.error("Could not get Stripe API Key", error);
        //     }
        // }

        WebFont.load({
            google: {
                families: ['Roboto', 'Droid Sans', 'Chilanka']
            }
        });
        store.dispatch(loadUser());
        // getStripeApiKey();
    }, []);

    window.addEventListener('contextmenu', e => e.preventDefault());

    return (
        <Fragment>
            {!isAdminRoute && <MainHeader />}
            {isAdminRoute && <AdminHeader />}

            <Routes>
                {/* General Routes */}
                <Route path='/' element={<Home />} exact />
                <Route path='/product/:id' element={<ProductDetails />} exact />
                <Route path='/products' element={<Products />} exact />
                <Route path='/products/:keyword' element={<Products />} exact />
                <Route path='/products/search' element={<SearchResult />} exact />
                <Route path='/about' element={<About />} exact />
                <Route path='/contact-us' element={<Contact />} exact />
                <Route path='/cart' element={<Cart />} exact />

                {/* Auth Routes */}
                <Route path='/login' element={<LoginAndRegister />} exact />
                <Route path='/password/forgot' element={<ForgotPassword />} exact />
                <Route path='/password/reset/:token' element={<ResetPassword />} exact />

                {/* Authenticated User Routes */}
                {isAuthenticated && <Route path='/account' element={<Profile />} exact />}
                {isAuthenticated && <Route path='/me/update' element={<UpdateProfile />} exact />}
                {isAuthenticated && <Route path='/password/update' element={<UpdatePassword />} exact />}
                {isAuthenticated && <Route path='/shipping' element={<Shipping />} exact />}
                {isAuthenticated && <Route path='/order/confirm' element={<ConfirmOrder />} exact />}
                {isAuthenticated && <Route path='/success' element={<OrderSuccess />} exact />}
                {isAuthenticated && <Route path='/orders' element={<MyOrders />} exact />}
                {isAuthenticated && <Route path='/order/:id' element={<OrderDetails />} exact />}
                {isAuthenticated && <Route path='/order/:id/return' element={<ReturnRequest />} exact />}
                {isAuthenticated && <Route path='/wishlist' element={<Wishlist />} exact />}
                
                {/* Payment Route with Stripe Wrapper */}
                {/* {isAuthenticated && (
                    <Route
                        path='/payment'
                        element={
                            stripeApiKey ? (
                                <Elements stripe={stripePromise}>
                                    <Payment />
                                </Elements>
                            ) : null
                        }
                        exact
                    />
                )} */}

                {/* Subscription Routes */}
                {isAuthenticated && <Route path='/join/plus-membership' element={<PlusMembership />} exact />}
                {isAuthenticated && <Route path='/join/plus-membership/:id/pay' element={<PaymentPlusMembership />} exact />}

                {/* Admin Routes */}
                {isAuthenticated && <Route path='/admin/dashboard' element={<Dashboard />} exact />}
                {isAuthenticated && <Route path='/admin/products' element={<ProductList />} exact />}
                {isAuthenticated && <Route path='/admin/add-product' element={<NewProduct />} exact />}
                {isAuthenticated && <Route path='/admin/product/:id' element={<UpdateProduct />} exact />}
                {isAuthenticated && <Route path='/admin/orders' element={<OrderList />} exact />}
                {isAuthenticated && <Route path='/admin/order/:id' element={<ProcessOrder />} exact />}
                {isAuthenticated && <Route path='/admin/users' element={<UsersList />} exact />}
                {isAuthenticated && <Route path='/admin/user/:id' element={<UpdateUser />} exact />}
                {isAuthenticated && <Route path='/admin/reviews' element={<ProductReviews />} exact />}
                {isAuthenticated && <Route path='/admin/returns' element={<ReturnList />} exact />}
                {isAuthenticated && <Route path='/admin/refunds' element={<RefundList />} exact />}

                {/* Catch-all Not Found Route - MUST BE LAST */}
                <Route path='*' element={<NotFound />} />
            </Routes>
        </Fragment>
    );
}

export default App;