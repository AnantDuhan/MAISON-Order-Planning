import React from 'react'
import playstore from '../../../images/playstore.png';
import Appstore from '../../../images/Appstore.png';
import './Footer.css'
const Footer = () => {
  return (
      <footer id='footer'>
          <div className='leftFooter'>
              <h4>DOWNLOAD OUR APP</h4>
              <p>Download App for Android and iOS mobile phone</p>
              <img src={playstore} alt='' />
              <img src={Appstore} alt='' />
          </div>

          <div className='midFooter'>
              <h1>Order Planning</h1>
              <p>High Quality is our first priority.</p>

              <p>
                  Copyright 2022<sup>&copy;</sup> AnantDuhan
              </p>
          </div>

          <div className='rightFooter'>
              <h4>Follow us</h4>
              <a
                  className='instagram'
                  href='http://instagram.com/anantduhan_'
              >
                  Instagram
              </a>
              <a
                  className='facebook'
                  href='http://facebook.com/AnantDuhan12'
              >
                  Facebook
              </a>
              <a
                  className='snapchat'
                  href='http://snapchat.com/add/anant_duhan'
              >
                  Snapchat
              </a>
          </div>
      </footer>
  );
}

export default Footer
