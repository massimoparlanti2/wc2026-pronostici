# ⚽ Mondiali 2026 — Pronostici

App per pronosticare i Mondiali 2026 con classifica live in tempo reale.

---

## 🚀 Setup in 4 passi

### Passo 1 — Crea il progetto Firebase (5 minuti)

1. Vai su **https://console.firebase.google.com**
2. Clicca **"Aggiungi progetto"** → dai un nome (es. `mondiali2026`)
3. Disabilita Google Analytics → **Crea progetto**
4. Nel menu a sinistra clicca **"Realtime Database"** → **"Crea database"**
5. Scegli una regione (es. `europe-west1`) → **Avanti**
6. Seleziona **"Modalità test"** → **Attiva**
   *(Questo permette a tutti di leggere/scrivere, perfetto per uso tra amici)*

### Passo 2 — Copia la configurazione Firebase

1. Nella console Firebase, clicca l'**icona ⚙️** in alto a sinistra → **Impostazioni progetto**
2. Scorri fino a **"Le tue app"** → clicca **"</>"** (Web)
3. Dai un nome all'app → **Registra app**
4. Copia l'oggetto `firebaseConfig` che appare

### Passo 3 — Incolla la config nel progetto

Apri il file **`src/firebase.js`** e incolla i tuoi valori:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "mondiali2026.firebaseapp.com",
  databaseURL:       "https://mondiali2026-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "mondiali2026",
  storageBucket:     "mondiali2026.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
}
```

⚠️ **Importante:** il campo `databaseURL` è quello del Realtime Database, NON del Firestore.
Lo trovi in Firebase Console → Realtime Database → copia l'URL in cima alla pagina.

### Passo 4 — Deploy su GitHub Pages

1. Crea un nuovo repository su GitHub (es. `wc2026-pronostici`)
2. In **`vite.config.js`**, cambia `base` con il nome del tuo repo:
   ```js
   base: '/wc2026-pronostici/',  // ← il tuo nome repo
   ```
3. Carica tutti i file su GitHub:
   ```bash
   git init
   git add .
   git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/TUO_USERNAME/wc2026-pronostici.git
   git push -u origin main
   ```
4. Su GitHub → **Settings** → **Pages** → Source: **GitHub Actions**
5. Il deploy parte automaticamente! Dopo ~2 minuti il sito è online.

---

## 📱 Come usarlo

### Per i tuoi amici
1. Condividi il link GitHub Pages (es. `https://tuousername.github.io/wc2026-pronostici/`)
2. Ognuno clicca **"Aggiungi partecipante"**, inserisce il suo nome
3. Fa le predizioni e clicca **"Salva"**
4. Tutti vedono la **Classifica Live** in tempo reale

### Per te (admin)
- Clicca **⚙️** nella home per accedere al pannello risultati
- Inserisci i risultati reali man mano che avanzano i Mondiali
- I punteggi di tutti si aggiornano istantaneamente su tutti i dispositivi

---

## 💰 Costi
**Gratis.** Firebase Realtime Database ha un piano gratuito che include:
- 1 GB di storage
- 10 GB/mese di trasferimento dati
- Per un gruppo di amici: praticamente illimitato

---

## 🛠 Sviluppo locale

```bash
npm install
npm run dev
```

Apri http://localhost:5173

---

## 📁 Struttura del progetto

```
wc2026-pronostici/
├── src/
│   ├── App.jsx          # Tutta la logica dell'app
│   ├── firebase.js      # ⚠️ Incolla qui la tua config Firebase
│   └── main.jsx         # Entry point React
├── .github/
│   └── workflows/
│       └── deploy.yml   # Deploy automatico su GitHub Pages
├── index.html
├── vite.config.js       # ⚠️ Cambia 'base' con il nome del tuo repo
└── package.json
```

---

## 🎯 Sistema Punti

| Fase | Punti |
|------|-------|
| 1° classificato girone (×12) | 3 pt |
| 2° classificato girone (×12) | 2 pt |
| Terza qualificata (×8) | 2 pt |
| Sedicesimi (×16) | 5 pt |
| Ottavi (×8) | 8 pt |
| Quarti (×4) | 11 pt |
| Semifinale (×2) | 14 pt |
| Campione del Mondo | 20 pt |
| Finalina 3°/4° | 6 pt |
| **Massimo teorico** | **312 pt** |

---

## 🤖 Risultati automatici (opzionale ma consigliato)

Con questa funzione i risultati si aggiornano **circa ogni 15 minuti** senza che nessuno debba inserirli a mano, usando l'API gratuita di **football-data.org**.

Il workflow parte dall'inizio del Mondiale e si ferma dopo il controllo del **20 luglio 2026**, così cattura anche il risultato della finale del 19 luglio sera.

### Passo 1 — Ottieni la chiave API football-data.org

1. Vai su **https://www.football-data.org/client/register**
2. Registrati (è gratis, piano free = 10 richieste/min, più che sufficiente)
3. Ricevi la chiave API per email (es. `abc123def456...`)

### Passo 2 — Crea il Service Account Firebase

Il service account permette allo script GitHub di scrivere su Firebase.

1. Vai su **Firebase Console → Impostazioni progetto → Account di servizio**
2. Clicca **"Genera nuova chiave privata"** → Scarica il file JSON
3. Apri il file JSON e **copia tutto il contenuto**

### Passo 3 — Aggiungi i Secrets su GitHub

Vai su **GitHub → tuo repo → Settings → Secrets and variables → Actions → New repository secret**

Aggiungi questi 3 secret:

| Nome secret | Valore |
|-------------|--------|
| `FOOTBALL_API_KEY` | La chiave API di football-data.org |
| `FIREBASE_DATABASE_URL` | L'URL del tuo Realtime Database (es. `https://xxx-default-rtdb.europe-west1.firebasedatabase.app`) |
| `FIREBASE_SERVICE_ACCOUNT` | **Tutto** il contenuto JSON del file service account (incolla il JSON intero) |

### Come funziona

```
Ogni 15 minuti → GitHub Actions esegue scripts/update-results.mjs
               → Chiama football-data.org/v4/competitions/WC
               → Scarica classifiche gironi + risultati partite
               → Mappa i dati nel formato dell'app
               → Scrive su Firebase /wc2026/results
               → Tutti gli utenti vedono i punteggi aggiornati in tempo reale
```

### Esecuzione manuale

Puoi forzare un aggiornamento immediato su:
**GitHub → Actions → "⚽ Aggiorna Risultati Mondiali" → "Run workflow"**

Se vuoi eseguirlo fuori dalla finestra del Mondiale, attiva l'opzione **force** nel workflow manuale.

### Compatibilità con il pannello ⚙️

Se hai già inserito risultati manualmente nel pannello ⚙️, l'aggiornamento automatico **li sovrascriverà**. Una volta attivato il sistema automatico, il pannello manuale non serve più.
