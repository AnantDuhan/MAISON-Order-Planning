// "Keep me signed in" choice on the sign-in page. Stored per browser so every
// sign-in method (password, Google, email/phone code, magic link opened later,
// passkey) sends the same choice to the server.
const KEY = 'maison.rememberMe';

export const getRememberMe = () => {
    try {
        return localStorage.getItem(KEY) !== 'false';
    } catch {
        return true;
    }
};

export const setRememberMe = value => {
    try {
        localStorage.setItem(KEY, value ? 'true' : 'false');
    } catch {
        // Private mode / storage disabled: the default (remember) applies.
    }
};
