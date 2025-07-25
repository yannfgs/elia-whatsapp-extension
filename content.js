(function() {
  // ===== VARIÁVEIS GLOBAIS CRM =====
  let eliaCategories = JSON.parse(localStorage.getItem('eliaAbasCRM') || '["Tudo","Urgente","Clientes"]');
  let eliaCatsMap = JSON.parse(localStorage.getItem('eliaCatsMap') || '{}');  // { id: [categoria] }
  let lastEliaCatFilter = "Tudo";  // Sempre começa em "Tudo"

  // ======= FUNÇÃO DE SUPORTE: ID ÚNICO PARA CADA CARD =========
  function getCardId(card){
    // Atenção para pegar SOMENTE dos cards de conversa. Não use texto geral!
    return card.getAttribute('data-id') || card.getAttribute('aria-label') || (card.innerText || "").slice(0, 80);
  }

  // ===== ESCONDER BARRA PADRÃO DO WA =====
  function hideWABar() {
    let navs = document.querySelectorAll('div[tabindex="0"]');
    if (navs.length > 0 && navs[0].offsetWidth < 150) {
      navs[0].style.visibility = 'hidden';
      navs[0].style.width = '0px';
    }
  }

  // ===== BARRA LATERAL CRM CUSTOMIZADA =====
  function createFakeSidebar() {
    if (document.getElementById('elia-sidebar-crm')) return;
    const sidebar = document.createElement('div');
    sidebar.id = 'elia-sidebar-crm';
    Object.assign(sidebar.style, {
      position: 'fixed', left: '0', top: '0', height: '100vh', width: '62px',
      background: '#fff', zIndex: '99991', display: 'flex', flexDirection: 'column',
      alignItems: 'center', boxShadow: '2px 0 10px rgba(60,80,80,0.09)',
      borderRight: '1.5px solid #edf0ee'
    });

    const menuItems = [
      { label: 'Conversas', icon: '💬', id: 'crm-conversas', idx: 0 },
      { label: 'Status', icon: '📋', id: 'crm-status', idx: 1 },
      { label: 'Canais', icon: '📢', id: 'crm-canais', idx: 2 },
      { label: 'Comunidades', icon: '👥', id: 'crm-comunidades', idx: 3 },
      { label: 'Meta AI', icon: '🌀', id: 'crm-metaai', idx: 4 },
      { label: 'ELIA IA', icon: '🧠', id: 'crm-eliaia' }
    ];

    menuItems.forEach((item) => {
      const btn = document.createElement('button');
      btn.innerHTML = `<span style="font-size:23px;">${item.icon}</span>`;
      btn.title = item.label;
      btn.id = `elia-btn-${item.id}`;
      Object.assign(btn.style, {
        background: 'none', border: 'none', margin: '19px 0 0 0', cursor: 'pointer',
        width: '48px', height: '48px', borderRadius: '14px',
        transition: 'background 0.13s', display: 'block'
      });
      btn.onmouseenter = () => btn.style.background = '#e4faee';
      btn.onmouseleave = () => btn.style.background = 'none';
      if (item.id === 'crm-eliaia') btn.onclick = openEliaPanel;
      else if (typeof item.idx === 'number') {
        btn.onclick = function () {
          let realBtns = document.querySelectorAll('button[data-navbar-item="true"]');
          if (realBtns && realBtns[item.idx]) {
            realBtns[item.idx].click();
            setTimeout(scrollConversationsToTop, 120);
          }
        }
      }
      sidebar.appendChild(btn);
    });
    const sep = document.createElement('div');
    sep.style.flexGrow = 1;
    sidebar.appendChild(sep);

    const configBtn = document.createElement('button');
    configBtn.innerHTML = '⚙️';
    configBtn.title = "Configurações";
    Object.assign(configBtn.style, {background: 'none', border: 'none', margin: '22px 0 12px 0', cursor: 'pointer',
      width: '46px', height: '46px', borderRadius: '14px'
    });
    configBtn.onclick = () => alert('Em breve: configurações da extensão!');
    sidebar.appendChild(configBtn);

    const addCatBtn = document.createElement('button');
    addCatBtn.innerHTML = '<span style="font-size:18px;">➕</span>';
    addCatBtn.title = "Adicionar nova aba CRM";
    Object.assign(addCatBtn.style, {
      background: 'linear-gradient(135deg, #25d366, #128c7e)',
      color: '#fff', border: 'none', margin: '0 0 22px 0', cursor: 'pointer',
      width: '46px', height: '46px', fontWeight: "bold", fontSize: "17px",
      borderRadius: '14px', boxShadow: "0 2px 10px #27d3a940"
    });
    addCatBtn.onclick = () => {
      const novo = prompt("Nome da nova aba CRM:");
      if (novo && novo.trim().length > 1) {
        eliaCategories.push(novo.trim());
        localStorage.setItem('eliaAbasCRM', JSON.stringify(eliaCategories));
        insertAbasCRM();
      }
    };
    sidebar.appendChild(addCatBtn);

    document.body.appendChild(sidebar);
  }

  // ===== PAINEL ELIA IA COM HISTÓRICO =====
  function openEliaPanel() {
    let panel = document.getElementById('elia-panel-crm');
    if (panel) { panel.style.display = 'flex'; return; }
    panel = document.createElement('div');
    panel.id = 'elia-panel-crm';
    Object.assign(panel.style, {
      position: 'fixed', left: '62px', top: '0', width: '340px', height: '100vh',
      background: '#fff', zIndex: '99992', boxShadow: '4px 0 22px rgba(0,30,10,0.08)',
      borderRight: '1.5px solid #e8f6ee', borderRadius: '0 12px 12px 0',
      padding: '32px 23px 22px 28px', fontFamily: 'Segoe UI, Arial, sans-serif',
      display: 'flex', flexDirection: 'column'
    });
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.title = 'Fechar painel';
    Object.assign(closeBtn.style, {
      position: 'absolute', top: '12px', right: '13px', fontSize: '28px',
      color: '#676', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold'
    });
    closeBtn.onclick = () => panel.style.display = 'none';
    panel.appendChild(closeBtn);

    const title = document.createElement('h2');
    title.innerText = 'Consultar Elia (IA)';
    Object.assign(title.style, {
      margin: '10px 0 13px 0', color: '#1da884', fontWeight: '800', fontSize: '20px'
    });
    panel.appendChild(title);

    let chatHistory = [];
    let chatHistoryDiv = document.createElement('div');
    chatHistoryDiv.id = "elia-ia-history";
    Object.assign(chatHistoryDiv.style, {
      flexGrow: 1, overflowY: 'auto', background: '#f2f6f3',
      borderRadius: '8px', padding: '11px 9px 15px 9px', marginBottom: '15px',
      minHeight: '90px', maxHeight: '380px', color: '#175943', fontSize: '15px',
      whiteSpace: 'pre-wrap', wordBreak: 'break-word'
    });
    panel.appendChild(chatHistoryDiv);

    const input = document.createElement('textarea');
    input.rows = 3;
    input.placeholder = 'Digite sua dúvida ou peça sugestões à Elia...';
    Object.assign(input.style, {
      width: '98%', marginTop: "7px", marginBottom: '8px', fontSize: "15px",
      borderRadius: "8px", border: "1.2px solid #e9efed", padding: "9px"
    });
    panel.appendChild(input);

    const btnsWrap = document.createElement('div');
    btnsWrap.style.display = "flex"; btnsWrap.style.gap = "7px";
    const askBtn = document.createElement('button');
    askBtn.textContent = "Perguntar à Elia";
    Object.assign(askBtn.style, {background: 'linear-gradient(135deg, #25d366, #128c7e)', color: '#fff', border: 'none',
      borderRadius: '9px', padding: '8px 16px', fontSize: '15px',
      fontWeight: 'bold', cursor: 'pointer', alignSelf: "flex-start"
    });
    btnsWrap.appendChild(askBtn);
    const clearBtn = document.createElement('button');
    clearBtn.textContent = "Limpar conversa";
    Object.assign(clearBtn.style, {
      background: 'none', border: '1.5px solid #1da884',
      color: '#1da884', borderRadius: '9px',
      padding: '8px 16px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer'
    });
    btnsWrap.appendChild(clearBtn);
    panel.appendChild(btnsWrap);

    function updateHistoryUI(){
      chatHistoryDiv.innerHTML = "";
      if(chatHistory.length === 0){
        chatHistoryDiv.innerHTML = "<span style='color:#888;font-style:italic'>Aguardando consulta...</span>";
        return;
      }
      chatHistory.forEach(msg => {
        let div = document.createElement('div');
        div.style.marginBottom = '8px'; div.style.padding = '7px 11px';
        div.style.borderRadius = '7px'; div.style.maxWidth = '95%';
        div.style.wordBreak = 'break-word';
        if(msg.role === 'user'){
          div.style.background = '#eafff2'; div.style.marginLeft = '18%';
          div.style.textAlign = 'right';
          div.innerHTML = `<b style='color:#176;'>Você:</b><br>${msg.content}`;
        } else {
          div.style.background = "#fff"; div.style.marginRight = '18%';
          div.style.textAlign = 'left'; div.innerHTML = `<b>Elia:</b><br>${msg.content}`;
        }
        chatHistoryDiv.appendChild(div);
      });
      chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    }
    updateHistoryUI();
    clearBtn.onclick = () => {chatHistory = []; updateHistoryUI(); input.value = '';};
    askBtn.onclick = () => {
      const pergunta = input.value.trim();
      if (!pergunta) return;
      chatHistory.push({role: 'user', content: pergunta});
      updateHistoryUI();
      input.value = '';
      askBtn.disabled = true;
      askBtn.textContent = "⏳ Processando...";
      chrome.runtime.sendMessage(
        { action: "eliaAskWithContext", messages: chatHistory },
        function (response) {
          askBtn.disabled = false; askBtn.textContent = "Perguntar à Elia";
          if (!response || response.error) {
            chatHistory.push({role: 'assistant', content: "❌ "+ (response ? response.error : 'Erro desconhecido.') });
          } else {
            chatHistory.push({role: 'assistant', content: response.result});
          }
          updateHistoryUI();
        }
      );
    };
    input.addEventListener('keydown', function(e){
      if(e.key === "Enter" && !e.shiftKey){
        e.preventDefault(); askBtn.click();
      }
    });
    document.body.appendChild(panel);
    input.focus();
  }

  // ====== SCROLL CONVERSAS ATÉ O TOPO =====
  function scrollConversationsToTop() {
    const grid = document.querySelector('div[role="grid"][aria-label]');
    if (grid) grid.scrollTop = 0;
  }

  // ===== ABAS CRM (FILTRO) =====
  function insertAbasCRM() {
    const existing = document.getElementById('elia-aba-CRM');
    if (existing) existing.remove();
    const customTabs = document.createElement('div');
    customTabs.id = "elia-aba-CRM";
    Object.assign(customTabs.style, {
      display: "flex", gap: "9px", padding: "10px 0 8px 11px",
      background: "#f9f9fa", borderBottom: "1px solid #EDF0F3",
      position: 'fixed', left: '62px', top: '0', right: '0', zIndex: '99990'
    });
    eliaCategories.forEach((name, idx) => {
      const btn = document.createElement('button');
      btn.className = "elia-aba-btn";
      btn.textContent = name;
      Object.assign(btn.style, {
        border: "none", padding: "5px 15px",
        borderRadius: "17px", background: "#e7f6ee", color: "#128c7e",
        cursor: "pointer", fontWeight: "bold", fontSize: "14px"
      });
      btn.onclick = function () {
        lastEliaCatFilter = name;
        filterAndTagChats();
      };
      btn.oncontextmenu = function(ev) {
        ev.preventDefault();
        const novoNome = prompt("Renomear aba (em branco para excluir):", name);
        if (novoNome === null) return;
        if (novoNome.trim() === "") {
          eliaCategories.splice(idx, 1);
        } else {
          eliaCategories[idx] = novoNome.trim();
        }
        localStorage.setItem('eliaAbasCRM', JSON.stringify(eliaCategories));
        insertAbasCRM();
      };
      customTabs.appendChild(btn);
    });
    // Botão nova aba
    const addBtn = document.createElement('button');
    addBtn.textContent = "+";
    addBtn.title = "Adicionar nova aba";
    Object.assign(addBtn.style, {
      border: "none", background: "#eafff2", color: "#128c7e",
      fontWeight: "bold", borderRadius: "17px", padding: "5px 14px",
      cursor: "pointer", fontSize: "15px"
    });
    addBtn.onclick = function() {
      const novo = prompt("Nome da nova aba:");
      if (novo && novo.length > 1) {
        eliaCategories.push(novo.trim());
        localStorage.setItem('eliaAbasCRM', JSON.stringify(eliaCategories));
        insertAbasCRM();
      }
    };
    customTabs.appendChild(addBtn);
    let mainPanel = document.querySelector('[role="presentation"] [role="grid"]');
    if (mainPanel && mainPanel.parentNode) {
      mainPanel.parentNode.insertBefore(customTabs, mainPanel);
    } else {
      document.body.appendChild(customTabs); // fallback
    }
  }

  // ===== FILTRO / MARCAÇÃO DE CARDS CONVERSAS =====
  function filterAndTagChats() {
    // Pegue apenas cards da lista de conversas!
    let cards = Array.from(document.querySelectorAll('div[aria-rowindex][role="row"]'))
      .filter(card => card.closest('[role="grid"]'));
    cards.forEach(card => {
      if (!card.getAttribute('elia-cat-ready')) {
        card.setAttribute('elia-cat-ready', 'true');
        card.addEventListener('contextmenu', function(ev){
          ev.preventDefault(); ev.stopPropagation();
          let id = getCardId(card);
          showCategoryContextMenu(ev.pageX, ev.pageY, id, card);
        });
      }
      // Remove tags antigas antes de redesenhar
      let oldTags = card.querySelectorAll('.elia-cat-tag');
      oldTags.forEach(tag=>tag.remove());
      // Coloque tags das categorias associadas
      let id = getCardId(card);
      let tags = (eliaCatsMap[id] || []);
      if (tags.length > 0) {
        tags.forEach(cat => {
          const tag = document.createElement('span');
          tag.innerText = cat;
          tag.className = "elia-cat-tag";
          Object.assign(tag.style, {
            background: '#eafff2', color: "#129583", borderRadius: "10px",
            fontSize: "10px", padding: "2px 7px", margin: "0 2px", marginLeft:"5px"
          });
          let target = card.querySelector('span[dir="auto"]');
          if (target) target.parentNode.appendChild(tag);
        });
      }
    });
    // Filtro exibe/esconde dos cards (NÃO mexe na tela de mensagens!!)
    cards.forEach(card => {
      let id = getCardId(card);
      if (lastEliaCatFilter === "Tudo") {
        card.style.display = '';
      } else {
        let marcado = (eliaCatsMap[id] || []).includes(lastEliaCatFilter);
        card.style.display = marcado ? '' : 'none';
      }
    });
  }

  // ===== MENU CONTEXTO PARA MARCAR ABAS =====
  function showCategoryContextMenu(x, y, id, card) {
    let menu = document.getElementById('elia-catmenu');
    if (menu) menu.remove();
    menu = document.createElement('div');
    menu.id = 'elia-catmenu';
    Object.assign(menu.style,
      {position: 'fixed', left: x + 'px', top: y + 'px', background: '#fff',
       border: '1.2px solid #c5f5df', borderRadius: '7px', zIndex: 22222,
       boxShadow: '0 0 16px #88e8c977', padding: '8px', minWidth: '144px'});
    menu.innerHTML = "<b style='color:#099'>Marcar nesta aba:</b><br><br>";
    eliaCategories.filter(e=>e!=="Tudo").forEach(cat => {
      const opt = document.createElement('div');
      opt.innerText = cat;
      opt.style.cursor = 'pointer'; opt.style.padding = "3px 7px";
      opt.style.borderRadius = "6px";
      opt.onmouseenter = () => opt.style.background = "#e7f7ee";
      opt.onmouseleave = () => opt.style.background = "none";
      opt.onclick = () => {
        eliaCatsMap[id] = eliaCatsMap[id] || [];
        if (!eliaCatsMap[id].includes(cat)) eliaCatsMap[id].push(cat);
        localStorage.setItem('eliaCatsMap', JSON.stringify(eliaCatsMap));
        menu.remove();
        setTimeout(filterAndTagChats, 80);
      };
      menu.appendChild(opt);
    });
    // Desmarcar todas categorias
    const desmark = document.createElement('div');
    desmark.innerText = 'Desmarcar todas';
    desmark.style.color = "#c00"; desmark.style.cursor = "pointer";
    desmark.onclick = () => {
      eliaCatsMap[id] = [];
      localStorage.setItem('eliaCatsMap', JSON.stringify(eliaCatsMap));
      menu.remove();
      setTimeout(filterAndTagChats, 80);
    };
    menu.appendChild(document.createElement('hr')); menu.appendChild(desmark);
    document.body.appendChild(menu);
    setTimeout(()=>menu.focus(),50);
    setTimeout(()=>window.onclick=()=>menu.remove(),65);
  }

  // ==== BOTÃO "MELHORAR ELIA" (PROFISSIONAL) ====
  function getWppInputBox() {
    const selectors = [
      'div[contenteditable="true"][data-testid="conversation-compose-box-input"]',
      'div[contenteditable="true"][data-tab="10"]',
      'div[contenteditable="true"][role="textbox"]'
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) return element;
    }
    return null;
  }
  function cleanAndInsert(input, newText) {
    if (!input) return;
    input.innerHTML = '';
    input.textContent = '';
    input.focus();
    const textNode = document.createTextNode(newText);
    input.appendChild(textNode);
    setTimeout(() => {
      const events = [
        new InputEvent('input', { bubbles: true, inputType: 'insertText', data: newText })
      ];
      events.forEach(event => input.dispatchEvent(event));
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(input);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }, 50);
  }
  function addImproveButton() {
    if (document.getElementById('elia-improve-btn')) return;
    const textarea = getWppInputBox();
    if (!textarea) {
      setTimeout(addImproveButton, 900);
      return;
    }
    const btn = document.createElement('button');
    btn.id = "elia-improve-btn";
    btn.innerText = "✨ Melhorar ELIA";
    btn.title = "Melhore o texto antes de enviar";
    Object.assign(btn.style, {
      position: "fixed", right: "20px", bottom: "100px",
      background: "linear-gradient(135deg, #25d366, #128c7e)", color: "#fff",
      border: "none", padding: "12px 20px", borderRadius: "25px",
      boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)",
      cursor: "pointer", fontWeight: "600", fontSize: "14px", zIndex: "9999",
      fontFamily: "Segoe UI, Arial, sans-serif"
    });
    document.body.appendChild(btn);

    let isProcessingElia = false;
    btn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      if (isProcessingElia) return;
      isProcessingElia = true;
      const textarea = getWppInputBox();
      if (!textarea) {
        showMsg("❌ Não achei o campo de mensagem!"); isProcessingElia = false; return;
      }
      const textoOriginal = textarea.innerText?.trim() || textarea.textContent?.trim() || "";
      if (!textoOriginal) {
        showMsg("⚠️ Digite alguma mensagem."); textarea.focus(); isProcessingElia = false; return;
      }
      btn.disabled = true;
      btn.innerText = "⏳ IA processando...";
      btn.style.opacity = "0.7";
      btn.style.cursor = "wait";
      chrome.runtime.sendMessage(
        { action: "improveMessage", message: textoOriginal },
        (response) => {
          if (!response || response.error) {
            showMsg("❌ " + (response?.error ?? "Erro desconhecido!"));
          } else {
            cleanAndInsert(textarea, response.result); showMsg("✅ Melhorado!");
          }
          setTimeout(() => {
            btn.disabled = false;
            btn.innerText = "✨ Melhorar ELIA";
            btn.style.opacity = "1";
            btn.style.cursor = "pointer";
            isProcessingElia = false;
          }, 1100);
        }
      );
    });
    function showMsg(msg) {
      btn.innerText = msg;
      btn.style.background = msg.includes("✅") ?
        "linear-gradient(135deg, #00c851, #007e33)" :
        (msg.includes("❌") ? "linear-gradient(135deg, #ff4444, #cc0000)" :
          "linear-gradient(135deg, #25d366, #128c7e)");
    }
  }

  // ==== SPA observer, auto update on navigation ====
  function observeAndAutoInsert() {
    let lastHref = location.href;
    new MutationObserver(() => {
      if (location.href !== lastHref) {
        lastHref = location.href;
        setTimeout(() => {
          insertAbasCRM();
          addImproveButton();
        }, 900);
      }
    }).observe(document, { subtree: true, childList: true });
  }

  setTimeout(() => {
    hideWABar();
    createFakeSidebar();
    insertAbasCRM();
    addImproveButton();
    observeAndAutoInsert();
    setInterval(filterAndTagChats, 1400);
  }, 800);

})();