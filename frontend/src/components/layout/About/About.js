import React from "react";
import "./About.css";
import { Button, Typography, Avatar } from "@mui/material";
import YouTubeIcon from "@mui/icons-material/YouTube";
import InstagramIcon from "@mui/icons-material/Instagram";
import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

const About = () => {
  const visitInstagram = () => {
    window.location = "https://instagram.com/anantduhan_";
  };
  return (
      <div className='aboutSection'>
          <div></div>
          <div className='aboutSectionGradient'></div>
          <div className='aboutSectionContainer'>
              <Typography component='h1'>About Us</Typography>

              <div>
                  <div>
                      <Avatar
                          style={{
                              width: '13vmax',
                              height: '13vmax',
                              margin: '2vmax 0'
                          }}
                          src='https://res.cloudinary.com/anantduhan/image/upload/v1651066064/avatars/WhatsApp_Image_2022-04-27_at_6.19.23_PM_zislxv.jpg'
                          alt='Founder'
                      />
                      <Typography variant='h4'>Anant Duhan</Typography>
                      <Typography variant='h7'>Founder & CEO of Order Planning</Typography>
                      <Button onClick={visitInstagram} color='primary'>
                          Visit Instagram
                      </Button>
                      <span>
                          This is a MERN stack Ecommerce website made by{' '}
                          <a href='https://www.linkedin.com/in/anantduhan/'>
                              @anantduhan
                          </a>
                          . I'm a <b>Full Stack Developer</b> and a{' '}
                          <b>B.tech Graduate</b> from{' '}
                          <b>
                              SRM Institute Of Science and Technology (2023
                              Batch)
                          </b>
                          .
                      </span>
                  </div>
                  <div className='aboutSectionContainer2'>
                      <Typography component='h2'>Our Brands</Typography>
                      <a
                          href='https://www.youtube.com/channel/AnantDuhan'
                          target='blank'
                      >
                          <YouTubeIcon className='youtubeSvgIcon' />
                      </a>

                      <a
                          href='https://instagram.com/anantduhan_'
                          target='blank'
                      >
                          <InstagramIcon className='instagramSvgIcon' />
                      </a>

                      <a
                          href='https://facebook.com/anantduhan12'
                          target='blank'
                      >
                          <FacebookIcon className='facebookSvgIcon' />
                      </a>

                      <a
                          href='https://www.linkedin.com/in/anantduhan/'
                          target='blank'
                      >
                          <LinkedInIcon className='linkedinSvgIcon' />
                      </a>
                  </div>
              </div>
          </div>
      </div>
  );
};

export default About;
