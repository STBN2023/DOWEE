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
- Administration: gestion des employés, clients, projets, barèmes (tarifs), coûts internes, et paramètres du bandeau.


2) Connexion et profil

- Se connecter
  - Lien: “Se connecter” dans l’en-tête ou via la page /login.
  - Authentification e‑mail/mot de passe via Supabase.
- Création/activation du profil
  - Au premier login, votre profil salarié est créé automatiquement dans employees (nom affiché, prénom/nom si disponibles).
- Déconnexion
  - Bouton “Déconnexion” dans l’en‑tête (badge utilisateur).
- Session “orpheline”
  - Si une session existe mais aucun profil employees correspondant: l’UI se réinitialise automatiquement pour éviter tout état incohérent.


3) Navigation générale

- En‑tête
  - Logo “DoWee”, sélecteur de vue par rôle (Admin/Manager/User), badge utilisateur (initiale + nom) et bouton “Déconnexion”.
- Menu latéral (Burger)
  - Ouvre un tiroir avec les principales sections:
    - Général: Accueil, Planning (semaine), Journée, Tableaux de bord, Reporting modifs, Rentabilité clients/projets.
    - Administration: Hub Admin, Bandeau (paramètres), Profils salariés, Clients, Projets, Barèmes (tarifs), Coûts internes, Références, LLM (OpenAI), Debug (admin).
- Sélecteur de vue (rôle)
  - Impacte l’affichage par défaut des onglets des dashboards (Admin → Global, Manager → Équipe, User → Moi).
  - Important: ce sélecteur n’est pas un mécanisme d’autorisation (POC).


4) Bandeau d’information (ticker)

- Description
  - Bandeau défilant en bas de page, affichant:
    - Alertes internes (échéances, budgets, marges) si connecté.
    - Météo (WeatherAPI) selon la ville ou votre position (selon vos réglages).
    - Message personnalisé (texte libre).
- Paramétrage
  - Page: Administration → “Bandeau (paramètres)” (/admin/ticker).
  - Modules:
    - Alertes internes: ON/OFF (les alertes nécessitent une session active).
    - Météo: ON/OFF.
    - Ville météo: saisissez par exemple “Paris”.
    - Utiliser ma position: active la géolocalisation; pensez à autoriser le navigateur.
    - Message personnalisé: texte libre diffusé dans le bandeau.
  - Liens dans le message
    - Les URLs (https://…) sont automatiquement cliquables et s’ouvrent dans un nouvel onglet.
- Actualisation
  - Bouton “Rafraîchir le bandeau” dans la page de paramètres.
  - Rafraîchissement automatique toutes les 5 minutes.


5) Planning hebdomadaire

- Accès: Menu → “Planning (semaine)” (/planning).
- Structure:
  - Ligne de temps à gauche (heures 08:00 → 18:00).
  - Colonnes = jours de la semaine en cours (lundi → dimanche).
  - Bandeau de projets en haut: projets qui vous sont affectés (status projet “actif”).
- Navigation temporelle:
  - “Précédente”, “Cette semaine”, “Suivante”.
- Ajouter des créneaux (Drag & Drop)
  - Glissez un projet (pilule) vers une cellule vide: crée un créneau d’1h.
  - Étirement mono‑jour: pendant le drag, survolez plusieurs heures de la même journée pour ajouter une plage (un créneau par heure).
  - Surlignage: la plage courante est entourée (anneau ambré).
- Remplacer vs insérer
  - Démarrez le drag sur une case vide: n’ajoute que sur les cases libres (n’écrase pas).
  - Démarrez sur une case occupée: la plage cible remplacera les créneaux existants aux mêmes heures (comportement “remplacement”).
- Déplacer un créneau
  - Cliquez-déplacez un créneau vers une autre case pour le déplacer (supprime l’ancien, crée le nouveau).
- Supprimer un créneau
  - Glissez le créneau hors de la grille et relâchez.
- Indicateurs utiles
  - Conflits Google Agenda: si activé, la cellule peut afficher un badge “Gcal • n” (fond bleu) ou un motif rouge si conflit (planification + évènement). Un liseré bleu en haut de colonne indique un “all-day” ce jour-là.
  - Codes couleur des créneaux: teintes selon la note/score projet (vert, ambre, orange, rouge).
- Effacer la semaine
  - Bouton “Effacer la semaine”: supprime tous vos créneaux planifiés de la semaine en cours.


6) Édition de la journée

- Accès: Menu → “Journée (édition)” (/day).
- Vue simplifiée sur une seule date:
  - Bandeau projets en haut, liste d’heures en colonne (08:00 → 18:00).
- Trois gestes rapides:
  - Assignation au clic: sélectionnez un projet (pilule), cliquez sur une heure vide → crée un créneau.
  - Double‑clic pour supprimer: supprime le créneau sur l’heure.
  - Drag & drop: vous pouvez aussi déplacer/supprimer comme en vue semaine.
- Validation de la journée
  - Bouton “Valider cette journée”: copie vos créneaux planifiés en lignes “réelles” et marque la journée comme validée.
  - Rappel automatique: à partir de 18h locale, une invite s’affiche pour vous inciter à valider.
  - Avertissement de fermeture: si non validée et après 18h, un message prévient à la fermeture de l’onglet/fenêtre.


7) Page “Aujourd’hui”

- Accès: Menu → “Aujourd’hui” (/today).
- Contenu:
  - Récapitulatif de vos créneaux planifiés du jour (triés par heure).
  - Bouton “Valider ma journée” (mêmes effets que dans la page Journée).
  - Raccourcis: “Modifier mon planning” ouvre la page Journée.


8) Tableaux de bord (Dashboards)

- Accès: Menu → “Tableaux de bord” (/dashboards).
- Onglets:
  - Global (Admin): projets totaux/actifs/en pause, heures & coûts planifiés/réels (semaine), vue annuelle détaillée.
  - Équipe (Manager): filtres par équipe (conception, créa, dev), mêmes agrégations et top membres.
  - Moi (User): synthèse personnelle (heures & coûts semaine), vue annuelle personnelle.
- Navigation semaine (en haut à droite): “Précédente”, “Cette semaine”, “Suivante”, avec libellé de période.
- Le sélecteur de rôle (en‑tête) choisit l’onglet ouvert par défaut.


9) Rentabilité (Clients & Projets)

- Rentabilité Clients (/profitability/clients)
  - Liste des clients, CA vendu, coût, marge et marge % (codes couleur).
  - Recherche, tri et export CSV.
- Rentabilité Projets (/profitability/projects)
  - Liste des projets, rattachement client, CA vendu, coût, marge et marge %.
  - Filtre par client, recherche, tri et export CSV.
- Codes couleur Marge %
  - ≥ 40%: vert; 20–39%: jaune; 1–19%: orange; ≤ 0%: rouge.


10) Reporting des modifications

- Accès: “Reporting modifs” (/reports/changes).

- Calendrier des occurrences (heatmap)
  - En-tête de page: calendrier de type “contributions” (semaines en colonnes, jours en lignes) couvrant environ 6 derniers mois.
  - Dégradé orange du plus clair (moins de modifications) au plus foncé (plus de modifications).
  - Légende située sous le calendrier (“Moins” → “Plus”), centrée.
  - Survol: info-bulle indiquant la date et le nombre de modifications du jour.
  - Périmètre: toutes les modifications de planning (ajout/remplacement/suppression), basées sur l’horodatage d’occurrence.
  - Astuce: les labels des mois apparaissent automatiquement au changement de mois sur la première ligne (lundi).

- KPIs
  - Nombre de modifications totales sur la période observée.
  - “Jour‑même”: nombre de modifications effectuées le jour même du créneau.
  - Top projets concernés: les projets ayant le plus de modifications.

- Liste chronologique
  - Modifications sur 30 jours (ou période affichée), avec date/heure d’occurrence, jour/heure ciblé, action, “avant / après”.
  - Badge “Jour‑même” quand la modification est effectuée le même jour que le créneau.

- Détail
  - “Avant” = projet initial (s’il existait), “Après” = projet résultant (le cas échéant).
  - La liste est triée de la plus récente à la plus ancienne.


11) Administration (Hub)

- Accès: “Admin (hub)” (/admin).
- Profils salariés (/admin/employees)
  - Créer/modifier/supprimer des profils (id = UUID Supabase).
  - Rôle: admin/manager/user, Équipe (conception, créa, dev, …).
- Clients (/admin/clients)
  - Créer/modifier/supprimer des clients (code, nom).
- Projets (/admin/projects)
  - Création: code auto (CLIENT‑YYYY‑NNN), statut (actif, pause, archivé), client, barème, montant, échéance, effort (jours).
  - Affectations: associer des salariés aux projets (affiche le nom complet); pas de champ “rôle” dans l’UI d’affectation.
  - Finaliser (pause) un projet: met en pause et supprime les créneaux futurs (historique conservé).
- Barèmes (tarifs) (/admin/tariffs)
  - Définir les tarifs HT par profil (conception/crea/dev).
- Coûts internes (/admin/internal-costs)
  - Définir les coûts internes journaliers par profil; la dernière entrée (par date d’effet) est utilisée pour les calculs.
- Références (/admin/references)
  - Ajouts simples de référentiels (ex: catégories). Stockage local pour l’instant (POC).
- LLM (OpenAI) (/admin/llm)
  - Enregistrer la clé OpenAI (stockée côté serveur) pour reformuler/prioriser le bandeau d’alertes.
- Bandeau (paramètres) (/admin/ticker)
  - Activer des modules, ville météo / position, message personnalisé, rafraîchir le bandeau.
- Debug (/debug)
  - Informations de session (réservé aux profils admin via le menu).


12) Astuces & bonnes pratiques

- Drag & drop fluide
  - Étirez verticalement dans la même colonne pour créer plusieurs créneaux d’un coup.
  - Démarrez sur une case vide pour “insérer” (ne remplace pas).
  - Démarrez sur une case occupée pour “remplacer”.
- Suppression rapide
  - Glissez un créneau hors de la grille et relâchez.
- Conflits et visibilité
  - Activez la météo et votre position depuis le module Bandeau; les alertes nécessitent d’être connecté.
- Affectations
  - Si un projet n’apparaît pas dans votre bandeau de planification, vérifiez qu’il vous est bien affecté (Admin → Projets → Affecter).
- Validation quotidienne
  - Validez en fin de journée: vos heures réelles sont copiées depuis le planning du jour.


13) Dépannage (FAQ)

- La météo ne s’affiche pas
  - Vérifiez dans “Bandeau (paramètres)” que “Météo” est activé, qu’une ville est saisie ou qu’“Utiliser ma position” est activé et autorisé par le navigateur.
  - Si le problème persiste, recharger la page. Si un message d’erreur est visible (ex: CORS/clé manquante), prévenez l’admin pour vérifier la clé serveur WEATHERAPI.
- Je ne vois pas mes projets dans le bandeau de planification
  - Ils doivent vous être affectés (Admin → Projets → Affecter). Le projet doit être “actif”.
- Je ne peux pas valider la journée
  - Assurez‑vous d’avoir une session active (reconnectez‑vous si besoin). Essayez depuis /day ou /today.
- Les liens du message personnalisé ne sont pas cliquables
  - Utilisez des URLs complètes commençant par “https://”. Elles seront rendues cliquables automatiquement.
- Conflits avec Google Agenda
  - Le badge “Gcal • n” indique des évènements sur ce créneau; un motif rouge signale un conflit avec votre planification.


14) Sécurité & rôles (POC)

- Authentification: Supabase Auth (e‑mail/mot de passe).
- Données: Postgres avec RLS (Row Level Security).
- Sélecteur de rôle en en‑tête
  - Sert à piloter l’affichage par défaut des vues (UI), ce n’est pas un système d’autorisation fine (POC).
- Sessions orphelines
  - Déconnectées automatiquement côté client pour éviter les incohérences.


15) Contact et support

- En cas de blocage, capturez l’écran et le message d’erreur (si présent) et communiquez:
  - L’URL de la page,
  - Les actions effectuées,
  - L’heure approximative.
- Pour tout besoin d’évolution (nouveau tableau, champs supplémentaires, workflows), priorisez via le Product Owner.

Bon usage de DoWee !