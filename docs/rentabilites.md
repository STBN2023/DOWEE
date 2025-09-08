Voici un workflow opérationnel, avec codes couleur, pour piloter planning et rentabilité par client et par projet.

## 1) Données d’entrée

* **Client**: segment (Super rentable | Normal | Pas rentable), **Star** oui/non, récence + fréquence, TJM cible, coefficient d’efficacité client *K* (médiane des écarts historiques).
* **Projet**: effort prévu (jours), échéance, prix vendu, coût prévu = TJM × effort × *K*, **marge %** = (prix − coût) / prix.
* **Contrainte**: capacité équipe par semaine, SLA par segment.

## 2) Segments et codes couleur

**Client (badge segment)**

* Super rentable → **Vert #2E7D32**
* Normal → **Bleu gris #546E7A**
* Pas rentable → **Rouge #C62828**
* **Star** = surcouche icône ★ **Or #F9A825** (garde la couleur de segment)

**Projet (badge marge %)**

* ≥ 40% → **Vert #2E7D32**
* 20–39% → **Jaune #F9A825**
* 1–19% → **Orange #EF6C00**
* ≤ 0% → **Rouge #C62828**

**Urgence (badge buffer)**

* Buffer ≥ 3× l’effort → **Gris #90A4AE**
* 1–3× → **Bleu #1976D2**
* 0–1× → **Violet #6A1B9A**
* En retard → **Noir #000000**

Astuce accessibilité: répéter l’info par formes (▲ critique, ● normal, ■ confortable).

## 3) Score de priorité (0–100)

Variables:

* **S\_client**: Super rentable=80, Normal=50, Pas rentable=20.
* **S\_star**: multiplicateur 1,15 si Star.
* **S\_marge**: 100 si marge ≥40; 60–98 si 20–39 (60 + 2×(marge−20)); 22–58 si 1–19 (20 + 2×(marge−1)); 0 si ≤0.
* **S\_urgence** via ratio buffer *B* = (jours avant échéance) / (effort restant):

  * B≥3→20, 1≤B<3→60, 0\<B<1→90, B≤0→100.
* **S\_récurrence**: 0–100 (échelle linéaire sur 12 mois).
* **S\_strat**: 0 / 50 / 100 (décision business).

Formule:

```
Score = (0,25*S_client + 0,35*S_marge + 0,20*S_urgence + 0,10*S_récurrence + 0,10*S_strat) × (S_star ? 1,15 : 1)
Score = min(100, Score)
```

## 4) Règles de planning

* **Score ≥ 80**: planifier immédiatement. Autoriser +10% de capacité. SLA agressif.
* **60–79**: mettre en haut du sprint en cours. Revue quotidienne.
* **40–59**: planifier si capacité ET marge ≥10%. Sinon renégocier scope/prix.
* **< 40**: stop et revue Go/No-Go.
  Exceptions:

  * **Star**: seuils −10 pts.
  * **Pas rentable & marge ≤10%**: No-Go par défaut sauf validation direction.

Garde-fous:

* **Stop‑loss**: si consommation > budget +10% **et** marge prévisionnelle <15% → pause, re-chiffrage obligatoire.
* **Plafond non‑rentable**: max 10% du temps mensuel sur projets marge ≤10% (hors Star validés).

## 5) Workflow pas à pas

1. **Intake**: qualifier segment client, Star, SLA, *K* historique.
2. **Estimation**: effort, prix, coût = TJM × effort × *K*, marge %.
3. **Scoring**: calculer Score, attribuer badges couleur.
4. **Planification**: placer en calendrier/Gantt selon Score et capacité.
5. **Suivi**: MAJ effort restant, buffer, marge courante. Alertes si seuils.
6. **Clôture**: calculer *K* réel, marge finale, mettre à jour profil client.

## 6) Vues UI minimales

* **Portfolio**: tableau clients × projets, cellules colorées par marge, bordure par segment, pastille d’urgence.
* **Kanban**: colonnes statut. Chaque carte affiche: ★ Star, segment, marge%, urgence, Score.
* **Calendrier/Gantt**: barres colorées par marge, contour par segment, chevron noir si en retard.
* **Alertes**: file des items en stop‑loss, retards, dépassements de capacité.

## 7) SLA par segment (exemple)

* Star: prise en charge < 24h, démarrage < 2 j, com hebdo.
* Super rentable: < 48h, démarrage < 5 j.
* Normal: < 72h.
* Pas rentable: selon capacité, regrouper en créneaux dédiés.

## 8) Exemple de carte projet

`[★][Client: Super rentable | Vert] [Marge: 32% | Jaune] [Urgence: B=0,8 | Violet] [Score: 82]  –  Échéance: 2025‑09‑22 – Effort: 12 j – Chef: A.B.`

## 9) Implémentation rapide (seuils)

```json
{
  "colors": {
    "client": {"super":"#2E7D32","normal":"#546E7A","pas":"#C62828","star":"#F9A825"},
    "margin": {"high":"#2E7D32","mid":"#F9A825","low":"#EF6C00","neg":"#C62828"},
    "urgency": {"comfort":"#90A4AE","tight":"#1976D2","risk":"#6A1B9A","late":"#000000"}
  },
  "thresholds": {"score":{"now":80,"soon":60,"if_capacity":40}, "stoploss":{"overrun_pct":10,"min_margin_pct":15}}
}
```

Tu peux partir de ça et ajuster les coefficients aux réalités de tes coûts et capacités.
