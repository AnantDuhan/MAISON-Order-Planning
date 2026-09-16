const http = require('http');

const targets = ['http://localhost:4000', 'http://localhost:4001'];
let i = 0;

const server = http.createServer((req, res) => {
    const target = targets[i % targets.length];
    i++;
    const url = new URL(req.url, target);

    const proxyReq = http.request(
        url,
        { method: req.method, headers: { ...req.headers, host: url.host } },
        proxyRes => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        }
    );

    proxyReq.on('error', err => {
        res.writeHead(502);
        res.end('Bad gateway: ' + err.message);
    });

    req.pipe(proxyReq);
});

server.listen(8080, () => console.log('LB listening on http://localhost:8080 → 4000, 4001'));