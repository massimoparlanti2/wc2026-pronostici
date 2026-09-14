# ⚽ FIFA World Cup 2026 — Pronostici

A real-time prediction platform for the **2026 FIFA World Cup**, built to let a group of users predict the tournament and compete through a shared live leaderboard.

Users can submit their predictions for the entire tournament, while an administrator can update the real results. Scores are then recalculated automatically and synchronized in real time across all connected devices.

The project combines a **React frontend**, **Firebase Realtime Database**, **GitHub Actions** and an external football API to create a fully automated prediction platform.

---

## ✨ Features

### 📝 Tournament Predictions

Participants can create their own prediction and forecast the outcome of the entire World Cup.

Predictions cover:

* Group-stage qualifiers
* Round of 32
* Round of 16
* Quarter-finals
* Semi-finals
* Third-place match
* World Cup winner

The application is designed around the new **48-team World Cup format**.

---

### 🏆 Live Leaderboard

All participants compete in a shared ranking.

The leaderboard updates automatically whenever new real results are entered.

Each participant can see:

* Current position
* Total points
* Progress throughout the tournament
* Points earned for different prediction categories

Because the leaderboard is synchronized through Firebase, changes are immediately visible to every connected user.

---

### 🎯 Scoring System

Points are awarded according to the stage of the tournament:

| Prediction              | Points |
| ----------------------- | -----: |
| 1st place in group × 12 |      3 |
| 2nd place in group × 12 |      2 |
| 3rd qualified team × 8  |      2 |
| Round of 32 × 16        |      5 |
| Round of 16 × 8         |      8 |
| Quarter-finals × 4      |     11 |
| Semi-finals × 2         |     14 |
| Third-place match       |      6 |
| World Cup winner        |     20 |

The maximum theoretical score is **312 points**.

The scoring system is implemented directly in the application logic so that scores can be recalculated consistently whenever results change.

---

## 👥 Participant Management

New participants can join directly from the application.

The workflow is intentionally simple:

```text
Join
 ↓
Enter name
 ↓
Submit predictions
 ↓
Predictions stored in Firebase
 ↓
Follow live ranking
```

The application is therefore suitable for private prediction competitions among friends, university groups or other communities.

---

## ⚙️ Admin Panel

An administrator has access to additional functionality for managing the competition.

The admin panel allows the administrator to:

* Enter real match results
* Update tournament results
* Trigger score recalculation
* Manage the competition state

Once a result is stored, the updated ranking becomes available to all participants.

---

## 🤖 Automatic Result Updates

One of the main features of the project is the optional automatic result-update pipeline.

Instead of manually entering every result, **GitHub Actions** periodically executes:

```text
GitHub Actions
      ↓
football-data.org API
      ↓
Retrieve World Cup results
      ↓
Transform API response
      ↓
Update Firebase
      ↓
Leaderboard updates
```

The workflow runs approximately every **15 minutes** during the tournament.

This allows the application to continue updating even when the administrator is not actively using it.

The automated workflow uses:

* `football-data.org`
* GitHub Actions
* Firebase Realtime Database
* Repository secrets

The project stops the scheduled checks after the tournament to avoid unnecessary API requests.

---

## 🏗️ Architecture

The application follows a client + cloud backend architecture.

```text
                     ┌─────────────────────┐
                     │     React / Vite     │
                     │      Frontend       │
                     └──────────┬──────────┘
                                │
                                ▼
                     ┌─────────────────────┐
                     │ Firebase Realtime   │
                     │      Database       │
                     └──────────┬──────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
        Participants                    Admin / Results
                                                │
                                                ▼
                                      ┌─────────────────┐
                                      │ GitHub Actions  │
                                      └────────┬────────┘
                                               │
                                               ▼
                                      football-data.org
```

This architecture separates:

* **User interface** → React
* **Persistent application state** → Firebase
* **Automated jobs** → GitHub Actions
* **External football data** → football-data.org

---

## 🛠️ Tech Stack

### Frontend

* **React**
* **JavaScript / JSX**
* **Vite**
* **CSS**

### Backend / Data

* **Firebase Realtime Database**

Firebase provides persistent storage and real-time synchronization between users.

### Automation

* **GitHub Actions**
* **Node.js**

GitHub Actions is used to periodically retrieve official match data and update the database automatically.

### External API

* **football-data.org**

The API provides tournament results used by the automated result-update workflow.

---

## 📁 Project Structure

```text
wc2026-pronostici/
│
├── .github/
│   └── workflows/
│       ├── deploy.yml
│       └── update-results.yml
│
├── src/
│   ├── App.jsx
│   ├── firebase.js
│   └── main.jsx
│
├── scripts/
│   └── update-results.mjs
│
├── dist/
│
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

### `src/App.jsx`

Contains the main application logic and user interface.

### `src/firebase.js`

Initializes the Firebase connection used by the application.

### `scripts/update-results.mjs`

Retrieves updated tournament data from the external football API, transforms it into the format required by the application and writes the results to Firebase.

### `.github/workflows/`

Contains the GitHub Actions workflows responsible for:

* Building and deploying the application
* Updating tournament results automatically

---

## 🚀 Getting Started

### Requirements

* Node.js
* npm
* Firebase project
* Firebase Realtime Database

---

### 1. Clone the repository

```bash
git clone https://github.com/massimoparlanti2/wc2026-pronostici.git
cd wc2026-pronostici
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Firebase

Create a Firebase project and enable **Realtime Database**.

Then configure the Firebase credentials used by the application.

The configuration should be kept outside the repository whenever possible.

---

### 4. Start the development server

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:5173
```

---

### 5. Build for production

```bash
npm run build
```

---

## 🌐 Deployment

The application is designed to be deployed using **GitHub Pages**.

The repository includes a GitHub Actions workflow that automatically builds and deploys the application.

The deployment process is:

```text
Push to GitHub
      ↓
GitHub Actions
      ↓
npm build
      ↓
Deploy
      ↓
GitHub Pages
```

This eliminates the need to manually build and upload the application after every change.

---

## 🔐 Secrets & Security

The automated result-update workflow requires credentials that should **never be committed to the repository**.

The following values are configured as GitHub Actions secrets:

```text
FOOTBALL_API_KEY
FIREBASE_DATABASE_URL
FIREBASE_SERVICE_ACCOUNT
```

The service account credentials provide the workflow with permission to update the Firebase database.

Keeping these values in GitHub Secrets prevents sensitive credentials from being exposed in the source code.

> Firebase Web API keys are not equivalent to private server credentials, but Firebase Database Rules must still be configured appropriately. The service account JSON must always remain secret.

---

## 🔄 Data Flow

The automatic result pipeline follows this process:

```text
1. GitHub Actions starts
          ↓
2. Call football-data.org API
          ↓
3. Retrieve latest World Cup results
          ↓
4. Parse tournament data
          ↓
5. Convert API data to application format
          ↓
6. Write results to Firebase
          ↓
7. React clients receive updated data
          ↓
8. Scores and leaderboard are refreshed
```

This allows the frontend to remain relatively simple while the scheduled workflow handles external data synchronization.

---

## 📊 Why This Project?

The project was built to solve a practical problem:

> **Create a prediction competition that requires almost no manual administration once the tournament begins.**

Instead of maintaining predictions in spreadsheets or manually calculating scores, the application centralizes:

* Predictions
* Tournament results
* Scoring
* Rankings
* Data synchronization

The project therefore combines a real-world use case with several software engineering concepts:

* Frontend development
* Cloud data storage
* Real-time synchronization
* API integration
* Scheduled automation
* CI/CD
* Data transformation

---

## 🔮 Future Improvements

Possible future developments include:

* 📱 Improved mobile-first UI
* 🔔 Push notifications after matches
* 📈 Participant performance charts
* 📊 Prediction accuracy statistics
* 🧮 More advanced scoring systems
* 🕒 Automatic prediction deadlines
* 🔐 Firebase Authentication
* 👤 User accounts
* 🏅 Multiple prediction competitions
* 📅 Historical tournament support
* ⚡ Serverless backend functions
* 🤖 AI-assisted match predictions
* 📊 Probability-based predictions instead of only categorical picks

---

## ⚠️ Disclaimer

This project is a recreational prediction game created for entertainment and experimentation.

Predictions are not guaranteed to be accurate and should not be interpreted as betting advice or as statistically validated forecasts.

---

## 👨‍💻 Author

**Massimo Parlanti**

MSc Artificial Intelligence student at the University of Pisa.

GitHub: [@massimoparlanti2](https://github.com/massimoparlanti2)

---

## 📄 License

This project is currently intended primarily for personal use and experimentation.

No specific open-source license has currently been defined.
