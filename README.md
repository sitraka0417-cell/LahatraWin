# Lahatra pour Windows

Même application que Lahatra Android : même compte Google, mêmes tâches (Firestore `users/{uid}/tasks`).
Livrée avec un **installateur Windows** (`Lahatra-Setup.exe`).

## Fonctions
Agenda (semaine/mois), tâches (date, heure facultative, priorité, catégorie, répétition, alarme, note),
statuts À faire / Terminée / En retard, alarmes qui sonnent (même fenêtre fermée, via la zone de notification),
report 5/10/15 min, alarme du matin, recherche et filtres, statistiques, thème clair/sombre,
code PIN avec verrouillage automatique (inactivité, fenêtre masquée, Win + L), mode hors ligne.

## Mise à jour sans perte de données
Lancez simplement le nouvel installateur : il remplace l'ancienne version. Les réglages et la connexion
(dans `%APPDATA%\Lahatra`) ne sont jamais touchés.

## Configuration de la connexion Google (une seule fois)
1. Dépôt GitHub **public** + GitHub Pages : *Settings → Pages → Branch `main`, dossier `/docs`*.
2. Firebase (projet `lahatra-7be8b`) → Authentication → Paramètres → **Domaines autorisés** : ajouter `sitraka0417-cell.github.io`.
3. Firebase → Authentication → Méthode de connexion : **Google** activé (déjà fait pour Android).

## Compiler l'installateur
GitHub → Actions → « Installateur Windows Lahatra » → *Run workflow* → artefact **Lahatra-Windows-Setup**.
Chaque exécution publie aussi `Lahatra-Setup.exe` dans les **Releases** :
- https://github.com/sitraka0417-cell/LahatraWin/releases/latest/download/Lahatra-Setup.exe
- Page de téléchargement : https://sitraka0417-cell.github.io/LahatraWin/telecharger.html

## Règles Firestore (identiques à Android)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```
