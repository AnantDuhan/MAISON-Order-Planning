// Serves a tiny HTML page (not JSON) that lets one email/SMS link work
// for both the mobile app and the web — the standard "custom URL scheme
// with a web fallback" technique used before an app has Universal Links /
// App Links set up (which needs a production or EAS build + registering
// the app with Apple/Google, neither of which exist yet for this app).
//
// It immediately tries the app's own scheme (configured in mobile/app.json
// as `orderplanning://`). If the device has the app installed and a
// handler for that scheme, the OS intercepts navigation and opens the
// app — this page never finishes loading. If nothing intercepts it within
// a short window, the fallback below sends the browser on to the normal
// web page instead.

function renderSmartRedirect({ appUrl, webUrl }) {
    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Opening…</title>
  <style>
    html, body { margin:0; padding:0; height:100%; background:#F7F4EF; font-family:Helvetica,Arial,sans-serif; }
    .wrap { display:flex; align-items:center; justify-content:center; height:100%; flex-direction:column; }
    a { color:#A07C4B; text-decoration:none; font-size:14px; margin-top:16px; }
  </style>
</head>
<body>
  <div class="wrap">
    <p style="color:#8A8278; font-size:13px;">Opening your order…</p>
    <a id="fallback" href="${webUrl}">Continue in browser</a>
  </div>
  <script>
    // Try the app first.
    window.location.replace(${JSON.stringify(appUrl)});
    // If the app didn't intercept navigation within this window
    // (not installed, or the platform blocked it), go to the web page.
    setTimeout(function () {
      window.location.replace(${JSON.stringify(webUrl)});
    }, 1200);
  </script>
</body>
</html>`;
}

// GET /go/order/:id
exports.openOrder = (req, res) => {
    const { id } = req.params;
    const appUrl = `orderplanning://orders/${id}`;
    const webUrl = `${process.env.FRONTEND_URL}/order/${id}`;

    res.status(200).send(renderSmartRedirect({ appUrl, webUrl }));
};
