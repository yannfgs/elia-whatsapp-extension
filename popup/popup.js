// popup.js
document.addEventListener('DOMContentLoaded', function () {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveKeyBtn');
  const removeBtn = document.getElementById('removeKeyBtn');
  const statusMsg = document.getElementById('statusMsg');

  // Carrega chave já salva (se houver)
  chrome.storage.local.get(['openai_api_key'], function(result) {
    if (result.openai_api_key) {
      apiKeyInput.value = result.openai_api_key;
      statusMsg.textContent = "Chave já configurada!";
    }
  });

  saveBtn.onclick = function () {
    const key = apiKeyInput.value.trim();
    if (!key.startsWith('sk-')) {
      statusMsg.textContent = "Chave inválida!";
      return;
    }
    chrome.storage.local.set({ openai_api_key: key }, function() {
      statusMsg.textContent = "Chave salva com sucesso!";
      setTimeout(() => { statusMsg.textContent = ""; }, 2000);
    });
  };

  removeBtn.onclick = function () {
    chrome.storage.local.remove(['openai_api_key'], function() {
      apiKeyInput.value = '';
      statusMsg.textContent = "Chave removida.";
      setTimeout(() => { statusMsg.textContent = ""; }, 2000);
    });
  };
});
