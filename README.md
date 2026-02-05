# S2-Sentinel Copilot 🛡️

> **Hyper-Intelligent AI Study Platform for CS Engineering Semester 2**  
> Built specifically for Howest University Belgium

![Version](https://img.shields.io/badge/version-1.0.0-emerald)
![Phase](https://img.shields.io/badge/phase-3%2F6-blue)
![Courses](https://img.shields.io/badge/courses-7-purple)
![AI](https://img.shields.io/badge/AI-Cerebras%20%7C%20Gemini-orange)

---

## 🎯 What is S2-Sentinel?

S2-Sentinel Copilot is a **subject-aware AI tutor** that understands your specific courses, uses your uploaded materials for context, and teaches using the **optimal pedagogy style** for each subject.

### Key Differentiators

| Feature | Description |
|---------|-------------|
| **7 Subjects Configured** | Each with unique teaching style |
| **5-Layer Prompt System** | Identity → Expertise → Pedagogy → Examples → Context |
| **Document RAG** | Upload PDFs, get context-aware answers |
| **Subject Toolkits** | 15+ specialized tools per course |
| **Study Analytics** | Track time, quizzes, weak topics |

---

## 📚 Courses Covered

| Course | Credits | Teaching Style | Tools |
|--------|---------|----------------|-------|
| 🔵 Computer Networks | 6 ECTS | Packet-First | Subnet Calc, Port Lookup |
| 🔴 Web Pentesting | 3 ECTS | Attack-Chain | Encoder, Header Analyzer |
| 🟢 Web Backend | 3 ECTS | Code-First | JWT Decoder, SQL Formatter |
| 🟡 Linux for Ethical Hackers | 6 ECTS | CLI-First | Permission Calc, Cron Gen |
| 🟣 Capture The Flag | 3 ECTS | Hint-Ladder | Base Converter, Hash ID |
| 🔵 Scripting & Code Analysis | 6 ECTS | Annotated-Code | Regex Tester |
| 🌸 Data Privacy & IT Law | 3 ECTS | Case-Based | GDPR Lookup |

---

## 🚀 Quick Start

### 1. Open the App
```
Open index.html in Chrome (or any modern browser)
```

### 2. Add API Key
Get a **free** API key from one of:
- [Cerebras](https://cloud.cerebras.ai/) (Recommended - Fast!)
- [Google AI Studio](https://aistudio.google.com/apikey)

### 3. Select a Course
Click any subject card on the dashboard

### 4. Upload Materials
Drop your PDF course slides/notes for context-aware responses

### 5. Start Learning!
Ask questions, use tools, take quizzes

---

## 🏗️ Development Status

### Phase 1: Foundation ✅ COMPLETE
- [x] Project structure & SPA router
- [x] 7 subjects configured with pedagogy styles
- [x] IndexedDB storage (unlimited docs)
- [x] State management (reactive)
- [x] UI shell, modals & components

### Phase 2: AI Integration ✅ COMPLETE
- [x] Unified API layer (Cerebras + Gemini)
- [x] Automatic failover between providers
- [x] Response caching (memory + localStorage)
- [x] Streaming support with real-time rendering
- [x] Rate limiting & retry logic
- [x] 5-layer subject prompt system

### Phase 3: RAG Enhancement ✅ COMPLETE
- [x] JavaScript TF-IDF engine (offline)
- [x] Semantic text chunking
- [x] Python backend with ChromaDB (optional)
- [x] Sentence-transformers for embeddings
- [x] Auto-detection (Python backend → JS fallback)
- [x] PDF processing with PyMuPDF

### Phase 4-6: Upcoming
See [docs/DEVELOPMENT-PHASES.md](docs/DEVELOPMENT-PHASES.md) for full roadmap.

---

## 📁 Project Structure

```
S2-Sentinel-Copilot/
├── index.html              # SPA entry point
├── manifest.json           # PWA manifest
├── README.md               # This file
├── docs/
│   └── DEVELOPMENT-PHASES.md   # Full roadmap
├── css/
│   └── sentinel.css        # Custom styles
├── js/
│   ├── main.js             # Router & bootstrap
│   ├── config-s2.js        # 7 subjects config
│   ├── state-manager.js    # Reactive state
│   ├── features/
│   │   ├── prompt-builder.js   # 5-layer prompts
│   │   ├── rag-engine.js       # TF-IDF + Python backend
│   │   ├── toolkit.js          # Subject tools
│   │   └── analytics.js        # Study tracking
│   ├── services/
│   │   ├── api.js              # AI providers (Cerebras/Gemini)
│   │   └── storage-idb.js      # IndexedDB
│   ├── views/
│   │   ├── dashboard.js        # Subject grid
│   │   └── workspace.js        # Chat interface
│   └── ui/                     # UI utilities
├── server/                     # Python RAG Backend (optional)
│   ├── start-server.bat        # One-click Windows startup
│   ├── main.py                 # FastAPI application
│   ├── rag.py                  # ChromaDB + embeddings
│   ├── config.py               # Pydantic settings
│   └── requirements.txt        # Python dependencies
└── images/
```

---

## 🐍 Python RAG Backend (Optional)

For enhanced semantic search, you can run the Python backend with ChromaDB vector database.

### Requirements
- Python 3.10+ (tested with 3.13.9)
- Windows (batch script provided)

### Quick Start

```powershell
# Navigate to server folder
cd server

# Run the one-click startup script
.\start-server.bat
```

The script will automatically:
1. Create a virtual environment
2. Install all dependencies (FastAPI, ChromaDB, sentence-transformers, etc.)
3. Download spaCy English model
4. Start the server at `http://localhost:8765`

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server health check |
| `/documents/upload` | POST | Upload PDF/TXT files |
| `/documents/search` | POST | Semantic search |
| `/documents/{subject}` | DELETE | Clear subject documents |

### Without Python Backend

The app works fully without the Python backend - it will use the built-in JavaScript TF-IDF engine for document search. The frontend auto-detects which engine to use.

---

## ⚙️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Vanilla JavaScript (ES Modules) |
| **Styling** | Tailwind CSS + Custom Glass Effects |
| **Storage** | IndexedDB (unlimited document storage) |
| **AI** | Cerebras (Llama 3.3 70B) + Gemini 1.5 Flash |
| **PDF** | PDF.js for document parsing |
| **Charts** | Chart.js for analytics |
| **Markdown** | Marked.js + Prism.js |
| **Backend** | FastAPI + Uvicorn (Python, optional) |
| **Vector DB** | ChromaDB (persistent storage) |
| **Embeddings** | sentence-transformers (all-MiniLM-L6-v2) |
| **NLP** | spaCy (semantic chunking) |

---

## 🔧 Development

No build step required! Just serve the files:

```powershell
# Python
python -m http.server 8000

# Node.js
npx serve .

# VS Code
Use Live Server extension
```

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [README.md](README.md) | Quick start & overview |
| [DEVELOPMENT-PHASES.md](docs/DEVELOPMENT-PHASES.md) | Full 6-phase roadmap |

---

## 🎓 About

Built for **Muhammad Izaz Haider (MIHx0)**  
Cybersecurity Student @ Howest University 🇧🇪  
Junior DevSecOps & AI Security Engineer @ Damno Solutions  
Founder of The PenTrix

---

## 📜 License

MIT License - Use freely, modify as needed.

---

**Made with 🛡️ for Semester 2 success**
