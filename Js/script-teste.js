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
const radioSim = document.getElementById('inRondaSim')
const radioNao = document.getElementById('inRondaNao')
const textarea = document.getElementById('inDescricao')
const solicitante = document.querySelector("#slcSolicitante")
const selectArea = document.querySelector("#slcArea")
const selectEtapa = document.querySelector("#slcEtapa")

let streamAtual = null
let fotoAtual = null
let cameraProfissional = null

// ============================================
// SISTEMA PROFISSIONAL DE CONTROLE DE CÂMERA
// ============================================

class CameraProfissional {
    constructor(videoElement) {
        this.video = videoElement;
        this.stream = null;
        this.track = null;
        this.cameras = [];
        this.suporta = {
            focusMode: false,
            focusDistance: false,
            zoom: false,
            torch: false,
            exposureMode: false
        };
    }

    // 1. DETECTA TUDO QUE A CÂMERA SUPORTA
    async detectarCapacidades() {
        if (!navigator.mediaDevices?.enumerateDevices) {
            console.warn('API enumerateDevices não suportada');
            return;
        }

        // Lista todas as câmeras
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.cameras = devices.filter(d => d.kind === 'videoinput');
        
        console.log(`📹 Total de câmeras: ${this.cameras.length}`);
        this.cameras.forEach((cam, i) => {
            console.log(`Câmera ${i + 1}: ${cam.label || 'Sem nome'}`);
        });
    }

    // 2. INICIA COM DETECÇÃO AUTOMÁTICA DE RECURSOS
    async iniciarCamera(usarCameraTraseira = true) {
        try {
            await this.detectarCapacidades();
            
            // Configuração progressiva com TODOS os parâmetros avançados
            const constraints = {
                video: {
                    facingMode: usarCameraTraseira ? 'environment' : 'user',
                    width: { ideal: 1920, max: 3840 },
                    height: { ideal: 1080, max: 2160 },
                    frameRate: { ideal: 30 },
                    advanced: [
                        // TENTATIVA 1: Modo macro explícito
                        { 
                            focusMode: 'macro',
                            exposureMode: 'continuous',
                            whiteBalanceMode: 'continuous'
                        },
                        // TENTATIVA 2: Foco manual próximo (força macro)
                        { 
                            focusMode: 'manual',
                            focusDistance: 0.1,
                            exposureMode: 'manual',
                            exposureTime: 10000
                        },
                        // TENTATIVA 3: Foco contínuo (fallback)
                        { 
                            focusMode: 'continuous',
                            exposureMode: 'continuous'
                        }
                    ]
                }
            };

            console.log('🎯 Aplicando constraints avançadas');
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            this.video.srcObject = this.stream;
            this.track = this.stream.getVideoTracks()[0];
            
            // Aguarda vídeo carregar
            await new Promise(resolve => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });
            
            // Verifica o que REALMENTE foi ativado
            const settings = this.track.getSettings();
            const capabilities = this.track.getCapabilities?.() || {};
            
            console.log('✅ Câmera ativada!');
            console.log('📷 Resolução:', settings.width, 'x', settings.height);
            console.log('🔍 FocusMode ATUAL:', settings.focusMode);
            console.log('🎯 FocusMode SUPORTADO:', capabilities.focusMode);
            console.log('🔬 Zoom SUPORTADO:', capabilities.zoom);
            
            // Salva o que realmente funciona
            this.suporta = {
                focusMode: !!capabilities.focusMode,
                focusDistance: !!capabilities.focusDistance,
                zoom: !!capabilities.zoom,
                torch: !!capabilities.torch,
                exposureMode: !!capabilities.exposureMode
            };
            
            // Tenta ativar modo macro automaticamente
            if (this.suporta.focusMode) {
                await this.ativarModoMacro();
            }
            
            return settings;
            
        } catch (error) {
            console.error('❌ Erro na câmera:', error);
            
            // FALLBACK: Tenta sem os advanced
            try {
                console.log('⚠️ Tentando fallback básico...');
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: usarCameraTraseira ? 'environment' : 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                this.video.srcObject = this.stream;
                this.track = this.stream.getVideoTracks()[0];
                await this.video.play();
                console.log('✅ Câmera iniciada em modo fallback');
            } catch (e) {
                throw new Error('Não foi possível acessar câmera');
            }
        }
    }

    // 3. ATIVAR MODO MACRO
    async ativarModoMacro() {
        if (!this.track) return false;
        
        try {
            // Tenta primeiro o modo macro nativo
            await this.track.applyConstraints({
                advanced: [{ focusMode: 'macro' }]
            });
            console.log('🔬 Modo macro ATIVADO!');
            return true;
        } catch (e) {
            try {
                // Tenta foco manual próximo
                await this.track.applyConstraints({
                    advanced: [{ 
                        focusMode: 'manual',
                        focusDistance: 0.1 
                    }]
                });
                console.log('🎯 Foco manual próximo ativado!');
                return true;
            } catch (e2) {
                console.log('⚠️ Modo macro não suportado neste dispositivo');
                return false;
            }
        }
    }

    // 4. AJUSTAR ZOOM
    async setZoom(fator) {
        if (!this.track || !this.suporta.zoom) return false;
        
        try {
            const capabilities = this.track.getCapabilities();
            const min = capabilities.zoom.min || 1;
            const max = capabilities.zoom.max || 5;
            
            // Limita o zoom dentro do range suportado
            const zoomValue = Math.min(Math.max(fator, min), max);
            
            await this.track.applyConstraints({
                advanced: [{ zoom: zoomValue }]
            });
            console.log(`🔍 Zoom ajustado para: ${zoomValue}x`);
            return true;
        } catch (e) {
            console.warn('Zoom não suportado');
            return false;
        }
    }

    // 5. CAPTURA COM ALTA QUALIDADE
    capturarFoto() {
        if (!this.video.videoWidth) return null;
        
        // Usa o canvas existente
        const ctx = canvas.getContext('2d', {
            alpha: false,
            desynchronized: true
        });
        
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        
        // Configura qualidade de renderização
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Desenha o frame atual
        ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
        
        // Retorna com qualidade máxima
        return canvas.toDataURL('image/jpeg', 0.95);
    }

    // 6. DESTRUIR
    destroy() {
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
            this.track = null;
        }
    }
}

// ============================================
// FUNÇÕES ORIGINAIS DO SISTEMA
// ============================================

function getHoraAtual() {
    const agora = new Date();
    return agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

// Texto específico para quando Ronda for "Sim"
const TEXTO_RONDA_SIM = `✅ *Inspeção técnica de infraestrutura:* Concluída a ronda operacional em todas as instalações sanitárias.
📋 *Checklist de verificação:*

- Louças: Condições de conservação e higiene.

- Acessos: Funcionamento de portas e trincos.

- Hidráulica: Sistemas de descarga e fluxo de água.
`

// Variável para guardar o texto personalizado
let textoPersonalizado = ''

// Adiciona eventos aos radios
radioSim.addEventListener('change', function () {
    if (this.checked) {
        textarea.value = textoPersonalizado || TEXTO_RONDA_SIM
        solicitante.selectedIndex = 1
        selectArea.selectedIndex = 8
        selectEtapa.selectedIndex = 3
        form.inLocal.value = "Banheiro"
        console.log('✅ Ronda: Sim')
    }
})

radioNao.addEventListener('change', function () {
    if (this.checked) {
        if (textarea.value.trim() !== '' && textarea.value !== TEXTO_RONDA_SIM) {
            textoPersonalizado = textarea.value
            console.log('Texto personalizado salvo')
        }
        textarea.value = ''
        solicitante.selectedIndex = 0;
        selectArea.selectedIndex = 0
        selectEtapa.selectedIndex = 0
        form.inLocal.value = ''
        console.log('❌ Ronda: Não')
    }
})

textarea.addEventListener('blur', function () {
    if (radioSim.checked && this.value !== TEXTO_RONDA_SIM) {
        textoPersonalizado = this.value
        console.log('Texto personalizado atualizado')
    }
})

// Verifica estado inicial
if (radioSim.checked) {
    textarea.value = TEXTO_RONDA_SIM
}

textarea.addEventListener('keydown', function (e) {
    if (radioSim.checked && this.value === TEXTO_RONDA_SIM) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            if (confirm('Deseja alterar para "Ronda: Não" para editar o texto livremente?')) {
                radioNao.checked = true
                textarea.value = ''
                textoPersonalizado = ''
            }
            e.preventDefault()
        }
    }
})

// ============================================
// EVENTOS DA CÂMERA MELHORADOS
// ============================================

camera.addEventListener("click", async () => {
    modal.classList.add("ativa")
    acoes.classList.remove("visivel")

    // Para a stream anterior se existir
    if (streamAtual) {
        streamAtual.getTracks().forEach(track => track.stop())
        streamAtual = null
    }

    try {
        // Inicializa o sistema profissional de câmera
        cameraProfissional = new CameraProfissional(video)
        await cameraProfissional.iniciarCamera(true)
        
        // Guarda a stream para compatibilidade
        streamAtual = cameraProfissional.stream

        // Cria botões de controle avançados
        criarControlesCamera()
        
        // Mostra video, esconde preview
        video.classList.remove("escondido")
        preview.classList.add("escondido")
        captura.classList.remove("escondido")
        
        console.log('📷 Sistema profissional de câmera ativado')
        
    } catch (error) {
        console.error('Erro ao acessar câmera:', error)
        alert('Não foi possível acessar a câmera. Verifique as permissões.')
    }
})

// Função para criar controles avançados da câmera
function criarControlesCamera() {
    // Remove controles existentes
    const controlesAntigos = document.querySelectorAll('.controle-camera')
    controlesAntigos.forEach(c => c.remove())
    
    // Container para controles
    const containerControles = document.createElement('div')
    containerControles.className = 'controle-camera'
    containerControles.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        gap: 10px;
        padding: 10px;
        z-index: 100;
    `
    
    // Botão Modo Macro
    if (cameraProfissional.suporta.focusMode) {
        const btnMacro = document.createElement('button')
        btnMacro.textContent = '🔬 Macro'
        btnMacro.style.cssText = `
            background: rgba(0,0,0,0.7);
            color: white;
            border: 1px solid white;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
        `
        btnMacro.onclick = async () => {
            await cameraProfissional.ativarModoMacro()
        }
        containerControles.appendChild(btnMacro)
    }
    
    // Botão Zoom In
    if (cameraProfissional.suporta.zoom) {
        const btnZoomIn = document.createElement('button')
        btnZoomIn.textContent = '🔍 Zoom +'
        btnZoomIn.style.cssText = `
            background: rgba(0,0,0,0.7);
            color: white;
            border: 1px solid white;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
        `
        let zoomAtual = 1.0
        btnZoomIn.onclick = async () => {
            zoomAtual = Math.min(zoomAtual + 0.5, 5.0)
            await cameraProfissional.setZoom(zoomAtual)
        }
        containerControles.appendChild(btnZoomIn)
        
        const btnZoomOut = document.createElement('button')
        btnZoomOut.textContent = '🔍 Zoom -'
        btnZoomOut.style.cssText = `
            background: rgba(0,0,0,0.7);
            color: white;
            border: 1px solid white;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
        `
        btnZoomOut.onclick = async () => {
            zoomAtual = Math.max(zoomAtual - 0.5, 1.0)
            await cameraProfissional.setZoom(zoomAtual)
        }
        containerControles.appendChild(btnZoomOut)
    }
    
    // Botão Alternar Câmera
    if (cameraProfissional.cameras.length > 1) {
        const btnAlternar = document.createElement('button')
        btnAlternar.textContent = '🔄 Trocar Câmera'
        btnAlternar.style.cssText = `
            background: rgba(0,0,0,0.7);
            color: white;
            border: 1px solid white;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
        `
        btnAlternar.onclick = async () => {
            // Encontra próxima câmera
            const settings = cameraProfissional.track?.getSettings()
            const currentIndex = cameraProfissional.cameras.findIndex(c => c.deviceId === settings?.deviceId)
            const nextIndex = (currentIndex + 1) % cameraProfissional.cameras.length
            const proximaCamera = cameraProfissional.cameras[nextIndex]
            
            if (proximaCamera) {
                // Para stream atual
                cameraProfissional.destroy()
                
                // Inicia com nova câmera
                cameraProfissional = new CameraProfissional(video)
                await cameraProfissional.iniciarCameraPorId(proximaCamera.deviceId)
                streamAtual = cameraProfissional.stream
                
                // Recria controles
                criarControlesCamera()
            }
        }
        containerControles.appendChild(btnAlternar)
    }
    
    modal.querySelector('.modal-content').appendChild(containerControles)
}

// Método adicional para iniciar com ID específico
CameraProfissional.prototype.iniciarCameraPorId = async function(deviceId) {
    try {
        this.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: { exact: deviceId },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        })
        this.video.srcObject = this.stream
        this.track = this.stream.getVideoTracks()[0]
        await this.video.play()
        
        const settings = this.track.getSettings()
        console.log('✅ Câmera alternada:', settings.deviceId)
        
    } catch (error) {
        console.error('Erro ao alternar câmera:', error)
    }
}

captura.addEventListener("click", () => {
    // Usa o sistema profissional se disponível
    if (cameraProfissional) {
        preview.src = cameraProfissional.capturarFoto()
    } else {
        // Fallback para o método antigo
        video.pause()
        const ctx = canvas.getContext("2d")
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        preview.src = canvas.toDataURL("image/jpeg", 0.95)
        video.play()
    }

    // Mostra os botões de ação
    acoes.classList.add("visivel")

    // Alterna visibilidade
    video.classList.add("escondido")
    preview.classList.remove("escondido")
    captura.classList.add("escondido")
    
    // Esconde controles avançados da câmera
    const controles = document.querySelectorAll('.controle-camera')
    controles.forEach(c => c.remove())

    console.log('📸 Foto capturada com alta qualidade')
})

refazer.addEventListener("click", () => {
    // Volta para a visualização da câmera
    acoes.classList.remove("visivel")
    video.classList.remove("escondido")
    preview.classList.add("escondido")
    captura.classList.remove("escondido")
    
    // Recria controles se necessário
    if (cameraProfissional) {
        criarControlesCamera()
    }
})

confirmar.addEventListener("click", () => {
    if (preview.src && !preview.src.includes('undefined')) {
        removerFotoAnterior()
        adicionarFoto(preview.src)
        fecharModal()
    } else {
        alert('Por favor, capture uma foto primeiro!')
    }
})

function fecharModal() {
    modal.classList.remove("ativa")
    acoes.classList.remove("visivel")

    // Para a stream
    if (cameraProfissional) {
        cameraProfissional.destroy()
        cameraProfissional = null
    }
    if (streamAtual) {
        streamAtual.getTracks().forEach(track => track.stop())
        streamAtual = null
    }
    
    // Remove controles
    const controles = document.querySelectorAll('.controle-camera')
    controles.forEach(c => c.remove())
}

function removerFotoAnterior() {
    const fotoExistente = fotoContainer.querySelector('.foto-preview')
    if (fotoExistente) {
        fotoExistente.remove()
    }
    fotoAtual = null
}

function adicionarFoto(src) {
    const semFoto = fotoContainer.querySelector('.sem-foto')
    if (semFoto) {
        semFoto.remove()
    }

    const fotoDiv = document.createElement('div')
    fotoDiv.className = 'foto-preview'

    const img = document.createElement('img')
    img.src = src
    img.alt = 'Foto capturada'

    const removerBtn = document.createElement('div')
    removerBtn.className = 'remover-foto'
    removerBtn.innerHTML = '×'
    removerBtn.title = 'Remover foto'

    removerBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        fotoDiv.remove()
        fotoAtual = null

        const semFotoDiv = document.createElement('div')
        semFotoDiv.className = 'sem-foto'
        semFotoDiv.textContent = 'Nenhuma foto tirada'
        fotoContainer.appendChild(semFotoDiv)
    })

    fotoDiv.appendChild(img)
    fotoDiv.appendChild(removerBtn)
    fotoContainer.appendChild(fotoDiv)

    fotoAtual = src

    fotoDiv.style.opacity = '0'
    fotoDiv.style.transform = 'scale(0.9)'

    setTimeout(() => {
        fotoDiv.style.transition = 'all 0.3s ease'
        fotoDiv.style.opacity = '1'
        fotoDiv.style.transform = 'scale(1)'
        console.log('✅ Foto adicionada ao formulário')
    }, 10)
}

// ============================================
// EVENTO DE ENVIO (mantido igual)
// ============================================

form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const etapa = document.getElementById('slcEtapa').value;

    if (!fotoAtual) {
        alert('Por favor, tire uma foto antes de enviar!');
        return;
    }

    if (etapa === 'antes') {
        const horaInicio = getHoraAtual();
        document.getElementById('horaInicio').value = horaInicio;
        console.log(`🕒 Hora início: ${horaInicio}`);
    }
    else if (etapa === 'depois') {
        const horaTermino = getHoraAtual();
        document.getElementById('horaTermino').value = horaTermino;
        console.log(`⏱️ Hora término: ${horaTermino}`);
    }

    const dados = coletarDadosFormulario();
    const textoWhatsApp = formatarParaWhatsApp(dados);

    await compartilharComFoto(textoWhatsApp);
});

// ============================================
// FUNÇÕES DE COMPARTILHAMENTO (mantidas iguais)
// ============================================

async function compartilharComFoto(texto) {
    try {
        const blob = await dataURLtoBlob(fotoAtual);
        const file = new File([blob], 'relatorio_foto.jpg', { type: 'image/jpeg' });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'Relatório de Serviço',
                text: texto,
                files: [file]
            });
            alert('✅ Relatório compartilhado com foto!');
        } else {
            if (navigator.share) {
                await navigator.share({
                    title: 'Relatório de Serviço',
                    text: texto + '\n\n📸 (A foto será enviada em seguida)'
                });
                alert('✅ Texto do relatório compartilhado!\n\nAgora compartilhe a foto abaixo:');
                mostrarFotoParaCompartilhar();
            } else {
                abrirWhatsAppComTextoEFoto(texto);
            }
        }
    } catch (error) {
        console.error('Erro ao compartilhar:', error);
        abrirWhatsAppComTextoEFoto(texto);
    }
}

function dataURLtoBlob(dataURL) {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
}

function mostrarFotoParaCompartilhar() {
    const link = document.createElement('a');
    link.href = fotoAtual;
    link.download = `relatorio_${new Date().getTime()}.jpg`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert('📸 Foto baixada!\n\nAgora no WhatsApp:\n1. Envie o texto que já está copiado\n2. Em seguida, anexe a foto que acabou de baixar');
}

function abrirWhatsAppComTextoEFoto(texto) {
    const textoCodificado = encodeURIComponent(texto + '\n\n📸 *FOTO ANEXADA*');

    const linkFoto = document.createElement('a');
    linkFoto.href = fotoAtual;
    linkFoto.download = 'foto_relatorio.jpg';
    linkFoto.click();

    setTimeout(() => {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            window.location.href = `whatsapp://send?text=${textoCodificado}`;
        } else {
            window.open(`https://web.whatsapp.com/send?text=${textoCodificado}`, '_blank');
            alert('📱 WhatsApp Web aberto!\n\n1. Envie o texto\n2. Anexe a foto "foto_relatorio.jpg"');
        }
    }, 1000);
}

function coletarDadosFormulario() {
    return {
        empresa: document.getElementById('inEmpresa').value,
        solicitante: document.getElementById('slcSolicitante').value,
        funcionario: document.getElementById('inFuncionario').value,
        etapa: document.getElementById('slcEtapa').value,
        area: document.getElementById('slcArea').value,
        local: document.getElementById('inLocal').value,
        descricao: document.getElementById('inDescricao').value,
        horaInicio: document.getElementById('horaInicio').value,
        horaTermino: document.getElementById('horaTermino').value,
        data: new Date().toLocaleDateString('pt-BR')
    };
}

function formatarParaWhatsApp(dados) {
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

    return `🔧 *RELATÓRIO DE SERVIÇO*
    
*ETAPA:* ${textoEtapa}

*EMPRESA:* ${dados.empresa}
*SOLICITANTE:* ${dados.solicitante}
*FUNCIONÁRIO:* ${dados.funcionario}
*ÁREA:* ${textoArea}
*LOCAL:* ${dados.local || 'Não especificado'}
*DESCRIÇÃO:*
${dados.descricao || 'Sem descrição'}

${dados.horaInicio ? `*HORA INÍCIO:* ${dados.horaInicio}` : ''}
${dados.horaTermino ? `*HORA TÉRMINO:* ${dados.horaTermino}` : ''}
*DATA:* ${dados.data}



✅ *STATUS:* ${dados.etapa === 'depois' ? 'CONCLUÍDO' : 'EM ANDAMENTO'}`;
}