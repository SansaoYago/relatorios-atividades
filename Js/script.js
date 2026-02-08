const form = document.querySelector("form")
const camera = document.querySelector(".foto")
const modal = document.querySelector(".modal")
const video = document.querySelector("video")
const canvas = document.querySelector("canvas")
const captura = document.querySelector("#captura")
const confirmar = document.getElementById("confirmar")
const refazer = document.getElementById("refazer")
const preview = document.getElementById("preview")
const acoes = document.querySelector(".acoes")
const fotoContainer = document.getElementById('foto-container')

let streamAtual = null
let fotoAtual = null

function getHoraAtual() {
    const agora = new Date();
    return agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

camera.addEventListener("click", () => {
    modal.classList.add("ativa")
    acoes.classList.remove("visivel") // Esconde botões de ação

    // Para a stream anterior se existir
    if (streamAtual) {
        streamAtual.getTracks().forEach(track => track.stop())
    }

    navigator.mediaDevices.getUserMedia({
        video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    }).then(stream => {
        streamAtual = stream
        video.srcObject = stream

        // Mostra video, esconde preview
        video.classList.remove("escondido")
        preview.classList.add("escondido")
        captura.classList.remove("escondido")

        console.log('Câmera ativada')
    }).catch(error => {
        console.error('Erro ao acessar câmera:', error)
        alert('Não foi possível acessar a câmera. Verifique as permissões.')
    })
})

captura.addEventListener("click", () => {
    // Pausa o vídeo temporariamente para capturar
    video.pause()

    const ctx = canvas.getContext("2d")

    // Configura o canvas
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Desenha o frame atual
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Converte para data URL
    preview.src = canvas.toDataURL("image/jpeg", 0.8)

    // Mostra os botões de ação
    acoes.classList.add("visivel")

    // Alterna visibilidade
    video.classList.add("escondido")
    preview.classList.remove("escondido")
    captura.classList.add("escondido")

    // Retoma o vídeo
    video.play()

    console.log('Foto capturada. Preview src definido:', preview.src.substring(0, 50) + '...')
})

refazer.addEventListener("click", () => {
    // Volta para a visualização da câmera
    acoes.classList.remove("visivel")
    video.classList.remove("escondido")
    preview.classList.add("escondido")
    captura.classList.remove("escondido")
})

confirmar.addEventListener("click", () => {
    // Verifica se há uma foto válida
    if (preview.src && !preview.src.includes('undefined')) {
        // Remove foto anterior
        removerFotoAnterior()

        // Adiciona nova foto
        adicionarFoto(preview.src)

        // Fecha modal
        fecharModal()
    } else {
        alert('Por favor, capture uma foto primeiro!')
    }
})

function fecharModal() {
    modal.classList.remove("ativa")
    acoes.classList.remove("visivel")

    // Para a stream
    if (streamAtual) {
        streamAtual.getTracks().forEach(track => track.stop())
        streamAtual = null
    }
}

function removerFotoAnterior() {
    const fotoExistente = fotoContainer.querySelector('.foto-preview')
    if (fotoExistente) {
        fotoExistente.remove()
    }
    fotoAtual = null
}

function adicionarFoto(src) {
    // Remove mensagem "sem foto"
    const semFoto = fotoContainer.querySelector('.sem-foto')
    if (semFoto) {
        semFoto.remove()
    }

    // Cria elementos
    const fotoDiv = document.createElement('div')
    fotoDiv.className = 'foto-preview'

    const img = document.createElement('img')
    img.src = src
    img.alt = 'Foto capturada'

    const removerBtn = document.createElement('div')
    removerBtn.className = 'remover-foto'
    removerBtn.innerHTML = '×'
    removerBtn.title = 'Remover foto'

    // Evento para remover
    removerBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        fotoDiv.remove()
        fotoAtual = null

        // Recria mensagem "sem foto"
        const semFotoDiv = document.createElement('div')
        semFotoDiv.className = 'sem-foto'
        semFotoDiv.textContent = 'Nenhuma foto tirada'
        fotoContainer.appendChild(semFotoDiv)
    })

    // Monta estrutura
    fotoDiv.appendChild(img)
    fotoDiv.appendChild(removerBtn)
    fotoContainer.appendChild(fotoDiv)

    // Armazena foto
    fotoAtual = src

    // Animação
    fotoDiv.style.opacity = '0'
    fotoDiv.style.transform = 'scale(0.9)'

    setTimeout(() => {
        fotoDiv.style.transition = 'all 0.3s ease'
        fotoDiv.style.opacity = '1'
        fotoDiv.style.transform = 'scale(1)'

        console.log('Foto adicionada ao formulário')
    }, 10)
}

// Evento de envio
// MODIFIQUE APENAS O EVENTO DE SUBMIT E A FUNÇÃO mostrarDadosParaWhatsApp:

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const etapa = document.getElementById('slcEtapa').value;
    
    // Validação básica
    if (!fotoAtual) {
        alert('Por favor, tire uma foto antes de enviar!');
        return;
    }
    
    // Lógica de captura de horários
    if (etapa === 'antes') {
        const horaInicio = getHoraAtual();
        document.getElementById('horaInicio').value = horaInicio;
        console.log(`🕒 Hora início capturada: ${horaInicio}`);
    } 
    else if (etapa === 'depois') {
        const horaTermino = getHoraAtual();
        document.getElementById('horaTermino').value = horaTermino;
        console.log(`⏱️ Hora término capturada: ${horaTermino}`);
    }
    
    // Gera o relatório
    const dados = coletarDadosFormulario();
    const textoWhatsApp = formatarParaWhatsApp(dados);
    
    // Tenta usar Web Share API (funciona em mobile e desktop modernos)
    if (navigator.share) {
        try {
            await navigator.share({
                title: `Relatório de Serviço - ${dados.etapa.toUpperCase()}`,
                text: textoWhatsApp,
                url: window.location.href // Opcional: link para o sistema
            });
            console.log('✅ Conteúdo compartilhado com sucesso!');
            alert('✅ Relatório compartilhado! Verifique o WhatsApp.');
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Erro ao compartilhar:', error);
                // Fallback: copiar para clipboard
                copiarParaClipboard(textoWhatsApp);
            }
        }
    } else {
        // Fallback para navegadores sem suporte a navigator.share
        copiarParaClipboard(textoWhatsApp);
    }
});

// NOVA FUNÇÃO: Gera e copia o relatório
function gerarECopiarRelatorio() {
    const dados = coletarDadosFormulario();
    const textoWhatsApp = formatarParaWhatsApp(dados);

    // Copia para área de transferência
    navigator.clipboard.writeText(textoWhatsApp)
        .then(() => {
            // Mostra o relatório na tela para o usuário ver
            mostrarRelatorioNaTela(textoWhatsApp);

            alert('📋 RELATÓRIO COPIADO!\n\nO texto foi copiado para sua área de transferência.\n\nAgora vá no WhatsApp e COLE no grupo!');
        })
        .catch(err => {
            console.error('Erro ao copiar:', err);
            // Fallback: mostra na tela para copiar manualmente
            mostrarRelatorioNaTela(textoWhatsApp);
            alert('📋 RELATÓRIO PRONTO!\n\nSelecione e copie o texto abaixo:\n\n' + textoWhatsApp.substring(0, 200) + '...');
        });
}

// FUNÇÃO PARA COLETAR TODOS OS DADOS
function coletarDadosFormulario() {
    return {
        empresa: document.getElementById('inEmpresa').value,
        solicitante: document.getElementById('inSolicitante').value,
        funcionario: document.getElementById('inFuncionario').value,
        etapa: document.getElementById('slcEtapa').value,
        area: document.getElementById('slcLocal').value,
        local: document.getElementById('inLocal').value,
        descricao: document.getElementById('inDescricao').value,
        horaInicio: document.getElementById('horaInicio').value,
        horaTermino: document.getElementById('horaTermino').value,
        data: new Date().toLocaleDateString('pt-BR')
    };
}

// FUNÇÃO PARA MOSTRAR NA TELA (opcional)
function mostrarRelatorioNaTela(texto) {
    // Cria ou atualiza um elemento para mostrar o relatório
    let relatorioDiv = document.getElementById('relatorio-gerado');

    if (!relatorioDiv) {
        relatorioDiv = document.createElement('div');
        relatorioDiv.id = 'relatorio-gerado';
        relatorioDiv.style.margin = '20px 0';
        relatorioDiv.style.padding = '15px';
        relatorioDiv.style.backgroundColor = '#f0f0f0';
        relatorioDiv.style.borderRadius = '5px';
        relatorioDiv.style.whiteSpace = 'pre-wrap';
        relatorioDiv.style.fontFamily = 'monospace';
        relatorioDiv.style.maxHeight = '300px';
        relatorioDiv.style.overflow = 'auto';
        document.querySelector('form').appendChild(relatorioDiv);
    }

    relatorioDiv.textContent = texto;
    relatorioDiv.innerHTML = texto.replace(/\n/g, '<br>').replace(/\*/g, '<strong>').replace(/\*/g, '</strong>');
}

// FUNÇÃO PARA CALCULAR TEMPO TOTAL (apenas para etapa "depois")
function calcularTempoTotal(inicio, termino) {
    if (!inicio || !termino) return '--:--';

    // Converte "HH:MM" para minutos
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = termino.split(':').map(Number);

    const totalMinutos = (h2 * 60 + m2) - (h1 * 60 + m1);
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;

    return `${horas}h${minutos.toString().padStart(2, '0')}min`;
}

function mostrarDadosParaWhatsApp() {
    const dados = {
        empresa: document.getElementById('inEmpresa').value,
        solicitante: document.getElementById('inSolicitante').value, // CORRIGIDO
        funcionario: document.getElementById('inFuncionario').value,
        etapa: document.getElementById('slcEtapa').value,
        area: document.getElementById('slcLocal').value,
        local: document.getElementById('inLocal').value,
        descricao: document.getElementById('inDescricao').value,
        horaInicio: document.getElementById('horaInicio').value,
        horaTermino: document.getElementById('horaTermino').value,
        data: new Date().toLocaleDateString('pt-BR')
    };

    const textoFormatado = formatarParaWhatsApp(dados);
    console.log('📱 TEXTO PARA WHATSAPP:');
    console.log(textoFormatado);
    console.log('----------------------');
}

function formatarParaWhatsApp(dados) {
    // Converte valores do select para textos amigáveis
    const textoEtapa = {
        'antes': 'ANTES',
        'durante': 'DURANTE',
        'depois': 'DEPOIS'
    }[dados.etapa] || dados.etapa;

    const textoArea = {
        'terreo': 'Térreo',
        'pav1': '1° Pavimento',
        'pav2': '2° Pavimento',
        'pav3': '3° Pavimento',
        'pav4': '4° Pavimento',
        'pav5': '5° Pavimento',
        'externa': 'Área Externa',
        'telhado': 'Telhado'
    }[dados.area] || dados.area;

    return `🔧 *RELATÓRIO DE SERVIÇO - ${textoEtapa}*

🏢 *EMPRESA:* ${dados.empresa}
👤 *SOLICITANTE:* ${dados.solicitante}
👷 *FUNCIONÁRIO:* ${dados.funcionario}
📋 *ETAPA:* ${textoEtapa}
📍 *ÁREA:* ${textoArea}
🏠 *LOCAL:* ${dados.local || 'Não especificado'}
${dados.horaInicio ? `🕒 *HORA INÍCIO:* ${dados.horaInicio}` : ''}
${dados.horaTermino ? `⏱️ *HORA TÉRMINO:* ${dados.horaTermino}` : ''}
📅 *DATA:* ${dados.data}

📝 *DESCRIÇÃO:*
${dados.descricao || 'Sem descrição'}

✅ *STATUS:* ${dados.etapa === 'depois' ? 'CONCLUÍDO' : 'EM ANDAMENTO'}`;
}