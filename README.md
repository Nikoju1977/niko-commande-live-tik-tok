# Niko Live Commander — Régie mobile TikTok

PWA locale conçue pour préparer les lives et conserver un conducteur de session sur **ordinateur, iPhone et Android**, sans serveur ni compte.

## Fonctions réellement implémentées

- Conducteur avec titre, date, heure de Miami et notes.
- Horloges Paris/Miami calculées par `Intl.DateTimeFormat` (y compris les changements d'heure).
- Chronomètre avec démarrage, pause, reprise et remise à zéro.
- Cues régie INTRO / MIX / PAUSE / FIN.
- Checklist de préparation (audio BOOTH/iRig, microphone, niveau, caméra, connexion, droits).
- Setlist éditable : ajouter un titre, BPM facultatif, déplacer, supprimer.
- Sauvegarde automatique en stockage local du navigateur, export/import JSON.
- Copie/partage volontaire du conducteur et PWA avec cache hors ligne.

## Limites

**Ce projet ne contrôle ni TikTok LIVE, ni OBS, ni les platines Pioneer, ni l'iRig.** Aucun accès à des API privées TikTok, aucun streaming, aucun monitoring réel de l'audio ni télécommande des appareils d'autrui. La régie est locale et ne synchronise pas deux téléphones entre eux.

Pour un contrôle OBS local réellement configuré, voir [Angie Local Commander](https://github.com/Nikoju1977/Angie-local-commander) : nécessite OBS WebSocket 5, un serveur local et les permissions adaptées.

Les données sont stockées sur le téléphone ou l'ordinateur utilisé. Utiliser `Exporter JSON` pour les sauvegarder avant de vider le navigateur. Pas de clé d'API.

## Hébergement

Le dépôt peut être servi sur un hébergeur statique HTTPS (GitHub Pages, Vercel), sans installation de dépendances. **La présence du code GitHub n'active pas automatiquement l'hébergement** : sa publication doit être configurée et confirmée.

## Statut

Créé le 22 novembre 2026 à partir d'un dépôt vide. **Code enregistré ; tests navigateur, iPhone et déploiement public non confirmés.**
