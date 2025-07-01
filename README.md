# Pinger

Cette application mesure régulièrement le débit internet en utilisant Fast.com et affiche les résultats dans une interface web.

## Pré-requis

- Node.js >= 18

## Installation

```bash
npm install
```

## Lancement

```bash
npm start
```

Le serveur écoute sur le port `5000`. Rendez-vous sur [http://localhost:5000](http://localhost:5000) pour voir le tableau de bord.

## Docker

Pour lancer l'application dans un conteneur Docker :

```bash
docker build -t pinger .
docker run -p 5000:5000 pinger
```

## Fonctionnement

Un test de débit est effectué au démarrage puis toutes les minutes. Les mesures sont enregistrées dans `data.json` et présentées sous forme de graphique, de tableau et de statistiques.
