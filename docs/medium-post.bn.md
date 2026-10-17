# আমার কয়েকটা Claude Code project, কয়েকটা terminal: গোলমাল থামাতে একটা dashboard বানালাম

**Subtitle:** কোন project এ কোন session চলছে, কোন port এ কোন server, requirement কতদূর: সব এক পাতায়।

![overview screenshot](screenshot.png)

![demo GIF: projects, fixed ports, plugin switch](docs/media/demo.gif)

## সমস্যাটা কী ছিল

Claude Code দিয়ে একসাথে কয়েকটা project এ কাজ করলে কয়েকটা জিনিস হারিয়ে যায়:

- কোন project এ কোন session শেষ কবে চলেছে?
- Laravel, FastAPI আর npm dev: সবাই একই port চায়, কে কোনটা ধরে আছে?
- Requirement এর status Google Sheet এ, কোড VS Code এ, আর plugin গুলো কোথায় on/off, মনে থাকে না।

প্রতিবার terminal ঘেঁটে খুঁজতে হতো। তাই নিজের জন্য একটা local dashboard বানালাম: **nin-claude-dashboard**।

## এটা কী দেয়

- **Projects page:** `~/.claude/projects` থেকে প্রতি project এর Claude Code session, আর কোনটা এখন active।
- **Requirement status:** প্রতি project এর নিজের Google Sheet থেকে পড়ে দেখায়।
- **Fixed port এ server:** Laravel, Django, FastAPI, npm `dev`/`start`। port লিখে Enter চাপলে সেটা সেভ হয়, Start/Stop বাটনে চালানো যায়। port অন্য কেউ ধরে থাকলে start আটকে দেয় আর বলে দেয় কে ধরে আছে।
- **Plugin switch:** প্রতি project এ আলাদা করে Claude plugin on/off। শুধু ওই project এর `settings.local.json` বদলায়, কিছু uninstall হয় না।
- **Open in VS Code:** card এর বাটনে চাপলেই সেই project খুলে যায়।
- **LAN access (ঐচ্ছিক):** token দিয়ে একই Wi-Fi এর ফোন থেকেও দেখা যায়।

## Requirement আসে কোথা থেকে: nin-plugin

Dashboard এ যে requirement status দেখা যায়, সেটা আসে আমার আরেকটা Claude Code plugin **nin-plugin** থেকে। এর `requirement-to-spec` skill একটা requirement কে instruction আর spec ফাইলে ভাঙে এবং `docs/specs/MAP.md` লেখে। `prd-to-requirements` Google Sheet এ requirement তোলে আর Sheet এর URL রাখে `docs/specs/prd-tracking-sheet.txt` এ। Dashboard শুধু ওই দুটো ফাইল পড়ে।

নিজে চেষ্টা করতে:

```
/plugin marketplace add Nazmul-Islam-Naim/nin-plugin
/plugin install nin-plugin@nin-plugin
/reload-plugins
```

nin-plugin ছাড়াও dashboard চলে: তখন Sessions, Servers আর Plugins অংশ কাজ করে, শুধু requirement progress ফাঁকা থাকে। চাইলে নিজের হাতে `MAP.md` লিখেও দেওয়া যায়।

## ব্যবহার করবেন যেভাবে

**১. Build ও install**

```
cd web && npm install && npm run build
cd ../server && npm install
```

**২. Google Sheet সংযোগ (ঐচ্ছিক)**

Google Cloud এ একটা service account বানান, key ফাইলের path `server/.env` এ দিন:

```
GOOGLE_APPLICATION_CREDENTIALS=<key.json এর path>
```

প্রতি project এর Sheet service account এর email এ share করুন (Viewer যথেষ্ট), আর Sheet এর URL রাখুন ওই project এর `docs/specs/prd-tracking-sheet.txt` এ।

**৩. চালান**

```
cd server && npm start
```

তারপর browser এ `http://127.0.0.1:47615`।

## VS Code extension হিসেবেও

Terminal এ কিছু না চালিয়ে চাইলে [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=NazmulIslamNaim.nin-claude-dashboard) থেকে extension install করুন। Command palette এ **Claude Dashboard: Open** দিলে dashboard VS Code এর ভেতরেই খুলবে। Sheet না লাগলে `MAP.md` দিয়েও কাজ চলে।

## কী লাভ হলো

- Context switch কমেছে: এক পাতায় সব project।
- Port clash নেই: কোন project কোন port ধরে, সেটা সেভ করা।
- Plugin গোলমাল নেই: যে project এ যেটা লাগে, শুধু সেটা on।
- Requirement আর কোড পাশাপাশি।

## এরপর

Feedback বা idea থাকলে GitHub এ issue দিন।

**Repo:** https://github.com/Nazmul-Islam-Naim/nin-claude-dashboard

---
Tags: Claude Code, VS Code, Developer Tools, Productivity, Open Source
