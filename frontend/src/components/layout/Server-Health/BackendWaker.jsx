import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { wakeUpServer } from '../../../actions/serverAction';
import Loader from '../Loader/Loader';

const BackendWaker = ({ children }) => {
    const dispatch = useDispatch();
    const { isAwake } = useSelector(state => state.server);

    const isDevelopment = import.meta.env.DEV;

    useEffect(() => {
        if (isDevelopment) {
            return undefined;
        }

        dispatch(wakeUpServer());
        return undefined;
    }, [dispatch, isDevelopment]);

    if (isDevelopment) {
        return children;
    }

    if (!isAwake) {
        return (
            <div className='fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-canvas px-6 text-center'>
                <Loader inline label={null} size='lg' />
                <h1 className='heading-display mt-2 text-display'>Maison</h1>
                <p className='mt-4 font-display text-xl italic text-ink-soft'>The house is opening its doors…</p>
                <p className='mt-8 max-w-sm font-sans text-sm leading-relaxed text-ink-faint'>
                    Our servers rest when the shop is quiet. The first visit after a pause takes about
                    30–50 seconds; everything is quick after that.
                </p>
            </div>
        );
    }

    return children;
};

export default BackendWaker;
