// Mini-serveur statique sans dépendance — pour Railway (ou tout hébergeur Node)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405); return res.end();
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
