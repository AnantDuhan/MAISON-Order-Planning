import { useDispatch, useSelector } from 'react-redux';
import { Fragment, useEffect } from 'react';
import { getAllPrices, getAllSubscription } from '../../actions/subscriptionAction';
import Loader from '../layout/Loader/Loader';
import MetaData from '../layout/MetaData';
import { toast } from 'react-toastify';
import './PlusMembership.css'
import { Link } from 'react-router-dom';

const PlusMembership = () => {
    const dispatch = useDispatch();
    const { loading, prices, error } = useSelector(
        state => state.plusSubscription
    );

    useEffect(() => {
        if (error) {
            toast.error('');
        }
        dispatch(getAllSubscription());
        dispatch(getAllPrices());
    }, [dispatch, error]);

    return (
        <Fragment>
            {loading ? (
                <Loader />
            ) : (
                <Fragment>
                    <MetaData title='Plus Membership' />

                    <h1 className='homeHeading'>
                        Elevate Your Shopping with{' '}
                        <span>
                            <b>Plus Membership!!</b>
                        </span>
                    </h1>

                    <div className='features-container'>
                        <div className='column'>
                            <h2>Exclusive Perks</h2>
                            <ul>
                                <li>
                                    Early access to Lightning Deals on{' '}
                                    <a
                                        href='http://www.orderplanning.com'
                                        target='_blank'
                                        rel='noopener noreferrer'
                                    >
                                        orderplanning.com
                                    </a>
                                </li>
                                <li>
                                    No minimum order value required for{' '}
                                    <span>
                                        <b>FREE Standard Delivery</b>
                                    </span>
                                    .
                                </li>
                            </ul>
                        </div>
                        <div className='plus-membership'>
                            <h2>Exclusive Packages</h2>
                            <div className='row'>
                                {prices &&
                                    prices.map(item => (
                                        <div
                                            key={item.id}
                                            className='subscription-package'
                                        >
                                            <h3>{item.id}</h3>
                                            <p>
                                                Amount: ₹
                                                {item.unit_amount / 100}
                                            </p>
                                            <p>
                                                Duration:{' '}
                                                {item.recurring?.interval_count}{' '}
                                                {item.recurring?.interval}
                                            </p>
                                            <Link
                                                to={`/join/plus-membership/${item.id}/pay`}
                                            >
                                                Subscribe Now
                                            </Link>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default PlusMembership;
