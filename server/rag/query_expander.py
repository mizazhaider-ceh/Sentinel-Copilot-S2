"""
Query Expander
==============
Expands user queries with CS-domain synonyms/abbreviations
and subject-specific context terms for improved retrieval.
"""

from typing import Optional
from loguru import logger


class QueryExpander:
    """Expand queries with domain-specific synonyms and context."""

    EXPANSIONS = {
        'sql injection': ['sqli', 'sql injection', 'database injection'],
        'sqli': ['sql injection', 'sqli', 'database injection'],
        'xss': ['cross-site scripting', 'xss', 'script injection'],
        'cross-site scripting': ['xss', 'cross-site scripting'],
        'csrf': ['cross-site request forgery', 'csrf', 'session riding'],
        'idor': ['insecure direct object reference', 'idor', 'broken access control'],
        'ssrf': ['server-side request forgery', 'ssrf'],
        'rce': ['remote code execution', 'rce', 'command injection'],
        'lfi': ['local file inclusion', 'lfi', 'path traversal'],
        'rfi': ['remote file inclusion', 'rfi'],
        'dos': ['denial of service', 'dos', 'ddos'],
        'mitm': ['man in the middle', 'mitm', 'arp spoofing'],
        'dns': ['domain name system', 'dns', 'name resolution'],
        'tcp': ['transmission control protocol', 'tcp', 'tcp/ip'],
        'udp': ['user datagram protocol', 'udp'],
        'http': ['hypertext transfer protocol', 'http', 'web protocol'],
        'https': ['http secure', 'https', 'tls', 'ssl'],
        'api': ['application programming interface', 'api', 'rest api', 'endpoint'],
        'rest': ['representational state transfer', 'rest', 'restful'],
        'osi': ['open systems interconnection', 'osi model', 'osi layers'],
        'vpn': ['virtual private network', 'vpn', 'tunnel'],
        'ssh': ['secure shell', 'ssh', 'remote access'],
        'gdpr': ['general data protection regulation', 'gdpr', 'data protection'],
        'ctf': ['capture the flag', 'ctf', 'security challenge'],
        'owasp': ['open web application security project', 'owasp', 'owasp top 10'],
        'cidr': ['classless inter-domain routing', 'cidr', 'subnet'],
        'nat': ['network address translation', 'nat', 'port forwarding'],
        'dhcp': ['dynamic host configuration protocol', 'dhcp', 'ip assignment'],
        'arp': ['address resolution protocol', 'arp', 'mac address resolution'],
        'vlan': ['virtual local area network', 'vlan', 'network segmentation'],
        'firewall': ['firewall', 'packet filter', 'network security'],
        'regex': ['regular expression', 'regex', 'regexp', 'pattern matching'],
        'orm': ['object relational mapping', 'orm', 'database abstraction'],
        'jwt': ['json web token', 'jwt', 'authentication token'],
        'cors': ['cross-origin resource sharing', 'cors'],
    }

    SUBJECT_CONTEXT = {
        'networks': ['network', 'protocol', 'layer', 'packet', 'routing', 'switching'],
        'pentesting': ['vulnerability', 'exploit', 'attack', 'security', 'payload'],
        'backend': ['server', 'api', 'database', 'endpoint', 'middleware', 'framework'],
        'linux': ['command', 'terminal', 'shell', 'filesystem', 'process', 'permission'],
        'ctf': ['flag', 'challenge', 'crypto', 'forensics', 'reverse engineering'],
        'scripting': ['script', 'automation', 'function', 'variable', 'loop', 'module'],
        'privacy': ['data protection', 'regulation', 'consent', 'processing', 'controller'],
    }

    @classmethod
    def expand(cls, query: str, subject_id: Optional[str] = None) -> str:
        """Expand query with domain-specific synonyms."""
        lower_query = query.lower().strip()
        expansion_terms = set()

        for key, expansions in cls.EXPANSIONS.items():
            if key in lower_query:
                expansion_terms.update(expansions)

        if subject_id and subject_id in cls.SUBJECT_CONTEXT:
            context_terms = cls.SUBJECT_CONTEXT[subject_id]
            for term in context_terms[:3]:
                if term not in lower_query:
                    expansion_terms.add(term)

        if expansion_terms:
            extra = ' '.join(expansion_terms - set(lower_query.split()))
            expanded = f"{query} {extra}"
            logger.debug(f"Query expanded: '{query}' -> '{expanded[:100]}...'")
            return expanded

        return query
