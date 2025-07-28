// Test script for API key validation
const apiKey = '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';

console.log('Testing API key:', apiKey);
console.log('Starts with sk-or-v1-:', apiKey.startsWith('sk-or-v1-'));
console.log('Length:', apiKey.length);
console.log('Expected length should be around 64 characters');

// Test the API call
async function testApiCall() {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://itsakashpandey.github.io',
        'X-Title': 'PhenoFit Pro AI Assistant'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          },
          {
            role: 'user',
            content: 'Say "Connection test successful" and nothing else.'
          }
        ],
        max_tokens: 10,
        temperature: 0
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('✅ API call successful!');
      console.log('Content:', data.choices?.[0]?.message?.content);
    } else {
      console.log('❌ API call failed');
      console.log('Error:', data.error);
    }

  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Run the test
testApiCall();
