import React from 'react';
import { ToastContainer, Slide, toast } from 'react-toastify';
import './MaisonToast.css';

/*
 * MAISON toasts: a small editorial card in the site's own vocabulary — a
 * brass eyebrow, the message in Cormorant, and the rule-luxe hairline whose
 * brass tick runs the timer. Toasts stack and fan out on hover.
 *
 * Every existing toast.success / error / info / warn call gets this look
 * automatically: plain-text messages are wrapped here, so no call site
 * changes.
 */

// Many calls pass error.message straight through, which for network failures
// is library wording ("Request failed with status code 500", "Network Error").
// Translate those once here instead of at every call site.
const FRIENDLY_STATUS = {
    400: 'Something in that request wasn’t right. Please check and try again.',
    401: 'Please sign in to continue.',
    403: 'You don’t have access to that.',
    404: 'We couldn’t find that. It may have been removed.',
    409: 'That changed in the meantime. Please refresh and try again.',
    413: 'That file is too large.',
    429: 'Too many attempts. Please wait a moment and try again.',
};

export const friendlyMessage = content => {
    if (typeof content !== 'string') return content;
    const text = content.trim();
    const status = /^Request failed with status code (\d{3})$/.exec(text);
    if (status) {
        const code = Number(status[1]);
        return FRIENDLY_STATUS[code] || (code >= 500
            ? 'Something went wrong on our side. Please try again in a moment.'
            : 'Something went wrong. Please try again.');
    }
    if (/^Network Error$/i.test(text)) return 'Can’t reach MAISON right now. Check your connection and try again.';
    if (/^timeout of \d+ms exceeded$/i.test(text)) return 'That took too long. Please try again.';
    return content;
};

const LABELS = {
    success: 'Confirmed',
    error: 'Attention',
    warning: 'Please note',
    info: 'Note',
    default: 'MAISON',
};

const ToastBody = ({ kind, message }) => (
    <div className='maison-toast__body'>
        <p className={`maison-toast__eyebrow maison-toast__eyebrow--${kind}`}>{LABELS[kind] || LABELS.default}</p>
        <p className='maison-toast__message'>{message}</p>
    </div>
);

// Wrap plain-text messages in the editorial layout; anything already a React
// element is shown as given.
const wrap = (kind, content) => (typeof content === 'string' || typeof content === 'number'
    ? <ToastBody kind={kind} message={kind === 'error' ? friendlyMessage(String(content)) : String(content)} />
    : content);

if (!toast.__maison) {
    for (const kind of ['success', 'error', 'info', 'warning']) {
        const original = toast[kind];
        toast[kind] = (content, options) => original(wrap(kind, content), options);
    }
    toast.warn = toast.warning;
    toast.__maison = true;
}

const CloseButton = ({ closeToast }) => (
    <button type='button' className='maison-toast__close' onClick={closeToast} aria-label='Dismiss notification'>
        <svg viewBox='0 0 24 24' aria-hidden='true'>
            <path d='M7 7l10 10M17 7L7 17' />
        </svg>
    </button>
);

const MaisonToaster = () => (
    <ToastContainer
        className='maison-toasts'
        position='bottom-right'
        autoClose={4500}
        stacked
        newestOnTop={false}
        closeOnClick={false}
        pauseOnHover
        pauseOnFocusLoss
        draggable='touch'
        draggablePercent={35}
        transition={Slide}
        icon={false}
        closeButton={CloseButton}
        theme='light'
    />
);

export default MaisonToaster;
