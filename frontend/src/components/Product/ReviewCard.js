import { Rating } from '@mui/material';
import React from 'react'

import profilePng from '../../images/Profile.png';

const ReviewCard = ({ review }) => {

  const options = {
        size: 'large',
        value: review.rating,
        readOnly: false,
        precision: 0.2,
    };

  return (
      <div className='reviewCard'>
          <img src={profilePng} alt='User' />
          <p>{review.name}</p>
          <Rating name={`rating-${review.id}`} {...options} />
          <span className='reviewCardComment'>{review.comment}</span>
      </div>
  );
}

export default ReviewCard;
