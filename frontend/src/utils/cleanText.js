// Some stored descriptions contain escaped newlines ("\n" as two characters)
// that rendered literally on the storefront. Turn them back into line breaks;
// render the result with `whitespace-pre-line`.
export const cleanText = value =>
    String(value ?? '')
        .replace(/\\r\\n|\\n|\\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
