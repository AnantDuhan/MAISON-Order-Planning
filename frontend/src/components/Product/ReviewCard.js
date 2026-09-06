import { Rating } from '@mui/material';
import React from 'react';

import profilePng from '../../images/Profile.png';

const ReviewCard = ({ review }) => {
    const options = {
        size: 'small',
        value: review.rating,
        readOnly: true,
        precision: 0.2,
    };

    return (
        <div className='flex h-full flex-col border border-line bg-surface p-6'>
            <div className='flex items-center gap-3'>
                <img src={profilePng} alt='User' className='h-10 w-10 rounded-full object-cover' />
                <div>
                    <p className='font-display text-lg font-medium text-ink'>{review.name}</p>
                    <Rating name={`rating-${review.id}`} {...options} />
                </div>
            </div>
            <p className='mt-4 font-sans text-sm leading-relaxed text-ink-soft'>{review.comment}</p>
        </div>
    );
};

export default ReviewCard;
