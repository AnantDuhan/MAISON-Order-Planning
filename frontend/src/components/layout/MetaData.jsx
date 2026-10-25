import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

// An env value without a scheme ("maisonorderplanning.in") made the browser
// treat every canonical and og:url as a relative path, so add https:// here.
const withScheme = url => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
export const SITE_URL = withScheme(
    (import.meta.env.VITE_SITE_URL || 'https://maisonorderplanning.in').trim().replace(/\/+$/, '')
);
export const DEFAULT_DESCRIPTION =
    'Maison is a curated store for everyday objects — tech, accessories and pieces chosen with intention, made to be kept.';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * Per-page <head> tags: title, description, canonical, Open Graph and Twitter.
 * Existing `<MetaData title='…' />` calls keep working; pass the rest where it helps.
 */
const MetaData = ({ title, description, image, type = 'website', noIndex = false }) => {
    const { pathname } = useLocation();
    const desc = (description || DEFAULT_DESCRIPTION).replace(/\s+/g, ' ').trim().slice(0, 160);
    const url = `${SITE_URL}${pathname}`;
    const img = image || DEFAULT_IMAGE;

    return (
        <Helmet>
            <title>{title}</title>
            <meta name='description' content={desc} />
            <link rel='canonical' href={url} />
            {noIndex && <meta name='robots' content='noindex, nofollow' />}

            <meta property='og:title' content={title} />
            <meta property='og:description' content={desc} />
            <meta property='og:url' content={url} />
            <meta property='og:type' content={type} />
            <meta property='og:image' content={img} />

            <meta name='twitter:card' content='summary_large_image' />
            <meta name='twitter:title' content={title} />
            <meta name='twitter:description' content={desc} />
            <meta name='twitter:image' content={img} />
        </Helmet>
    );
};

export default MetaData;
