import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LibraryAddCheckIcon from '@mui/icons-material/LibraryAddCheck';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import React, { Fragment } from 'react';

const CheckoutSteps = ({ activeStep }) => {
    const steps = [
        { label: 'Shipping', icon: <LocalShippingIcon fontSize='small' /> },
        { label: 'Confirm Order', icon: <LibraryAddCheckIcon fontSize='small' /> },
        { label: 'Payment', icon: <AccountBalanceIcon fontSize='small' /> },
    ];

    return (
        <Fragment>
            <div className='editorial-shell pt-12'>
                <div className='mx-auto flex max-w-xl items-center'>
                    {steps.map((step, index) => {
                        const complete = activeStep >= index;
                        const current = activeStep === index;
                        return (
                            <Fragment key={index}>
                                <div className='flex flex-col items-center'>
                                    <div
                                        className={`grid h-11 w-11 place-items-center rounded-full border transition-all duration-500 ease-luxe ${
                                            complete
                                                ? 'border-brass bg-brass text-white'
                                                : 'border-line bg-transparent text-ink-faint'
                                        }`}
                                    >
                                        {step.icon}
                                    </div>
                                    <span
                                        className={`mt-3 whitespace-nowrap font-sans text-[0.68rem] uppercase tracking-luxe transition-colors ${
                                            current ? 'text-brass' : complete ? 'text-ink' : 'text-ink-faint'
                                        }`}
                                    >
                                        {step.label}
                                    </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className='relative -mt-6 flex-1'>
                                        <div className='h-px w-full bg-line' />
                                        <div
                                            className={`absolute inset-0 h-px bg-brass transition-all duration-700 ease-luxe ${
                                                activeStep > index ? 'w-full' : 'w-0'
                                            }`}
                                        />
                                    </div>
                                )}
                            </Fragment>
                        );
                    })}
                </div>
            </div>
        </Fragment>
    );
};

export default CheckoutSteps;
