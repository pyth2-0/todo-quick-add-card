# Todo Quick Add Card

Eine Lovelace-Karte für Home Assistant: einzeilige Eingabe-Pille mit Senden-Button und darunter eine aufklappbare Liste für **jede** Todo-Entität (Mealie, Einkaufsliste, Local To-do, …).

*A Lovelace card for Home Assistant: a single-line input pill with a send button and a collapsible list for any `todo.*` entity.*

- Neue Einträge erscheinen **sofort** (optimistisch) und werden danach mit der Integration abgeglichen
- Eingabetaste oder Button sendet; die Tastatur bleibt offen
- Liste standardmäßig nur lesbar (kein Abhaken) – optional mit `allow_check: true`
- Eigenes Styling, kein `card_mod` nötig; Akzentfarbe einstellbar
- Auf-/Zugeklappt-Zustand wird pro Gerät gemerkt

## Installation (HACS)

1. HACS → ⋮ → *Benutzerdefinierte Repositories* → URL dieses Repos, Kategorie **Dashboard** (Plugin)
2. *Todo Quick Add Card* installieren, Dashboard neu laden

## Beispiel

```yaml
type: custom:todo-quick-add-card
entity: todo.einkaufsliste
title: Wochenendeinkauf
```

## Optionen

| Option | Standard | Beschreibung |
|---|---|---|
| `entity` | – (Pflicht) | `todo.*`-Entität |
| `title` | `Liste` | Titel der Aufklapp-Zeile |
| `placeholder` | `Artikel hinzufügen …` | Platzhalter im Feld |
| `icon` | `mdi:cart-plus` | Icon links im Feld |
| `send_icon` | `mdi:send` | Icon im Senden-Button |
| `collapsible` | `true` | Liste auf-/zuklappbar |
| `start_open` | `false` | Anfangszustand, solange nichts gemerkt ist |
| `allow_check` | `false` | Einträge abhakbar |
| `show_completed` | `false` | Erledigte Einträge anzeigen |
| `max_items` | `0` | Maximale Anzahl angezeigter Einträge (0 = alle) |
| `accent` | `#F0B445` | Akzentfarbe (CSS-Farbe) |
| `show_input` | `true` | Eingabepille anzeigen (`false` = nur Liste) |
| `show_header` | `true` | Titelzeile auch ohne Aufklappen anzeigen |
| `show_description` | `false` | Beschreibung unter dem Eintrag (2 Zeilen) |
| `background`, `border_color`, `text_color`, `muted_color`, `radius` | Theme | Farben und Rundung überschreiben |

Die Karte nutzt die Theme-Variablen `--ha-card-background`, `--divider-color`, `--primary-text-color` und `--secondary-text-color`.

## Lizenz

MIT
