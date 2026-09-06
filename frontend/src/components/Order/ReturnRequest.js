import React, { Fragment, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBar from 'react-top-loading-bar';

import { returnRequest } from '../../actions/orderAction';
import MetaData from '../layout/MetaData';

const ReturnRequest = () => {
    const [returnReason, setReturnReason] = useState('');
    const [progress, setProgress] = useState(0);
    const onLoaderFinished = () => setProgress(0);

    const dispatch = useDispatch();
    const { id } = useParams();
    const navigate = useNavigate();

    const { loading } = useSelector(state => state.returnRequest);

    const returnReasons = [
        'Defective Product',
        'Wrong Product Shipped',
        'Received Incomplete Order',
        "Product Doesn't Match Description",
        'Size Does Not Fit',
        "Color Doesn't Match",
        'Changed My Mind',
        'Item Arrived Late',
        'Ordered by Mistake',
        'Unsatisfactory Quality',
        'Received Damaged Product',
        'Ordered Duplicate Product',
        'Product Expired/Short Expiry Date',
        'Not Satisfied with Performance',
        "Item Doesn't Meet Expectations",
    ];

    const submitReturnRequest = e => {
        e.preventDefault();
        if (id && returnReason) {
            dispatch(returnRequest(id, returnReason));
            toast.success('Return request submitted successfully');
            navigate('/orders');
        }
    };

    return (
        <Fragment>
            {loading ? (
                <LoadingBar color='#A07C4B' progress={progress} onLoaderFinished={onLoaderFinished} />
            ) : (
                <Fragment>
                    <MetaData title='Request Return · Maison' />
                    <div className='form-shell'>
                        <div className='form-card'>
                            <p className='eyebrow'>Order Support</p>
                            <h2 className='heading-display mt-2 text-3xl'>Request a Return</h2>
                            <p className='mt-3 font-sans text-sm text-ink-soft'>
                                Tell us what went wrong and we'll take it from there.
                            </p>

                            <form className='mt-8 flex flex-col gap-6' onSubmit={submitReturnRequest}>
                                <div>
                                    <label className='eyebrow'>Reason for return</label>
                                    <select
                                        value={returnReason}
                                        onChange={e => setReturnReason(e.target.value)}
                                        className='mt-3 w-full border border-line bg-transparent px-4 py-3 font-sans text-sm text-ink focus:border-brass focus:outline-none'
                                    >
                                        <option value=''>Select Return Reason</option>
                                        {returnReasons.map((reason, index) => (
                                            <option key={index} value={reason}>{reason}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type='submit'
                                    onClick={() => setProgress(progress + 80)}
                                    disabled={!returnReason}
                                    className='btn-solid w-full disabled:opacity-40'
                                >
                                    Submit Return
                                </button>
                            </form>
                        </div>
                    </div>
                </Fragment>
            )}
        </Fragment>
    );
};

export default ReturnRequest;
