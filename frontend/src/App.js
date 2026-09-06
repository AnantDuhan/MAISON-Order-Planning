// import { Elements } from '@stripe/react-stripe-js';
// import { loadStripe } from '@stripe/stripe-js';
// import axios from 'axios';
import { Fragment, Suspense, lazy, useEffect } from "react";
import { useSelector } from "react-redux";
import { Route, Routes, useLocation } from "react-router-dom";
import WebFont from "webfontloader";

import { loadUser } from "./actions/userAction";
import Home from "./components/Home/Home";
import MainHeader from "./components/layout/Header/MainHeader";
import Footer from "./components/layout/Footer/Footer";
import store from "./store";

import "./App.css";
import BackendWaker from "./components/layout/Server-Health/BackendWaker";
import ErrorBoundary from "./components/layout/ErrorBoundary";
import Loader from "./components/layout/Loader/Loader";

/* Route-level code splitting.
   Home, the headers, the footer and the waker stay eager because they are
   needed for the first paint. Everything else — the whole admin panel,
   checkout, auth and the product pages — is fetched on demand, so a shopper
   landing on the homepage no longer downloads the admin bundle. */
const Dashboard = lazy(() => import("./components/Admin/Dashboard"));
const NewProduct = lazy(() => import("./components/Admin/NewProduct"));
const OrderList = lazy(() => import("./components/Admin/OrderList"));
const ProcessOrder = lazy(() => import("./components/Admin/ProcessOrder"));
const ProductList = lazy(() => import("./components/Admin/ProductList"));
const ProductReviews = lazy(() => import("./components/Admin/ProductReviews"));
const RefundList = lazy(() => import("./components/Admin/RefundList"));
const ReturnList = lazy(() => import("./components/Admin/ReturnList"));
const UpdateProduct = lazy(() => import("./components/Admin/UpdateProduct"));
const UpdateUser = lazy(() => import("./components/Admin/UpdateUser"));
const UsersList = lazy(() => import("./components/Admin/UsersList"));
const Cart = lazy(() => import("./components/Cart/Cart"));
const ConfirmOrder = lazy(() => import("./components/Cart/ConfirmOrder"));
const OrderSuccess = lazy(() => import("./components/Cart/OrderSuccess"));
const Shipping = lazy(() => import("./components/Cart/Shipping"));
const Payment = lazy(() => import("./components/Cart/Payment"));
const About = lazy(() => import("./components/layout/About/About"));
const Contact = lazy(() => import("./components/layout/Contact/Contact"));
const AdminHeader = lazy(
  () => import("./components/layout/Header/AdminHeader"),
);
const NotFound = lazy(() => import("./components/layout/Not-Found/NotFound"));
const MyOrders = lazy(() => import("./components/Order/MyOrders"));
const OrderDetails = lazy(() => import("./components/Order/OrderDetails"));
const ReturnRequest = lazy(() => import("./components/Order/ReturnRequest"));
const ProductDetails = lazy(
  () => import("./components/Product/ProductDetails"),
);
const Products = lazy(() => import("./components/Product/Products"));
const SearchResult = lazy(() => import("./components/Product/SearchResult"));
const Wishlist = lazy(() => import("./components/Product/Wishlist"));
const ForgotPassword = lazy(() => import("./components/User/ForgotPassword"));
const LoginAndRegister = lazy(
  () => import("./components/User/LoginAndRegister"),
);
const Profile = lazy(() => import("./components/User/Profile"));
const ResetPassword = lazy(() => import("./components/User/ResetPassword"));
const UpdatePassword = lazy(() => import("./components/User/UpdatePassword"));
const UpdateProfile = lazy(() => import("./components/User/UpdateProfile"));

function App() {
  const { isAuthenticated } = useSelector((state) => state.user);
  // const [stripeApiKey, setStripeApiKey] = useState('');

  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

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
        families: ["Roboto", "Droid Sans", "Chilanka"],
      },
    });
    store.dispatch(loadUser());
    // getStripeApiKey();
  }, []);

  window.addEventListener("contextmenu", (e) => e.preventDefault());

  return (
    <Fragment>
      <BackendWaker>
        {!isAdminRoute && <MainHeader />}
        {isAdminRoute && (
          <Suspense fallback={null}>
            <AdminHeader />
          </Suspense>
        )}

        <ErrorBoundary>
          <Suspense fallback={<Loader />}>
            <Routes>
              {/* General Routes */}
              <Route path="/" element={<Home />} exact />
              <Route path="/product/:id" element={<ProductDetails />} exact />
              <Route path="/products" element={<Products />} exact />
              <Route path="/products/:keyword" element={<Products />} exact />
              <Route path="/search" element={<SearchResult />} />
              <Route path="/about" element={<About />} exact />
              <Route path="/contact-us" element={<Contact />} exact />
              <Route path="/cart" element={<Cart />} exact />

              {/* Auth Routes */}
              <Route path="/login" element={<LoginAndRegister />} exact />
              <Route
                path="/password/forgot"
                element={<ForgotPassword />}
                exact
              />
              <Route
                path="/password/reset/:token"
                element={<ResetPassword />}
                exact
              />

              {/* Authenticated User Routes */}
              {isAuthenticated && (
                <Route path="/account" element={<Profile />} exact />
              )}
              {isAuthenticated && (
                <Route path="/me/update" element={<UpdateProfile />} exact />
              )}
              {isAuthenticated && (
                <Route
                  path="/password/update"
                  element={<UpdatePassword />}
                  exact
                />
              )}
              {isAuthenticated && (
                <Route path="/shipping" element={<Shipping />} exact />
              )}
              {isAuthenticated && (
                <Route path="/order/confirm" element={<ConfirmOrder />} exact />
              )}
              {isAuthenticated && (
                <Route path="/success" element={<OrderSuccess />} exact />
              )}
              {isAuthenticated && (
                <Route path="/orders" element={<MyOrders />} exact />
              )}
              {isAuthenticated && (
                <Route path="/order/:id" element={<OrderDetails />} exact />
              )}
              {isAuthenticated && (
                <Route
                  path="/order/:id/return"
                  element={<ReturnRequest />}
                  exact
                />
              )}
              {isAuthenticated && (
                <Route path="/wishlist" element={<Wishlist />} exact />
              )}

              {/* Payment Route with Razorpay Wrapper */}
              {isAuthenticated && (
                <Route path="/payment" element={<Payment />} exact />
              )}

              {/* Admin Routes */}
              {isAuthenticated && (
                <Route path="/admin/dashboard" element={<Dashboard />} exact />
              )}
              {isAuthenticated && (
                <Route path="/admin/products" element={<ProductList />} exact />
              )}
              {isAuthenticated && (
                <Route
                  path="/admin/add-product"
                  element={<NewProduct />}
                  exact
                />
              )}
              {isAuthenticated && (
                <Route
                  path="/admin/product/:id"
                  element={<UpdateProduct />}
                  exact
                />
              )}
              {isAuthenticated && (
                <Route path="/admin/orders" element={<OrderList />} exact />
              )}
              {isAuthenticated && (
                <Route
                  path="/admin/order/:id"
                  element={<ProcessOrder />}
                  exact
                />
              )}
              {isAuthenticated && (
                <Route path="/admin/users" element={<UsersList />} exact />
              )}
              {isAuthenticated && (
                <Route path="/admin/user/:id" element={<UpdateUser />} exact />
              )}
              {isAuthenticated && (
                <Route
                  path="/admin/reviews"
                  element={<ProductReviews />}
                  exact
                />
              )}
              {isAuthenticated && (
                <Route path="/admin/returns" element={<ReturnList />} exact />
              )}
              {isAuthenticated && (
                <Route path="/admin/refunds" element={<RefundList />} exact />
              )}

              {/* Catch-all Not Found Route - MUST BE LAST */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>

        {!isAdminRoute && <Footer />}
      </BackendWaker>
    </Fragment>
  );
}

export default App;
