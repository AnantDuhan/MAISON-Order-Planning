/**
 * A "?redirect=" target we're willing to follow after sign-in: a path on this
 * site only ("/product/x?review=1"), never another site ("//evil.com",
 * "https://…", "/\\evil.com"). Returns null when it isn't safe.
 */
export const safeRedirect = value =>
    typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value : null;
