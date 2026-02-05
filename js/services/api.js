/**
 * services/api.js
 * S2-Sentinel Copilot - AI API Service
 * Handles Cerebras and Gemini API interactions with custom system prompts
 */

export const ApiService = {

    Cerebras: {
        connect: async (apiKey) => {
            try {
                const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b',
                        messages: [{ role: 'user', content: 'Connection Test' }],
                        max_tokens: 5
                    })
                });

                if (!response.ok) {
                    throw new Error(`Cerebras API connection failed: ${response.statusText}`);
                }
                return true;
            } catch (error) {
                console.error('Cerebras connection error:', error);
                throw error;
            }
        },

        /**
         * Call Cerebras API with custom system prompt
         * @param {string} prompt - User prompt
         * @param {string} apiKey - API key
         * @param {string} context - Context identifier (unused, kept for compatibility)
         * @param {string} model - Model name
         * @param {string} systemPrompt - Custom system prompt from PromptBuilder
         */
        call: async (prompt, apiKey, context = 'chatbot', model = 'llama-3.3-70b', systemPrompt = '') => {
            try {
                const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'User-Agent': 'S2-Sentinel/1.0'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: systemPrompt || 'You are a helpful study assistant.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.7,
                        max_tokens: 4000,
                        stream: false
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `Cerebras API error: ${response.statusText}`);
                }

                const data = await response.json();
                return data.choices[0].message.content;
            } catch (error) {
                console.error('Cerebras API call error:', error);
                throw error;
            }
        }
    },

    Gemini: {
        connect: async (apiKey) => {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'Connection test' }] }]
                    })
                });

                if (!response.ok) {
                    throw new Error('Gemini API connection failed');
                }
                return true;
            } catch (error) {
                console.error('Gemini connection error:', error);
                throw error;
            }
        },

        /**
         * Call Gemini API with custom system prompt
         * @param {string} prompt - User prompt  
         * @param {string} apiKey - API key
         * @param {string} context - Context identifier (unused, kept for compatibility)
         * @param {string} systemPrompt - Custom system prompt from PromptBuilder
         */
        call: async (prompt, apiKey, context = 'chatbot', systemPrompt = '') => {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            { 
                                role: 'user',
                                parts: [{ text: prompt }]
                            }
                        ],
                        systemInstruction: {
                            parts: [{ text: systemPrompt || 'You are a helpful study assistant.' }]
                        },
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 4000
                        }
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `Gemini API error: ${response.statusText}`);
                }

                const data = await response.json();
                return data.candidates[0].content.parts[0].text;
            } catch (error) {
                console.error('Gemini API call error:', error);
                throw error;
            }
        }
    }
};
