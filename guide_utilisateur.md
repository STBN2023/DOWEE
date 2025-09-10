# DoWee — Guide Utilisateur

Bienvenue sur DoWee, l’application de planification et de pilotage de portefeuilles projets. Ce guide présente les écrans, les fonctionnalités et les bonnes pratiques pour une utilisation efficace au quotidien.

Sommaire
1. Découverte rapide
2. Connexion et profil
3. Navigation générale
4. Bandeau d’information (ticker)
5. Planning hebdomadaire
6. Édition de la journée
7. Page “Aujourd’hui”
8. Tableaux de bord (Dashboards)
9. Rentabilité (Clients & Projets)
10. Reporting des modifications
11. Administration (Hub)
12. Astuces & bonnes pratiques
13. Dépannage (FAQ)
14. Sécurité & rôles (POC)
15. Contact et support
16. Assistant (Bot)

----------------------------------------------------------------

1) Découverte rapide

- Objectif: réduire le temps de saisie et de reporting des heures avec une planification “fluide”.
- Actions clés:
  - Glisser-déposer un projet depuis le bandeau dans la grille pour créer un créneau d’1h.
  - Étendre la plage en maintenant le drag verticalement (même journée).
  - Supprimer un créneau en le glissant hors de la grille.
  - Valider la journée: copier vos créneaux planifiés en heures réelles et marquer la journée comme “validée”.
- Tableaux de bord: Global, Équipe, Moi, avec une vision chiffrée (heures, coûts, nombre de projets).
- Rentabilité: vues synthétiques par client et par projet (soldes, coûts, marges).
- Administration: gestion des employés, clients, projets, barèmes (tarifs), coûts internes, paramètres du bandeau, et configuration du Bot (LLM/RAG/relances).


2) Connexion et profil

- Se connecter
  - Lien: “Se connecter” dans l’en-tête ou via la page /login.
  - Authentification e‑mail/mot de passe via Supabase (et Google OAuth pour Google Agenda).
- Profil salarié
  - Votre profil employees doit exister pour utiliser l’app. En cas de session “orpheline”, l’UI vous déconnecte automatiquement.
- Déconnexion
  - Bouton “Déconnexion” dans l’en‑tête (badge utilisateur).


3) Navigation générale

- En‑tête
  - Logo “DoWee”, sélecteur de vue par rôle (Admin/Manager/User), badge utilisateur (initiale + nom) et bouton “Déconnexion”.
- Menu latéral (Burger)
  - Général: Accueil, Planning (semaine), Journée, Tableaux de bord, Reporting modifs, Rentabilité clients/projets.
  - Administration: Admin (hub), Bandeau (paramètres), Profils salariés, Clients, Projets, Barèmes (tarifs), Coûts internes, Références, LLM (OpenAI), Bot, Debug (admin).
- Sélecteur de vue (rôle)
  - Pilote l’onglet par défaut des dashboards (Admin → Global, Manager → Équipe, User → Moi).
  - Note: ce sélecteur n’est pas un mécanisme d’autorisation (POC).


4) Bandeau d’information (ticker)

- Description
  - Bandeau défilant en bas de page, affichant:
    - Alertes internes (échéances, budgets, marges) si connecté.
    - Météo (WeatherAPI) selon la ville ou votre position.
    - Message personnalisé.
- Paramétrage (/admin/ticker)
  - Modules: Alertes internes ON/OFF, Météo ON/OFF.
  - Ville météo: ex. “Paris”.
  - Utiliser ma position: active la géolocalisation (bouton “Détecter ma position”).
  - Portée des alertes: Moi | Équipe | Global (impacte les baromètres sur le bandeau).
  - Message personnalisé: texte libre (les URLs https://… sont cliquables).
  - Rafraîchissement: bouton “Rafraîchir le bandeau”; mise à jour auto toutes les 5 minutes.


5) Planning hebdomadaire

- Accès: /planning.
- Structure:
  - Heures 08:00 → 18:00 (lignes), jours (colonnes).
  - Bandeau projets en haut: projets “actifs” qui vous sont affectés.
- Drag & drop:
  - Déposer sur une case vide pour créer 1h.
  - Étirement vertical mono‑jour: crée un créneau par heure survolée.
  - Démarrer sur une case vide = “insérer” (ne remplace pas).
  - Démarrer sur une case occupée = “remplacer”.
  - Déplacer: glisser un créneau vers une autre case (supprime l’ancien, crée le nouveau).
  - Supprimer: glisser un créneau hors de la grille et relâcher.
- Google Agenda (superposition):
  - Commandes en haut: “Afficher Google Agenda” (toggle), “Connecter Google Agenda” (OAuth Google), “Recharger”.
  - Évènements: badge “Gcal • n” dans la cellule; liseré bleu si all‑day; motif rouge en cas de conflit avec un créneau planifié.
- Effacer la semaine: supprime tous les créneaux planifiés de la semaine en cours.


6) Édition de la journée

- Accès: /day.
- Gestes rapides:
  - Sélectionner un projet puis cliquer sur une heure vide → création d’1h.
  - Double‑cliquer sur un créneau → suppression.
  - Drag & drop possible comme en vue semaine.
- Validation:
  - Bouton “Valider cette journée”: copie les plans en heures réelles et marque la journée validée.
  - Rappel automatique fin de journée (et via Bot, cf. chapitre 16).
  - Avertissement de fermeture si non validée (en fin de journée).


7) Page “Aujourd’hui”

- Accès: /today.
- Contenu:
  - Récapitulatif des créneaux planifiés du jour.
  - Bouton “Valider ma journée”.
  - Lien “Modifier mon planning” vers /day.


8) Tableaux de bord (Dashboards)

- Accès: /dashboards.
- Onglets:
  - Global (Admin): projets totaux/actifs/en pause; heures & coûts planifiés/réels de la semaine; vue annuelle.
  - Équipe (Manager): sélection d’équipe (conception, créa, dev), agrégations + top membres; vue annuelle.
  - Moi (User): mes heures & coûts semaine; vue annuelle personnelle.
- Navigation semaine: boutons Précédente / Cette semaine / Suivante; période affichée.
- Astuce: sur certaines listes, un “Score (priorité)” 0–100 aide à prioriser (plus haut = plus prioritaire). Des pastilles (i) expliquent le calcul quand disponible.


9) Rentabilité (Clients & Projets)

- Clients (/profitability/clients)
  - Liste: CA vendu, coût, marge, marge % (codes couleur).
  - Recherche, tri, export CSV.
- Projets (/profitability/projects)
  - Liste: client, CA vendu, coût, marge, marge %.
  - Filtre par client, recherche, tri, export CSV.
- Codes couleur Marge %
  - ≥ 40%: vert; 20–39%: jaune; 1–19%: orange; ≤ 0%: rouge.


10) Reporting des modifications

- Accès: /reports/changes.
- Calendrier “heatmap” (en‑tête de page)
  - Semaines en colonnes, jours en lignes; ~6 derniers mois.
  - Dégradé orange: plus foncé = plus de modifications.
  - Légende centrée sous le calendrier (“Moins” → “Plus”).
  - Survol: info‑bulle date + nombre de modifications.
- KPIs
  - Modifications totales sur la période.
  - “Jour‑même”: modifications effectuées le jour du créneau.
  - “Top projets”: projets avec le plus de modifications.
- Liste chronologique
  - Date d’occurrence, jour/heure ciblé, action, “avant / après”.
  - Badge “Jour‑même” si applicable.


11) Administration (Hub)

- Accès: /admin (hub).
- Profils salariés (/admin/employees): créer/modifier/supprimer; rôle (admin/manager/user); équipe.
- Clients (/admin/clients): créer/modifier/supprimer (code, nom).
- Projets (/admin/projects):
  - Création: code auto (CLIENT‑YYYY‑NNN), statut (actif/pause/archivé), client, barème, montants, échéance, effort (jours).
  - Affectations: associer des salariés (affiche le nom complet).
  - Finaliser (pause): met en pause + suppression des créneaux futurs (historique conservé).
- Barèmes (tarifs) (/admin/tariffs): tarifs HT par profil (conception/crea/dev).
- Coûts internes (/admin/internal-costs): coûts journaliers; la dernière entrée (date d’effet) est utilisée pour les calculs.
- Références (/admin/references): référentiels simples (stockage local pour le POC).
- LLM (OpenAI) (/admin/llm): enregistrer la clé OpenAI (stockée côté serveur).
- Bot (/admin/bot): réglages des relances (après‑midi, à la connexion) et indexation de la base de connaissance (RAG).
  - Base de connaissance (RAG): coller/charger le guide, choisir le chunk size / overlap, indexer, activer une version.
  - LLM: si configuré, le bot peut reformuler/prioriser ses messages.
- Debug (/debug): infos de session (réservé admin via menu).


12) Astuces & bonnes pratiques

- Drag & drop fluide (étirement mono‑jour).
- “Insérer” vs “Remplacer” (point de départ du drag).
- Suppression rapide par drag out.
- Conflits & visibilité Google Agenda (toggle, connecter, recharger).
- Affectations manquantes? vérifier dans Admin → Projets → Affecter.
- Validation quotidienne: valider en fin de journée (ou via la page Aujourd’hui).


13) Dépannage (FAQ)

- Météo absente
  - Vérifier module Météo, ville/position autorisée, clé serveur disponible.
- Projets manquants dans le bandeau
  - Vérifier les affectations et le statut projet (actif).
- Validation impossible
  - Session active requise; essayer /day ou /today.
- Liens non cliquables dans le message
  - Utiliser des URLs complètes https://…
- Google Agenda
  - Utiliser “Connecter Google Agenda” (OAuth Google), puis “Afficher” et “Recharger”. Autoriser le scope “calendar.readonly”.


14) Sécurité & rôles (POC)

- Auth: Supabase Auth (e‑mail/mot de passe, Google pour Agenda).
- Données: Postgres avec RLS.
- Sélecteur de rôle (UI): affiche des vues différentes; ce n’est pas un système d’autorisations fines.
- Sessions “orphelines”: déconnexion automatique côté client.


15) Contact et support

- En cas de blocage, fournir l’URL, l’action effectuée, l’heure, et si possible une capture.
- Pour les évolutions (nouveaux tableaux/champs/workflows), prioriser avec le Product Owner.


16) Assistant (Bot)

- Ouverture
  - Bouton flottant en bas à droite (robot orange) ou via des liens “Demander au bot” dans certaines aides (i).
  - Vous pouvez aussi l’ouvrir depuis d’autres écrans (ex: bouton “Ouvrir le bot”).
- Ce qu’il sait faire
  - Répondre sur l’utilisation de l’app (navigation rapide), expliquer des indicateurs (marge, score) et synthétiser vos chiffres clés.
  - Relancer la validation quotidienne (après‑midi, ou à la connexion selon réglages).
  - Si une base de connaissance (RAG) est indexée et active, il s’appuie dessus pour répondre.
  - Si un LLM est configuré (OpenAI), il peut reformuler/prioriser certains messages.
- Relances validation
  - À partir d’une heure définie l’après‑midi (par défaut 16h) et/ou à la connexion, il propose d’aller valider la journée si elle ne l’est pas.
  - Deux boutons: “Valider aujourd’hui” (ouvre /today) ou “Plus tard”.
- Réglages (Admin → Bot)
  - Activer/désactiver la relance de l’après‑midi et l’heure.
  - Activer la proposition à la connexion (avec option pour ignorer “Plus tard” déjà cliqué).
  - Indexer/activer une version de la base de connaissance (RAG).
- LLM (Admin → LLM)
  - Stocker la clé OpenAI côté serveur (jamais renvoyée au navigateur). Le bot l’utilise automatiquement si disponible.