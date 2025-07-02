
# 📘 Dokumentation: Microsoft Teams Bot auf Railway

## 1. Zweck dieser Dokumentation

Diese Dokumentation beschreibt die Funktionsweise, Architektur, Einrichtung und Wartung eines auf Railway gehosteten Microsoft Teams Bots, der über Adaptive Cards mit Benutzern interagiert.
Sie richtet sich an technische Personen mit grundlegenden Kenntnissen in Node.js/JavaScript, jedoch ohne Erfahrung mit dem Microsoft Bot Framework, Azure oder Teams-Bots.

---

## 2. Systemüberblick

### Funktionalität

* Der Bot sendet Adaptive Cards an Benutzer in Microsoft Teams.
* Nutzer können über Buttons (z. B. „Online“ / „Offline“) ihren Status setzen.
* Der Bot verarbeitet diese Eingaben und speichert den Status im RAM.
* Ein täglicher Cleanup entfernt abgelaufene Nachrichten und setzt Nutzer automatisch auf „Offline“.
* Es erfolgt **keine** Verwendung persistenter Datenbanken.

### Kommunikationsfluss

```
[Teams Client]
   ⇅
[Microsoft Bot Framework (Azure)]
   ⇅ HTTPS (authentifiziert)
[Bot-Server auf Railway]
```

---

## 3. Microsoft Bot Framework (Azure)

Microsoft Teams kommuniziert **nicht direkt** mit dem Bot, sondern über das Azure Bot Framework, das folgende Aufgaben übernimmt:

* Validierung der Identität und Signatur jeder eingehenden Nachricht (JWT-Token)
* Weiterleitung eingehender Nachrichten an den konfigurierten Bot-Endpunkt (z. B. Railway)
* Rückleitung von Antworten zurück an Teams

Zur Nutzung ist eine Bot-Registrierung in Microsoft Azure erforderlich. Dabei werden folgende Parameter erzeugt:

* `MicrosoftAppId`
* `MicrosoftAppPassword`

Diese Werte werden als Umgebungsvariablen im Deployment benötigt.

---

## 4. Hosting-Umgebung: Railway

Railway ist eine cloudbasierte Hosting-Plattform für Webanwendungen (z. B. Node.js). Sie eignet sich für Bots mit geringer Speichernutzung.

### Vorteile

* Automatisches Deployment aus GitHub-Repositories
* Öffentliche HTTPS-Endpunkte
* Sleep/Wake-Modell zur Ressourcenschonung
* `.env`-Unterstützung für Konfiguration

### Einschränkungen

* Bei Inaktivität wird der RAM geleert ("Sleep") → alle gespeicherten Daten gehen verloren.
* Daher wird ausschließlich speicherbasierte Zwischenspeicherung verwendet, ohne externe Datenbank.

---

## 5. Projektstruktur (Dateien und Verantwortlichkeiten)

```text
src/
├── index.js                     # Einstiegspunkt, verarbeitet eingehende Nachrichten
├── StatusCleanupService.js      # Speichermanagement, automatische Löschung
├── adaptiveCards/
│   └── StatusCommand.json       # Adaptive Card mit Nutzerstatus-Aktionen
```

---

## 6. Hauptfunktionen

### 6.1 index.js

* Initialisiert den `BotFrameworkAdapter`
* Registriert Card-Aktionen (z. B. action: `setOnline`)
* Verwaltet `onlineStatusMap` (Benutzerstatus im RAM)
* Delegiert Nachrichten- und Speicherverwaltung an `StatusCleanupService`

### 6.2 StatusCleanupService.js

* Verwaltet `Map<conversationId, { reference, messageIds, mainCardId, ... }>`
* Verfolgt Nachrichten nach Ablaufzeit (`expireAfterMs`)
* Löscht veraltete Nachrichten oder Conversations nach Inaktivität (z. B. 48 Stunden)
* Unterstützt kanalabhängige Operationen (z. B. Löschen nur in `msteams`)

---

## 7. Adaptive Cards

Adaptive Cards sind strukturierte JSON-Definitionen, die Microsoft Teams in interaktive UI-Komponenten rendert (z. B. Buttons).

Beispiel: Button „Online“ in einer Adaptive Card

```json
{
  "type": "Action.Submit",
  "title": "Online",
  "data": {
    "action": "setOnline"
  }
}
```

Bei Klick sendet Microsoft eine entsprechende `action.data`-Payload über das Bot Framework an den konfigurierten Bot-Endpunkt.

---

## 8. Authentifizierung

Jede eingehende Nachricht an den Bot enthält ein signiertes JWT-Token.
Der Adapter (`BotFrameworkAdapter`) validiert das Token gegen:

* `MicrosoftAppId`
* `MicrosoftAppPassword`

Nur bei erfolgreicher Validierung erfolgt die Verarbeitung.
Ungültige oder nicht autorisierte Anfragen (z. B. aus dem Emulator ohne Token) werden mit `401 Unauthorized` abgelehnt.

---

## 9. Einrichtung (Deployment auf Railway)

### Voraussetzungen

* Microsoft Azure App-Registrierung (Bot Channel)
* GitHub-Repository mit Bot-Code
* Railway-Account

### Schritte

1. GitHub-Repository in Railway importieren
2. Startbefehl setzen:

   ```bash
   node ./src/index.js
   ```
3. Umgebungsvariablen eintragen:

   ```env
   MicrosoftAppId=...
   MicrosoftAppPassword=...
   ```
4. In Azure den Messaging Endpoint setzen:

   ```text
   https://your-bot.up.railway.app/api/messages
   ```

---

## 10. Fehlerquellen & Diagnose

| Fehlerbild                     | Ursache / Lösung                                         |
| ------------------------------ | -------------------------------------------------------- |
| `401 Unauthorized` im Emulator | Emulator sendet kein Token – Verarbeitung wird blockiert |
| Nachricht wurde nicht gelöscht | Kanal unterstützt keine Löschung (z. B. Emulator)        |
| Speicherverbrauch steigt       | Möglicherweise kein Cleanup oder zu viele Duplikate      |
| Adaptive Card reagiert nicht   | Fehlerhafte `action.data` oder fehlende Registrierung    |

---

## 11. Laufzeitverhalten & Speicherstrategie

* Aktive Benutzer- und Nachrichteninformationen werden im RAM gespeichert.
* Nachrichten haben definierte Ablaufzeiten (z. B. 10 Minuten).
* Conversations werden nach Inaktivität gelöscht (z. B. 48 h).
* Ziel: RAM stabil unter 100 MB.
* Keine Datenbankanbindung erforderlich.

---

## 12. Erweiterungsmöglichkeiten

| Erweiterung                        | Nutzen                                     |
| ---------------------------------- | ------------------------------------------ |
| Neue Statusoptionen                | Mehr Flexibilität für Benutzer             |
| Persistente Speicherung (z. B. DB) | Datenhaltung auch nach Sleep               |
| Nutzergruppen-Logik                | Segmentierung nach Benutzergruppen         |
| Admin-Kontrollkarten               | Steuerung durch autorisierte Benutzer      |
| Logging & Metriken                 | Einblick in Nutzung, Fehlerquellen, Trends |

---

## 13. Wartung und Kontrolle

Regelmäßig prüfen:

* Funktioniert der tägliche Cleanup zuverlässig?
* Bleibt der RAM-Verbrauch stabil?
* Werden Adaptive Cards korrekt aktualisiert?
* Kommen Aktionen korrekt im Bot an?
* Ist die App bei Azure aktiv und gültig?
