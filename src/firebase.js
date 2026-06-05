import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// ─────────────────────────────────────────────────────────────────
// ⚠️  INCOLLA QUI LA TUA CONFIGURAZIONE FIREBASE
//     Vedi README.md per le istruzioni passo-passo
// ─────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "INCOLLA_QUI",
  authDomain:        "INCOLLA_QUI",
  databaseURL:       "INCOLLA_QUI",   // es. https://xxx-default-rtdb.europe-west1.firebasedatabase.app
  projectId:         "INCOLLA_QUI",
  storageBucket:     "INCOLLA_QUI",
  messagingSenderId: "INCOLLA_QUI",
  appId:             "INCOLLA_QUI",
}
// ─────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
