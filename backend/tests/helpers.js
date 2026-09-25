// Small test helpers — no test framework dependencies beyond node:test.
process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test-secret';
process.env.CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || 'cf-test-secret';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'https://shop.example';

// Replace obj[key] for one test; returns a restore function.
function stub(obj, key, value) {
    const original = obj[key];
    obj[key] = value;
    return () => { obj[key] = original; };
}

// Collects stubs so a test can restore them all in one call.
function stubs() {
    const restores = [];
    return {
        set(obj, key, value) { restores.push(stub(obj, key, value)); },
        restore() { while (restores.length) restores.pop()(); },
    };
}

// Minimal Express response double.
function mockRes() {
    const res = {
        statusCode: 200,
        body: undefined,
        headers: {},
        cookies: {},
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
        send(body) { this.body = body; return this; },
        set(name, value) { this.headers[name.toLowerCase()] = value; return this; },
        cookie(name, value) { this.cookies[name] = value; return this; },
    };
    return res;
}

module.exports = { stub, stubs, mockRes };
