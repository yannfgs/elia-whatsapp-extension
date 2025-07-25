// == BACKGROUND.JS CRM WhatsApp Elia - COMPLETO ==

// Escutando todas as mensagens dos content-scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Consulta à IA com contexto (histórico de chat)
  if (request.action === "eliaAskWithContext") {
    handleEliaAskWithContext(request, sendResponse);
    return true; // muito importante para trabalhar com Promises!
  }
  // Melhora de mensagem no campo do WhatsApp
  if (request.action === "improveMessage") {
    handleImproveMessage(request, sendResponse);
    return true;
  }
});

// == HANDLER PARA CHAT CONTEXTUAL COM IA ==
async function handleEliaAskWithContext(request, sendResponse) {
  try {
    // Pega a chave do OpenAI guardada no Chrome
    const result = await chrome.storage.local.get(['openai_api_key']);
    const apiKey = result.openai_api_key;

    if (!apiKey) {
      sendResponse({ error: "Chave da OpenAI não encontrada. Configure no popup da extensão." });
      return;
    }
    const messages = request.messages || [];
    if (!Array.isArray(messages) || messages.length === 0) {
      sendResponse({ error: "Seu histórico de chat está vazio!" });
      return;
    }
    // Monta o contexto (history) e define system prompt
    const allMessages = [
      { role: "system", content: "Você é Elia, uma assistente virtual especialista em CRM, atendimento e negócios. Sempre converse de modo empático, objetivo, claro e profissional. Responda conforme o histórico do chat." },
      ...messages // [{role:...}]
    ];

    // Faz request para a OpenAI (requer internet e API Key válida)
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o", // ou "gpt-3.5-turbo" se não tiver acesso ao 4o
        messages: allMessages,
        max_tokens: 700,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      let errorMsg = `Erro HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.error && errorData.error.message) {
          errorMsg = errorData.error.message;
        }
      } catch (e) {}
      sendResponse({ error: errorMsg });
      return;
    }
    const data = await response.json();
    // Verifica resposta
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      sendResponse({ error: "Resposta inválida recebida da IA." });
      return;
    }
    const iaText = data.choices[0].message.content.trim();
    sendResponse({ result: iaText });
  } catch (e) {
    sendResponse({ error: `Falha no processamento interno: ${e.message||"erro desconhecido"}` });
  }
}

// == HANDLER PARA MELHORAR MENSAGEM (IA) ==
async function handleImproveMessage(request, sendResponse) {
  try {
    const result = await chrome.storage.local.get(['openai_api_key']);
    const apiKey = result.openai_api_key;
    if (!apiKey) {
      sendResponse({ error: "Chave da OpenAI não encontrada. Configure no popup da extensão." });
      return;
    }
    const userMsg = request.message;
    if (!userMsg || userMsg.trim().length === 0) {
      sendResponse({ error: "Mensagem vazia." });
      return;
    }

    const prompt = `Melhore a mensagem para WhatsApp: seja clara, cordial e profissional, corrigindo erros e mantendo naturalidade. Use emojis se ficar natural. Apenas o texto melhorado, sem aspas.\n\n${userMsg.trim()}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",  // pode usar "gpt-3.5-turbo" se não tiver acesso ao 4o
        messages: [
          { role: "system", content: "Você é um especialista em comunicação humanizada e WhatsApp Business." },
          { role: "user", content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      let errorMsg = `Erro HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.error && errorData.error.message) {
          errorMsg = errorData.error.message;
        }
      } catch (e) {}
      sendResponse({ error: errorMsg });
      return;
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      sendResponse({ error: "Resposta inválida da IA." });
      return;
    }
    let improvedText = data.choices[0].message.content.trim();
    improvedText = improvedText.replace(/^["'`«”]*Texto melhorado:?\s*/i, ""); // tira header se houver
    improvedText = improvedText.replace(/^["'`]+|["'`]+$/g, "");
    improvedText = improvedText.replace(/\n{3,}/g, '\n\n');
    sendResponse({ result: improvedText });
  } catch (e) {
    sendResponse({ error: `Falha interna: ${e.message||"erro desconhecido"}` });
  }
}

// == TRUQUE PARA MANTER SERVICE WORKER ATIVO [Chrome Extension MV3] ==
let keepAliveInterval;
function keepServiceWorkerAlive() {
  keepAliveInterval = setInterval(() => {
    chrome.runtime.getPlatformInfo(() => { });
  }, 25000);
}
keepServiceWorkerAlive();
self.addEventListener('beforeunload', () => {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
});