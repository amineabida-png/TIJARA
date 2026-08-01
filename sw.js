// Service worker minimal : sert uniquement à rendre l'app installable
// (Chrome/Android exige un service worker actif avec un gestionnaire fetch
// pour proposer "Ajouter à l'écran d'accueil"). Ne met volontairement RIEN
// en cache — la session d'impression de cette app a déjà souffert de pages
// figées par un cache obsolète ; mieux vaut toujours aller chercher la
// dernière version sur le réseau que de risquer de resservir une version
// périmée hors-ligne.
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());
self.addEventListener('fetch', e => { e.respondWith(fetch(e.request)); });
