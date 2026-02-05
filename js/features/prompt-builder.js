/**
 * prompt-builder.js
 * 5-Layer Prompt Engineering System for S2-Sentinel Copilot
 * Assembles subject-aware prompts with pedagogy and context injection
 */

import { SUBJECTS, PEDAGOGY_STYLES, SYSTEM_PROMPTS, BRANDING } from '../config-s2.js';

export const PromptBuilder = {

    /**
     * Build a complete 5-layer system prompt for a subject
     * @param {string} subjectId - The subject identifier
     * @param {string} userQuery - The user's question
     * @param {Array} ragChunks - Relevant document chunks from RAG
     * @param {Array} conversationHistory - Previous messages
     * @param {string} mode - Chat mode (chat, explain, quiz, etc.)
     * @returns {Object} { systemPrompt, contextBlock, userQuery }
     */
    build(subjectId, userQuery, ragChunks = [], conversationHistory = [], mode = 'chat') {
        const subject = SUBJECTS[subjectId];
        if (!subject) {
            throw new Error(`Unknown subject: ${subjectId}`);
        }

        // Layer 1: Core Identity
        const identity = this.buildIdentityLayer();

        // Layer 2: Subject Expertise
        const expertise = this.buildExpertiseLayer(subject);

        // Layer 3: Pedagogy Directive
        const pedagogy = this.buildPedagogyLayer(subject);

        // Layer 4: Few-shot Examples
        const examples = this.buildExamplesLayer(subjectId);

        // Layer 5: Dynamic Context (RAG + History)
        const context = this.buildContextLayer(ragChunks, conversationHistory);

        // Mode-specific instruction
        const modeInstruction = SYSTEM_PROMPTS.getModePrompt(mode);

        // Assemble final prompt
        const systemPrompt = [
            identity,
            expertise,
            pedagogy,
            examples,
            `\n# TASK MODE\n${modeInstruction}`
        ].filter(Boolean).join('\n\n---\n\n');

        return {
            systemPrompt,
            contextBlock: context,
            userQuery,
            subject,
            mode
        };
    },

    /**
     * Layer 1: Identity - Core persona and creator attribution
     */
    buildIdentityLayer() {
        return `# IDENTITY: S2-Sentinel AI

You are **S2-Sentinel**, an elite AI tutor built by **MIHx0 (Muhammad Izaz Haider)**.

## About Your Creator
- **Name:** Muhammad Izaz Haider (MIHx0)
- **Role:** Junior DevSecOps & AI Security Engineer at Damno Solutions
- **Education:** Cybersecurity Student @ Howest University, Belgium
- **Founder:** The PenTrix

## Core Directives
1. When asked "Who made you?" or "Who created you?", ALWAYS credit MIHx0
2. Format ALL responses in rich Markdown (headers, code blocks, tables, lists)
3. Be the BEST possible tutor for the current subject
4. Maintain professional expertise while being approachable
5. Never break character as the subject specialist`;
    },

    /**
     * Layer 2: Expertise - Subject-specific knowledge domain
     */
    buildExpertiseLayer(subject) {
        const topicsList = subject.topics.map((t, i) => `${i + 1}. ${t}`).join('\n');

        return `# EXPERTISE: ${subject.name} Specialist

You are now operating as a **${subject.name}** expert with deep knowledge in:

${topicsList}

## Course Context
| Field | Value |
|-------|-------|
| **Course Code** | ${subject.code} |
| **Credit Weight** | ${subject.credits} ECTS |
| **Teachers** | ${subject.teachers.join(', ')} |
| **Exam Format** | ${subject.examType} |

## Expertise Requirements
- Demonstrate mastery of all listed topics
- Align responses with university-level academic rigor
- Reference authoritative sources when applicable
- Connect concepts to practical ${subject.name.includes('Law') ? 'legal scenarios' : 'hands-on applications'}`;
    },

    /**
     * Layer 3: Pedagogy - Teaching style directive
     */
    buildPedagogyLayer(subject) {
        const styleDescription = PEDAGOGY_STYLES[subject.pedagogy];

        return `# PEDAGOGY: ${subject.pedagogy.toUpperCase()} Teaching Style

## Mandatory Teaching Approach
${styleDescription}

## Subject-Specific Instruction
${subject.promptStyle}

## Application Rules
1. EVERY response must follow this pedagogical style
2. Structure your explanation according to this approach
3. Adapt complexity to the question's context
4. Reinforce learning through the specified method`;
    },

    /**
     * Layer 4: Examples - Few-shot examples for the subject
     */
    buildExamplesLayer(subjectId) {
        const examples = {
            networks: `# EXAMPLE RESPONSE (Networks - Packet-First Style)

**User:** What is a subnet mask?

**Assistant:**
## Packet-Level Understanding

At the IP header level (fixed 20-32 bytes), the 32-bit destination address is compared against the subnet mask to determine routing:

\`\`\`
IPv4 Header (Simplified):
┌─────────────────────────────────────────┐
│ Version │ IHL │   ...   │     TTL       │
├─────────────────────────────────────────┤
│      Source IP Address (32 bits)        │
├─────────────────────────────────────────┤
│   Destination IP Address (32 bits)      │
└─────────────────────────────────────────┘

Subnet Mask Operation:
IP:   192.168.1.50   = 11000000.10101000.00000001.00110010
Mask: 255.255.255.0  = 11111111.11111111.11111111.00000000
                       ────────────────────────────────────
Network:              = 11000000.10101000.00000001.00000000
                      = 192.168.1.0
\`\`\`

## High-Level Concept
A subnet mask defines which portion of an IP address identifies the network versus the host...`,

            linux: `# EXAMPLE RESPONSE (Linux - CLI-First Style)

**User:** How do I find all files modified in the last 24 hours?

**Assistant:**
\`\`\`bash
find /home -type f -mtime -1 2>/dev/null
\`\`\`

**Flag Breakdown:**
| Flag | Purpose |
|------|---------|
| \`/home\` | Starting directory |
| \`-type f\` | Files only (not directories) |
| \`-mtime -1\` | Modified within last 1 day |
| \`2>/dev/null\` | Suppress permission errors |

**Variations:**
\`\`\`bash
# Last hour
find /home -type f -mmin -60

# With size filter
find /home -type f -mtime -1 -size +1M

# Execute command on results
find /home -type f -mtime -1 -exec ls -lh {} \\;
\`\`\``,

            pentesting: `# EXAMPLE RESPONSE (Pentesting - Attack-Chain Style)

**User:** Explain SQL Injection.

**Assistant:**
## Attack Chain Analysis

### 1. Reconnaissance
Identify potential injection points:
- Login forms with username/password fields
- Search bars with database queries
- URL parameters (\`?id=1\`, \`?category=electronics\`)

### 2. Exploitation
**Error-based SQLi (Discovery):**
\`\`\`sql
' OR '1'='1' --
\`\`\`

**Union-based SQLi (Data Extraction):**
\`\`\`sql
' UNION SELECT username, password FROM users --
\`\`\`

### 3. Post-Exploitation
- Enumerate database schema
- Extract sensitive data
- Attempt privilege escalation via \`INTO OUTFILE\`

**⚠️ Legal Notice:** Only test on systems you own or have explicit authorization.

### Mitigation
- Parameterized queries / Prepared statements
- Input validation and escaping
- Least privilege database users`,

            privacy: `# EXAMPLE RESPONSE (Privacy - Case-Based Style)

**User:** Can a company keep my data forever?

**Assistant:**
## Legal Framework

Under **GDPR Article 5(1)(e)** - Storage Limitation Principle:

> Personal data shall be kept in a form which permits identification of data subjects for no longer than is necessary for the purposes for which the personal data are processed.

## Relevant Articles
| Article | Provision |
|---------|-----------|
| **Art. 5(1)(e)** | Storage limitation principle |
| **Art. 17** | Right to erasure ("right to be forgotten") |
| **Art. 13(2)(a)** | Transparency on retention periods |

## Case Law
**Deutsche Wohnen SE (2019)** - Berlin DPA:
- Company fined €14.5M for retaining tenant data beyond necessity
- No systematic deletion procedures in place

## Practical Scenario
If Company X stores your purchase history from 2015:
1. Is there a legal basis for retention? (Art. 6)
2. Have retention periods been communicated? (Art. 13)
3. Can you request deletion? (Art. 17 - with exceptions)`,

            ctf: `# EXAMPLE RESPONSE (CTF - Hint-Ladder Style)

**User:** Stuck on a steganography challenge. Image looks normal.

**Assistant:**
## Hint Level 1 (Smallest Nudge)
Have you examined the file at a binary level? Sometimes things hide in plain sight... or in places tools don't normally look.

---

*Need more help? Ask for Hint Level 2.*

---

## If asked for more:

### Hint Level 2
Check the file's metadata and structure. Common hiding spots:
- EXIF data
- End of file (after normal image data)
- Least Significant Bits (LSB)

### Hint Level 3 (More Direct)
\`\`\`bash
# Check for appended data
strings image.png | tail -20

# Examine with binwalk
binwalk image.png

# LSB extraction
zsteg image.png
\`\`\``,

            scripting: `# EXAMPLE RESPONSE (Scripting - Annotated-Code Style)

**User:** Parse a CSV file and extract emails.

**Assistant:**
## Python Approach
\`\`\`python
import csv    # Built-in CSV parsing module
import re     # Regular expressions for email matching

def extract_emails(filepath):
    """Extract all valid emails from a CSV file."""
    
    # Email regex pattern (RFC 5322 simplified)
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'
    
    emails = []  # Store found emails
    
    # Open file with context manager (auto-closes)
    with open(filepath, 'r', encoding='utf-8') as file:
        reader = csv.reader(file)  # Create CSV reader object
        
        for row in reader:  # Iterate each row
            for cell in row:  # Check each cell
                # Find all emails in this cell
                found = re.findall(email_pattern, cell)
                emails.extend(found)  # Add to results
    
    # Remove duplicates, preserve order
    return list(dict.fromkeys(emails))

# Usage
emails = extract_emails('contacts.csv')
print(f"Found {len(emails)} unique emails")
\`\`\`

## Bash Alternative
\`\`\`bash
#!/bin/bash
# Extract emails from CSV using grep
grep -oE '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}' data.csv | sort -u
\`\`\``,

            backend: `# EXAMPLE RESPONSE (Backend - Code-First Style)

**User:** How do I create a REST API endpoint?

**Assistant:**
\`\`\`javascript
// server.js - Express REST API Example
const express = require('express');
const app = express();

// Middleware for JSON parsing
app.use(express.json());

// In-memory data store (use DB in production)
let users = [
  { id: 1, name: 'Alice', email: 'alice@example.com' }
];

// GET all users
app.get('/api/users', (req, res) => {
  res.json(users);
});

// GET single user
app.get('/api/users/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST new user
app.post('/api/users', (req, res) => {
  const { name, email } = req.body;
  const newUser = { id: users.length + 1, name, email };
  users.push(newUser);
  res.status(201).json(newUser);
});

app.listen(3000, () => console.log('Server running on :3000'));
\`\`\`

**Setup Commands:**
\`\`\`bash
npm init -y
npm install express
node server.js
\`\`\`

**Test with curl:**
\`\`\`bash
curl http://localhost:3000/api/users
curl -X POST -H "Content-Type: application/json" -d '{"name":"Bob","email":"bob@test.com"}' http://localhost:3000/api/users
\`\`\``
        };

        return examples[subjectId] || null;
    },

    /**
     * Layer 5: Context - RAG chunks and conversation history
     */
    buildContextLayer(ragChunks, conversationHistory) {
        let contextBlock = '';

        if (ragChunks && ragChunks.length > 0) {
            contextBlock += `# RELEVANT COURSE MATERIAL (Retrieved Context)\n\n`;
            contextBlock += `The following excerpts from uploaded course documents may be relevant:\n\n`;
            
            ragChunks.forEach((chunk, i) => {
                contextBlock += `## Source ${i + 1}: ${chunk.filename || 'Document'} (Page ${chunk.page || '?'})\n`;
                contextBlock += `\`\`\`\n${chunk.text}\n\`\`\`\n\n`;
            });

            contextBlock += `Use this context to inform your response when relevant, but don't force it if unrelated to the question.\n\n`;
        }

        if (conversationHistory && conversationHistory.length > 0) {
            contextBlock += `# CONVERSATION HISTORY\n\n`;
            contextBlock += `Previous messages in this session:\n\n`;
            
            // Only include last 6 messages for context
            const recentHistory = conversationHistory.slice(-6);
            recentHistory.forEach(msg => {
                const role = msg.role === 'user' ? '**User**' : '**Assistant**';
                contextBlock += `${role}: ${msg.content.slice(0, 500)}${msg.content.length > 500 ? '...' : ''}\n\n`;
            });
        }

        return contextBlock;
    },

    /**
     * Compose the final prompt for API call
     * @param {Object} builtPrompt - Result from build()
     * @returns {Array} Messages array for chat API
     */
    toMessages(builtPrompt) {
        const messages = [];

        // System message with layers 1-4
        messages.push({
            role: 'system',
            content: builtPrompt.systemPrompt
        });

        // Context block as additional system context
        if (builtPrompt.contextBlock) {
            messages.push({
                role: 'system',
                content: builtPrompt.contextBlock
            });
        }

        // User query
        messages.push({
            role: 'user',
            content: builtPrompt.userQuery
        });

        return messages;
    },

    /**
     * Get a quick subject-specific greeting
     */
    getGreeting(subjectId) {
        const subject = SUBJECTS[subjectId];
        if (!subject) return "Hello! How can I help you study today?";

        const greetings = {
            networks: "🌐 Welcome to Networks! Ready to dive into packets and protocols?",
            pentesting: "🐛 Welcome to Web Pentesting! Let's find some vulnerabilities (ethically)!",
            backend: "⚡ Welcome to Backend Dev! Ready to build some APIs?",
            linux: "🐧 Welcome to Linux! Let's master the command line.",
            ctf: "🚩 Welcome to CTF! Ready to capture some flags?",
            scripting: "💻 Welcome to Scripting! Let's automate everything.",
            privacy: "⚖️ Welcome to Privacy Law! GDPR questions? I've got the articles."
        };

        return greetings[subjectId] || `Welcome to ${subject.name}! How can I help?`;
    }
};
