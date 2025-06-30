
# 📘 Dokumentation: Microsoft Teams Bot auf Railway (mit technischer Erklärung)

## 🔍 Ziel dieses Dokuments

Diese Dokumentation erklärt im Detail:

* wie Microsoft Teams Bots grundsätzlich funktionieren,
* was dein konkreter Bot-Code macht,
* wie der Bot mit Microsoft Teams und Railway kommuniziert,
* warum alles so aufgebaut ist wie es ist (RAM-schonend, zuverlässig, erweiterbar).

---

## 🤖 Wie funktionieren Microsoft Teams Bots?

Ein Microsoft Teams Bot ist ein Programm, das auf **Nachrichten** und **Aktionen in Microsoft Teams** reagiert. Es nutzt das **Microsoft Bot Framework**, das die Kommunikation zwischen dem Teams-Client und deinem Server verwaltet.

### Ablauf – in einfachen Schritten:

1. **Ein Nutzer schreibt dem Bot** (z. B. `/online`) oder klickt auf einen Button in einer Adaptive Card.
2. **Teams sendet diese Nachricht an das Azure Bot Framework**.
3. **Azure Bot Framework ruft deinen Bot auf Railway über HTTPS auf** (`/api/messages`).
4. **Dein Node.js-Bot verarbeitet die Nachricht** und antwortet ggf. wieder über das Framework.
5. Die Antwort wird dem Nutzer in Teams angezeigt.

Teams-Bots arbeiten also nie direkt mit dem Teams-Client, sondern **immer über das Microsoft Bot Framework** als Mittler.

---

## 🚉 Was ist Railway?

Railway ist deine **Hosting-Plattform**. Sie hostet den Code deines Bots und bietet:

* automatische Deployments aus GitHub,
* sofort startbare Node.js-Umgebungen,
* kostenlose Nutzung mit Sleep-Funktion (Server schläft bei Inaktivität),
* begrenzten RAM → effiziente Codegestaltung notwendig.

Du nutzt Railway, um **nicht selbst Azure Functions, einen eigenen Server oder Docker zu betreiben**.

---

## 🛰️ Wie kommunizieren Teams, Azure und Railway?

```
[Teams Client] ⇄ [Azure Bot Framework] ⇄ [Railway Bot Server]
```

### Was passiert genau?

1. Ein Nutzer klickt in Teams auf einen Button (`submit.action`).
2. Microsoft sendet einen HTTP POST an deinen Bot-Endpunkt:

```
https://your-bot.up.railway.app/api/messages
```

3. Railway nimmt die Anfrage entgegen, startet bei Bedarf den Server (Wake).
4. Der Bot-Adapter (`BotFrameworkAdapter`) verarbeitet die Nachricht.
5. Dein Bot-Code entscheidet anhand des Inhalts, was passieren soll:

   * `/online` → Liste der Online-Nutzer anzeigen
   * Button „🟢 Online“ → Nutzerstatus in Map aktualisieren
6. Der Bot sendet eine Antwort (z. B. Adaptive Card) über Azure zurück an den Benutzer in Teams.

### Warum funktioniert das nur mit Azure?

Azure validiert jedes Token, prüft Identität und schützt deinen Bot-Endpunkt vor Missbrauch.
Ohne gültiges Token (wie im Bot Emulator) bekommt man HTTP 401 (Unauthorized).

---

## ⚙️ Wie funktioniert der Code deines Bots?

### Projektstruktur

```
src/
├── index.js                 # Hauptlogik
├── StatusCleanupService.js  # Verwaltung & automatische Löschung
├── cards/mainCard.js        # Adaptive Card mit Buttons
├── commandHandlers/         # Slash-Commands wie /online
├── utils/                   # Logging & Tools
.env.production              # Railway-Konfiguration
```

---

### 🧠 `index.js` – der Einstiegspunkt

Was passiert hier?

* Initialisiert Bot Framework Adapter (für Kommunikation mit Teams)
* Lädt Umgebungsvariablen (.env.production)
* Registriert Commands wie `/online`
* Reagiert auf Button-Klicks aus Adaptive Cards
* Speichert `onlineStatusMap` (Map von Nutzer-ID zu Status)
* Sorgt dafür, dass jede Konversation getrackt wird
* Startet den `StatusCleanupService`

---

### 🧠 `StatusCleanupService.js` – dein RAM-Manager

Warum wichtig?
→ Railway löscht alle RAM-Daten beim „Sleep“. Dieser Service sorgt dafür, dass der RAM **möglichst wenig** beansprucht und regelmäßig **alte Daten gelöscht** werden.

Funktionen:

* Speichert Nachrichten (mit Tags wie "mainCard" oder "statusCard")
* Löscht Nachrichten nach Ablauf (z. B. 10 Minuten)
* Entfernt Inaktive Conversations nach 48h
* Setzt Nutzer automatisch auf "offline" (z. B. nachts)
* Löscht Nachrichten, die zu alt oder nicht mehr relevant sind

### Warum das so ist:

Speicherverbrauch soll dauerhaft unter 100 MB bleiben, auch bei vielen Nutzern. Ohne Cleanup würde der RAM wachsen und Railway könnte die App abschalten.

---

### 🧠 `mainCard.js` – Adaptive Card mit Buttons

Diese Datei liefert den JSON-Code für eine Karte mit:

* Statusanzeige
* Button „🟢 Online“ → Setzt Nutzer auf online
* Button „🔴 Offline“ → Setzt auf offline
* Button „👥 Wer ist online?“ → Zeigt Online-Liste

Die `mainCardId` wird gespeichert, um spätere Löschung oder Updates zu ermöglichen.

---

## 💾 Speicherstrategie

Warum kein Datenbank?

* Railway-Server verliert alle Daten beim Sleep → DB wäre aufwendig
* Ziel: **leichtgewichtiger, zustandsloser Bot**, der sich bei jedem Start neu aufbauen kann

### Strategie:

* Alle Status in `onlineStatusMap` (im RAM)
* Nachrichten in `StatusCleanupService`
* Kein Persistenz-Zwang → einfache Architektur
* Geringer RAM:

  * 1 Nutzer ≈ 60–65 MB
  * 5 Nutzer ≈ 75–85 MB

---

## 🔐 Authentifizierung

Jede Nachricht aus Microsoft Teams enthält ein **JWT-Token**.

→ Das wird im Bot-Adapter geprüft gegen:

* `MicrosoftAppId`
* `MicrosoftAppPassword`

Nur wenn das Token gültig ist, wird `context` verarbeitet.
So ist dein Bot **geschützt vor externen Zugriffen**.

---

## 🧩 Gesamtprozess in Klartext:

1. Nutzer öffnet Bot in Microsoft Teams
2. Adaptive Card mit Buttons erscheint
3. Nutzer klickt auf „🟢 Online“
4. Microsoft sendet Anfrage an Azure Bot Framework
5. Azure leitet weiter an deinen Bot auf Railway
6. Bot aktualisiert `onlineStatusMap`, sendet neue Karte
7. Antwort wird dem Nutzer über Azure zurück in Teams angezeigt
8. RAM wird regelmäßig bereinigt → Speicherverbrauch bleibt stabil
9. Railway schickt Bot in Sleep → keine Nutzer? kein RAM!
10. Neue Nachricht? → Railway weckt Bot automatisch auf

---

## ✅ Fazit

* Microsoft Teams Bots kommunizieren **immer über das Bot Framework**
* Dein Bot-Code auf Railway verarbeitet alle Nachrichten effizient
* Adaptive Cards bieten interaktive Benutzerführung
* Der `StatusCleanupService` hält den RAM dauerhaft niedrig
* Keine Datenbank notwendig – alles im RAM
* Railway übernimmt Hosting, Sleep, Wake, Logging – kein eigener Server nötig
* Architektur ist robust, ressourcenschonend und skalierbar
