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
form.addEventListener('submit', function(e) {
    e.preventDefault() // Para teste, remova em produção
    
    if (!fotoAtual) {
        alert('Por favor, tire uma foto antes de enviar!')
        return
    }

    console.log('Enviando formulário com foto...')
    console.log('Dados:')
    console.log('Etapa:', document.getElementById('slcEtapa').value)
    console.log('Local:', document.getElementById('slcLocal').value)
    console.log('Empresa:', document.getElementById('inEmpresa').value)
    console.log('Solicitante:', document.getElementById('inSolicitante').value)
    console.log('Funcionário:', document.getElementById('inFuncionario').value)
    console.log('Descrição:', document.getElementById('inDescricao').value)
    console.log('Foto (primeiros 100 chars):', fotoAtual.substring(0, 100) + '...')
    
    // Aqui você faria o envio real ao servidor
    alert('Formulário enviado com sucesso! (modo teste)')
})