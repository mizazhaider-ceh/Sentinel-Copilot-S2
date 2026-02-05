/**
 * toolkit.js
 * Subject-Specific Tools Registry for S2-Sentinel Copilot
 * Provides specialized utilities for each course
 */

import { SUBJECTS } from '../config-s2.js';

export const Toolkit = {

    /**
     * Registry of all tools
     */
    tools: {

        // ═══════════════════════════════════════════════════════════════
        // COMPUTER NETWORKS TOOLS
        // ═══════════════════════════════════════════════════════════════

        'subnet-calculator': {
            id: 'subnet-calculator',
            name: 'Subnet Calculator',
            subject: 'networks',
            icon: 'fa-calculator',
            description: 'Calculate network address, broadcast, and usable hosts from CIDR notation',
            inputs: [
                { name: 'cidr', label: 'IP/CIDR', placeholder: '192.168.1.0/24', type: 'text' }
            ],
            execute: (cidr) => {
                const parts = cidr.split('/');
                if (parts.length !== 2) return { error: 'Invalid format. Use: IP/CIDR (e.g., 192.168.1.0/24)' };

                const ip = parts[0];
                const prefix = parseInt(parts[1]);

                if (prefix < 0 || prefix > 32) return { error: 'CIDR must be between 0 and 32' };

                const ipParts = ip.split('.').map(Number);
                if (ipParts.length !== 4 || ipParts.some(p => p < 0 || p > 255)) {
                    return { error: 'Invalid IP address' };
                }

                const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
                const mask = prefix === 0 ? 0 : ~((1 << (32 - prefix)) - 1);
                const network = ipNum & mask;
                const broadcast = network | ~mask;
                const usableHosts = prefix >= 31 ? (prefix === 32 ? 1 : 2) : (1 << (32 - prefix)) - 2;

                const numToIp = (n) => [
                    (n >>> 24) & 255,
                    (n >>> 16) & 255,
                    (n >>> 8) & 255,
                    n & 255
                ].join('.');

                return {
                    networkAddress: numToIp(network >>> 0),
                    broadcastAddress: numToIp(broadcast >>> 0),
                    subnetMask: numToIp(mask >>> 0),
                    wildcardMask: numToIp((~mask) >>> 0),
                    usableHosts: usableHosts,
                    firstHost: prefix < 31 ? numToIp((network + 1) >>> 0) : numToIp(network >>> 0),
                    lastHost: prefix < 31 ? numToIp((broadcast - 1) >>> 0) : numToIp(broadcast >>> 0),
                    cidrNotation: `/${prefix}`,
                    ipClass: ipParts[0] < 128 ? 'A' : ipParts[0] < 192 ? 'B' : ipParts[0] < 224 ? 'C' : 'D/E'
                };
            }
        },

        'port-lookup': {
            id: 'port-lookup',
            name: 'Port Lookup',
            subject: 'networks',
            icon: 'fa-door-open',
            description: 'Look up common port numbers and their services',
            inputs: [
                { name: 'port', label: 'Port Number', placeholder: '443', type: 'number' }
            ],
            execute: (port) => {
                const ports = {
                    20: { service: 'FTP Data', protocol: 'TCP', category: 'File Transfer' },
                    21: { service: 'FTP Control', protocol: 'TCP', category: 'File Transfer' },
                    22: { service: 'SSH', protocol: 'TCP', category: 'Remote Access' },
                    23: { service: 'Telnet', protocol: 'TCP', category: 'Remote Access (Insecure)' },
                    25: { service: 'SMTP', protocol: 'TCP', category: 'Email' },
                    53: { service: 'DNS', protocol: 'TCP/UDP', category: 'Name Resolution' },
                    67: { service: 'DHCP Server', protocol: 'UDP', category: 'Network Config' },
                    68: { service: 'DHCP Client', protocol: 'UDP', category: 'Network Config' },
                    80: { service: 'HTTP', protocol: 'TCP', category: 'Web' },
                    110: { service: 'POP3', protocol: 'TCP', category: 'Email' },
                    123: { service: 'NTP', protocol: 'UDP', category: 'Time Sync' },
                    143: { service: 'IMAP', protocol: 'TCP', category: 'Email' },
                    161: { service: 'SNMP', protocol: 'UDP', category: 'Network Management' },
                    443: { service: 'HTTPS', protocol: 'TCP', category: 'Web (Secure)' },
                    445: { service: 'SMB/CIFS', protocol: 'TCP', category: 'File Sharing' },
                    465: { service: 'SMTPS', protocol: 'TCP', category: 'Email (Secure)' },
                    587: { service: 'SMTP Submission', protocol: 'TCP', category: 'Email' },
                    993: { service: 'IMAPS', protocol: 'TCP', category: 'Email (Secure)' },
                    995: { service: 'POP3S', protocol: 'TCP', category: 'Email (Secure)' },
                    1433: { service: 'MS SQL Server', protocol: 'TCP', category: 'Database' },
                    3306: { service: 'MySQL', protocol: 'TCP', category: 'Database' },
                    3389: { service: 'RDP', protocol: 'TCP', category: 'Remote Desktop' },
                    5432: { service: 'PostgreSQL', protocol: 'TCP', category: 'Database' },
                    5900: { service: 'VNC', protocol: 'TCP', category: 'Remote Desktop' },
                    6379: { service: 'Redis', protocol: 'TCP', category: 'Database/Cache' },
                    8080: { service: 'HTTP Proxy/Alt', protocol: 'TCP', category: 'Web' },
                    8443: { service: 'HTTPS Alt', protocol: 'TCP', category: 'Web (Secure)' },
                    27017: { service: 'MongoDB', protocol: 'TCP', category: 'Database' }
                };

                const p = parseInt(port);
                if (ports[p]) {
                    return { port: p, ...ports[p] };
                }
                return { 
                    port: p, 
                    service: 'Unknown', 
                    note: p < 1024 ? 'Well-known port range' : p < 49152 ? 'Registered port range' : 'Dynamic/Private port range'
                };
            }
        },

        'cidr-converter': {
            id: 'cidr-converter',
            name: 'CIDR Converter',
            subject: 'networks',
            icon: 'fa-exchange-alt',
            description: 'Convert between CIDR, subnet mask, and wildcard mask',
            inputs: [
                { name: 'input', label: 'CIDR or Subnet Mask', placeholder: '/24 or 255.255.255.0', type: 'text' }
            ],
            execute: (input) => {
                let cidr, mask;

                if (input.startsWith('/')) {
                    cidr = parseInt(input.slice(1));
                } else if (input.includes('.')) {
                    const parts = input.split('.').map(Number);
                    const binary = parts.map(p => p.toString(2).padStart(8, '0')).join('');
                    cidr = binary.indexOf('0') === -1 ? 32 : binary.indexOf('0');
                } else {
                    cidr = parseInt(input);
                }

                if (cidr < 0 || cidr > 32) return { error: 'Invalid CIDR (0-32)' };

                mask = cidr === 0 ? 0 : ~((1 << (32 - cidr)) - 1);
                const numToIp = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

                return {
                    cidr: `/${cidr}`,
                    subnetMask: numToIp(mask >>> 0),
                    wildcardMask: numToIp((~mask) >>> 0),
                    binaryMask: '1'.repeat(cidr) + '0'.repeat(32 - cidr),
                    totalAddresses: Math.pow(2, 32 - cidr),
                    usableHosts: cidr >= 31 ? (cidr === 32 ? 1 : 2) : Math.pow(2, 32 - cidr) - 2
                };
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // LINUX TOOLS
        // ═══════════════════════════════════════════════════════════════

        'permission-calculator': {
            id: 'permission-calculator',
            name: 'Permission Calculator',
            subject: 'linux',
            icon: 'fa-lock',
            description: 'Convert between symbolic (rwx) and octal (755) permissions',
            inputs: [
                { name: 'perm', label: 'Permission', placeholder: '755 or rwxr-xr-x', type: 'text' }
            ],
            execute: (perm) => {
                const input = perm.trim();
                
                // Octal to symbolic
                if (/^[0-7]{3,4}$/.test(input)) {
                    const digits = input.length === 4 ? input.slice(1) : input;
                    const special = input.length === 4 ? parseInt(input[0]) : 0;
                    
                    const map = { 0: '---', 1: '--x', 2: '-w-', 3: '-wx', 4: 'r--', 5: 'r-x', 6: 'rw-', 7: 'rwx' };
                    const symbolic = digits.split('').map(d => map[d]).join('');
                    
                    return {
                        octal: input,
                        symbolic: symbolic,
                        owner: map[digits[0]],
                        group: map[digits[1]],
                        others: map[digits[2]],
                        description: `Owner: ${map[digits[0]]}, Group: ${map[digits[1]]}, Others: ${map[digits[2]]}`
                    };
                }
                
                // Symbolic to octal
                if (/^[rwx-]{9}$/.test(input)) {
                    const calc = (s) => (s[0] === 'r' ? 4 : 0) + (s[1] === 'w' ? 2 : 0) + (s[2] === 'x' ? 1 : 0);
                    const octal = [
                        calc(input.slice(0, 3)),
                        calc(input.slice(3, 6)),
                        calc(input.slice(6, 9))
                    ].join('');
                    
                    return {
                        symbolic: input,
                        octal: octal,
                        owner: input.slice(0, 3),
                        group: input.slice(3, 6),
                        others: input.slice(6, 9),
                        chmodCommand: `chmod ${octal} filename`
                    };
                }
                
                return { error: 'Enter octal (755) or symbolic (rwxr-xr-x)' };
            }
        },

        'cron-generator': {
            id: 'cron-generator',
            name: 'Cron Generator',
            subject: 'linux',
            icon: 'fa-clock',
            description: 'Generate cron expressions from human-readable descriptions',
            inputs: [
                { name: 'schedule', label: 'Schedule', placeholder: 'every day at 3am', type: 'text' }
            ],
            execute: (schedule) => {
                const s = schedule.toLowerCase();
                let cron = '* * * * *';
                let description = '';

                if (s.includes('every minute')) {
                    cron = '* * * * *';
                    description = 'Every minute';
                } else if (s.includes('every hour')) {
                    cron = '0 * * * *';
                    description = 'Every hour at minute 0';
                } else if (s.includes('every day at') || s.includes('daily at')) {
                    const match = s.match(/(\d+)\s*(am|pm)?/);
                    if (match) {
                        let hour = parseInt(match[1]);
                        if (match[2] === 'pm' && hour < 12) hour += 12;
                        if (match[2] === 'am' && hour === 12) hour = 0;
                        cron = `0 ${hour} * * *`;
                        description = `Every day at ${hour}:00`;
                    }
                } else if (s.includes('every monday')) {
                    cron = '0 0 * * 1';
                    description = 'Every Monday at midnight';
                } else if (s.includes('every sunday')) {
                    cron = '0 0 * * 0';
                    description = 'Every Sunday at midnight';
                } else if (s.includes('every week')) {
                    cron = '0 0 * * 0';
                    description = 'Every week on Sunday at midnight';
                } else if (s.includes('every month')) {
                    cron = '0 0 1 * *';
                    description = 'First day of every month at midnight';
                }

                return {
                    cron,
                    description,
                    fields: {
                        minute: cron.split(' ')[0],
                        hour: cron.split(' ')[1],
                        dayOfMonth: cron.split(' ')[2],
                        month: cron.split(' ')[3],
                        dayOfWeek: cron.split(' ')[4]
                    },
                    addToCrontab: `crontab -e  # Then add: ${cron} /path/to/script.sh`
                };
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // WEB PENTESTING TOOLS
        // ═══════════════════════════════════════════════════════════════

        'encoding-decoder': {
            id: 'encoding-decoder',
            name: 'Encoding/Decoder',
            subject: 'pentesting',
            icon: 'fa-exchange-alt',
            description: 'Encode/decode Base64, URL, HTML, and Hex',
            inputs: [
                { name: 'text', label: 'Input Text', placeholder: 'Text to encode/decode', type: 'text' },
                { name: 'type', label: 'Type', type: 'select', options: ['base64', 'url', 'html', 'hex'] },
                { name: 'mode', label: 'Mode', type: 'select', options: ['encode', 'decode'] }
            ],
            execute: (text, type = 'base64', mode = 'encode') => {
                try {
                    const operations = {
                        base64: {
                            encode: (s) => btoa(unescape(encodeURIComponent(s))),
                            decode: (s) => decodeURIComponent(escape(atob(s)))
                        },
                        url: {
                            encode: encodeURIComponent,
                            decode: decodeURIComponent
                        },
                        html: {
                            encode: (s) => s.replace(/[&<>"']/g, c => ({
                                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                            }[c])),
                            decode: (s) => s.replace(/&(amp|lt|gt|quot|#39);/g, (m, c) => ({
                                'amp': '&', 'lt': '<', 'gt': '>', 'quot': '"', '#39': "'"
                            }[c]))
                        },
                        hex: {
                            encode: (s) => Array.from(s).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
                            decode: (s) => s.match(/.{1,2}/g).map(b => String.fromCharCode(parseInt(b, 16))).join('')
                        }
                    };
                    
                    return {
                        input: text,
                        type,
                        mode,
                        result: operations[type][mode](text)
                    };
                } catch (e) {
                    return { error: `Failed to ${mode}: ${e.message}` };
                }
            }
        },

        'header-analyzer': {
            id: 'header-analyzer',
            name: 'Security Header Check',
            subject: 'pentesting',
            icon: 'fa-shield-alt',
            description: 'Analyze security headers present/missing',
            inputs: [
                { name: 'headers', label: 'Headers (paste)', placeholder: 'Paste response headers', type: 'textarea' }
            ],
            execute: (headers) => {
                const important = {
                    'Strict-Transport-Security': 'HSTS - Forces HTTPS',
                    'Content-Security-Policy': 'CSP - Prevents XSS',
                    'X-Frame-Options': 'Clickjacking protection',
                    'X-Content-Type-Options': 'MIME sniffing protection',
                    'X-XSS-Protection': 'Legacy XSS filter',
                    'Referrer-Policy': 'Controls referrer info',
                    'Permissions-Policy': 'Feature restrictions'
                };

                const headerLines = headers.split('\n').map(l => l.trim().toLowerCase());
                const found = [];
                const missing = [];

                Object.entries(important).forEach(([header, desc]) => {
                    const exists = headerLines.some(l => l.startsWith(header.toLowerCase()));
                    if (exists) {
                        found.push({ header, description: desc, status: '✅ Present' });
                    } else {
                        missing.push({ header, description: desc, status: '❌ Missing' });
                    }
                });

                return {
                    present: found,
                    missing: missing,
                    score: `${found.length}/${Object.keys(important).length}`,
                    recommendation: missing.length > 0 ? 
                        `Add: ${missing.map(m => m.header).join(', ')}` : 
                        'All critical headers present!'
                };
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // CTF TOOLS
        // ═══════════════════════════════════════════════════════════════

        'base-converter': {
            id: 'base-converter',
            name: 'Base Converter',
            subject: 'ctf',
            icon: 'fa-sync',
            description: 'Convert between decimal, hex, binary, and ASCII',
            inputs: [
                { name: 'input', label: 'Input', placeholder: '48656C6C6F or 72', type: 'text' },
                { name: 'from', label: 'From', type: 'select', options: ['hex', 'decimal', 'binary', 'ascii'] },
                { name: 'to', label: 'To', type: 'select', options: ['hex', 'decimal', 'binary', 'ascii'] }
            ],
            execute: (input, from = 'hex', to = 'ascii') => {
                try {
                    let decimal;
                    
                    switch (from) {
                        case 'decimal': decimal = parseInt(input); break;
                        case 'hex': decimal = parseInt(input, 16); break;
                        case 'binary': decimal = parseInt(input, 2); break;
                        case 'ascii': 
                            return {
                                input,
                                from,
                                to,
                                result: to === 'hex' ? 
                                    input.split('').map(c => c.charCodeAt(0).toString(16)).join('') :
                                    to === 'decimal' ?
                                    input.split('').map(c => c.charCodeAt(0)).join(' ') :
                                    input.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join(' ')
                            };
                    }

                    let result;
                    switch (to) {
                        case 'decimal': result = decimal.toString(); break;
                        case 'hex': result = decimal.toString(16); break;
                        case 'binary': result = decimal.toString(2); break;
                        case 'ascii': result = String.fromCharCode(decimal); break;
                    }

                    return { input, from, to, result };
                } catch (e) {
                    return { error: e.message };
                }
            }
        },

        'hash-identifier': {
            id: 'hash-identifier',
            name: 'Hash Identifier',
            subject: 'ctf',
            icon: 'fa-fingerprint',
            description: 'Identify hash types by pattern and length',
            inputs: [
                { name: 'hash', label: 'Hash', placeholder: 'Paste hash here', type: 'text' }
            ],
            execute: (hash) => {
                const h = hash.trim();
                const patterns = [
                    { regex: /^[a-f0-9]{32}$/i, name: 'MD5', length: 32 },
                    { regex: /^[a-f0-9]{40}$/i, name: 'SHA-1', length: 40 },
                    { regex: /^[a-f0-9]{64}$/i, name: 'SHA-256', length: 64 },
                    { regex: /^[a-f0-9]{96}$/i, name: 'SHA-384', length: 96 },
                    { regex: /^[a-f0-9]{128}$/i, name: 'SHA-512', length: 128 },
                    { regex: /^\$2[aby]?\$\d+\$.{53}$/, name: 'bcrypt', length: 60 },
                    { regex: /^\$6\$[a-zA-Z0-9./]+\$[a-zA-Z0-9./]{86}$/, name: 'SHA-512 crypt', length: 106 },
                    { regex: /^\$1\$[a-zA-Z0-9./]+\$[a-zA-Z0-9./]{22}$/, name: 'MD5 crypt', length: 34 },
                    { regex: /^[a-f0-9]{16}$/i, name: 'MySQL (old)', length: 16 },
                    { regex: /^\*[A-F0-9]{40}$/i, name: 'MySQL 5+', length: 41 }
                ];

                const matches = patterns.filter(p => p.regex.test(h));
                
                return {
                    hash: h.slice(0, 20) + '...',
                    length: h.length,
                    possibleTypes: matches.length > 0 ? matches.map(m => m.name) : ['Unknown'],
                    crackTools: matches.length > 0 ? 
                        ['hashcat', 'john', 'hash-identifier'] : 
                        ['Check format']
                };
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // PRIVACY/GDPR TOOLS
        // ═══════════════════════════════════════════════════════════════

        'gdpr-article-lookup': {
            id: 'gdpr-article-lookup',
            name: 'GDPR Article Lookup',
            subject: 'privacy',
            icon: 'fa-book',
            description: 'Quick reference to key GDPR articles',
            inputs: [
                { name: 'article', label: 'Article Number', placeholder: '17', type: 'number' }
            ],
            execute: (article) => {
                const articles = {
                    5: { title: 'Principles relating to processing', summary: 'Lawfulness, fairness, transparency, purpose limitation, data minimisation, accuracy, storage limitation, integrity and confidentiality, accountability' },
                    6: { title: 'Lawfulness of processing', summary: 'Six lawful bases: consent, contract, legal obligation, vital interests, public task, legitimate interests' },
                    7: { title: 'Conditions for consent', summary: 'Consent must be freely given, specific, informed, unambiguous. Easily withdrawable.' },
                    12: { title: 'Transparent information', summary: 'Information must be provided in concise, transparent, intelligible form' },
                    13: { title: 'Information at collection', summary: 'Identity of controller, purposes, legal basis, recipients, retention, rights must be provided' },
                    15: { title: 'Right of access', summary: 'Data subject can obtain confirmation and access to their personal data' },
                    16: { title: 'Right to rectification', summary: 'Right to correct inaccurate personal data' },
                    17: { title: 'Right to erasure', summary: 'Right to be forgotten - deletion of personal data in certain circumstances' },
                    18: { title: 'Right to restriction', summary: 'Right to restrict processing in certain situations' },
                    20: { title: 'Right to data portability', summary: 'Right to receive data in structured, machine-readable format' },
                    21: { title: 'Right to object', summary: 'Right to object to processing based on legitimate interests' },
                    22: { title: 'Automated decision-making', summary: 'Right not to be subject to solely automated decisions with legal effects' },
                    25: { title: 'Data protection by design', summary: 'Privacy must be built into systems from the start' },
                    32: { title: 'Security of processing', summary: 'Appropriate technical and organizational security measures required' },
                    33: { title: 'Breach notification (authority)', summary: '72-hour notification to supervisory authority after breach discovery' },
                    34: { title: 'Breach notification (subjects)', summary: 'Notification to data subjects when high risk to rights/freedoms' },
                    35: { title: 'Data protection impact assessment', summary: 'DPIA required for high-risk processing activities' },
                    37: { title: 'Designation of DPO', summary: 'When a Data Protection Officer must be appointed' },
                    44: { title: 'Transfer principles', summary: 'Rules for transferring personal data outside EU/EEA' },
                    83: { title: 'Administrative fines', summary: 'Up to €20M or 4% global turnover for serious violations' }
                };

                const a = parseInt(article);
                if (articles[a]) {
                    return {
                        article: `Article ${a}`,
                        ...articles[a],
                        fullReference: `GDPR Art. ${a}`
                    };
                }
                return { error: `Article ${a} not in quick reference. Try: 5, 6, 7, 12-22, 25, 32-35, 37, 44, 83` };
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // BACKEND TOOLS
        // ═══════════════════════════════════════════════════════════════

        'jwt-decoder': {
            id: 'jwt-decoder',
            name: 'JWT Decoder',
            subject: 'backend',
            icon: 'fa-key',
            description: 'Decode JWT tokens to view header and payload',
            inputs: [
                { name: 'token', label: 'JWT Token', placeholder: 'eyJhbGciOiJIUzI1NiIs...', type: 'textarea' }
            ],
            execute: (token) => {
                const parts = token.trim().split('.');
                if (parts.length !== 3) {
                    return { error: 'Invalid JWT format. Must have 3 parts separated by dots.' };
                }

                try {
                    const decodeBase64Url = (str) => {
                        str = str.replace(/-/g, '+').replace(/_/g, '/');
                        return JSON.parse(atob(str));
                    };

                    const header = decodeBase64Url(parts[0]);
                    const payload = decodeBase64Url(parts[1]);

                    // Check expiration
                    let expired = null;
                    if (payload.exp) {
                        const expDate = new Date(payload.exp * 1000);
                        expired = expDate < new Date();
                    }

                    return {
                        header,
                        payload,
                        signature: parts[2].slice(0, 20) + '...',
                        algorithm: header.alg,
                        expired: expired === null ? 'No exp claim' : expired ? '❌ Expired' : '✅ Valid',
                        expiration: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A',
                        issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : 'N/A'
                    };
                } catch (e) {
                    return { error: `Failed to decode: ${e.message}` };
                }
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // SCRIPTING TOOLS
        // ═══════════════════════════════════════════════════════════════

        'regex-tester': {
            id: 'regex-tester',
            name: 'Regex Tester',
            subject: 'scripting',
            icon: 'fa-asterisk',
            description: 'Test regular expressions against sample text',
            inputs: [
                { name: 'pattern', label: 'Regex Pattern', placeholder: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', type: 'text' },
                { name: 'text', label: 'Test Text', placeholder: 'Text to test against', type: 'textarea' },
                { name: 'flags', label: 'Flags', placeholder: 'gi', type: 'text' }
            ],
            execute: (pattern, text, flags = 'g') => {
                try {
                    const regex = new RegExp(pattern, flags);
                    const matches = [...text.matchAll(new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'))];
                    
                    return {
                        valid: true,
                        pattern,
                        flags,
                        matchCount: matches.length,
                        matches: matches.slice(0, 10).map(m => ({
                            match: m[0],
                            index: m.index,
                            groups: m.groups || {}
                        })),
                        pythonSyntax: `import re\nre.findall(r'${pattern}', text)`,
                        bashSyntax: `grep -${flags.includes('i') ? 'i' : ''}oP '${pattern}' file.txt`
                    };
                } catch (e) {
                    return { valid: false, error: e.message };
                }
            }
        }
    },

    /**
     * Get all tools for a specific subject
     * @param {string} subjectId - Subject identifier
     * @returns {Array} Tools for that subject
     */
    getToolsForSubject(subjectId) {
        return Object.values(this.tools).filter(t => t.subject === subjectId);
    },

    /**
     * Get a tool by ID
     * @param {string} toolId - Tool identifier
     * @returns {Object|null} Tool object
     */
    getTool(toolId) {
        return this.tools[toolId] || null;
    },

    /**
     * Execute a tool with given arguments
     * @param {string} toolId - Tool identifier
     * @param {...any} args - Tool arguments
     * @returns {Object} Tool result
     */
    executeTool(toolId, ...args) {
        const tool = this.tools[toolId];
        if (!tool) {
            return { error: `Tool not found: ${toolId}` };
        }
        try {
            return tool.execute(...args);
        } catch (e) {
            return { error: `Tool execution failed: ${e.message}` };
        }
    },

    /**
     * Get all available tools
     * @returns {Array} All tools
     */
    getAllTools() {
        return Object.values(this.tools);
    }
};
