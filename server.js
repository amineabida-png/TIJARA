// Mini-serveur statique sans dépendance — pour Railway (ou tout hébergeur Node)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

const AUTH_USER = process.env.TIJARA_USER || 'admin';
const AUTH_PASS = process.env.TIJARA_PASSWORD;

function checkAuth(req) {
  const header = req.headers['authorization'] || '';
  if (!header.startsWith('Basic ')) return false;
  const [user, pass] = Buffer.from(header.slice(6), 'base64').toString().split(':');
  return user === AUTH_USER && pass === AUTH_PASS;
}

http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405); return res.end();
  }

  if (!checkAuth(req)) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="TIJARA"',
      'Content-Type': 'text/plain'
    });
    return res.end('Accès non autorisé');
  }

  fs.readFile(INDEX, (err, data) => {
    if (err) { res.writeHead(500); return res.end('Erreur serveur'); }
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}).listen(PORT, () => console.log('Tijara en ligne sur le port ' + PORT));
