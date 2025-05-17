document.addEventListener('DOMContentLoaded', () => {
    // Constantes
    const API_URL = 'http://localhost:3000/api'; // URL do servidor Node.js
    const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB em bytes
    const MAX_TOTAL_STORAGE = 999 * 1024 * 1024 * 1024; // 999GB em bytes
    
    // Elementos DOM
    const uploadForm = document.getElementById('uploadForm');
    const videoFile = document.getElementById('videoFile');
    const fileInfo = document.getElementById('fileInfo');
    const uploadButton = document.getElementById('uploadButton');
    const progressBar = document.getElementById('progressBar');
    const usedSpaceElement = document.getElementById('usedSpace');
    const availableSpaceElement = document.getElementById('availableSpace');
    const messagesContainer = document.getElementById('messages');
    const videoListElement = document.getElementById('videoList');
    
    // Variáveis para rastrear os dados de armazenamento
    let totalUsedSpace = 0;
    
    // Função para formatar tamanho em bytes para uma string legível
    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    // Função para mostrar mensagens
    const showMessage = (message, type) => {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', type);
        messageElement.textContent = message;
        
        messagesContainer.innerHTML = '';
        messagesContainer.appendChild(messageElement);
        
        // Remove a mensagem após 5 segundos se não for a mensagem sobre limitação
        if (!message.includes('Nota:')) {
            setTimeout(() => {
                messageElement.remove();
            }, 5000);
        }
    };
    
    // Função para atualizar as estatísticas de armazenamento
    const updateStorageStats = (usedSpace) => {
        totalUsedSpace = usedSpace || totalUsedSpace;
        usedSpaceElement.textContent = formatSize(totalUsedSpace);
        availableSpaceElement.textContent = formatSize(MAX_TOTAL_STORAGE - totalUsedSpace);
        
        if (totalUsedSpace >= MAX_TOTAL_STORAGE) {
            showMessage('Limite de armazenamento atingido (999GB). Não é possível fazer mais uploads.', 'error');
            uploadButton.disabled = true;
        } else {
            uploadButton.disabled = false;
        }
    };
    
    // Função para carregar a lista de vídeos do servidor
    const loadVideoList = async () => {
        try {
            const response = await fetch(`${API_URL}/videos`);
            const data = await response.json();
            
            if (data.success) {
                totalUsedSpace = data.totalSize || 0;
                updateStorageStats(totalUsedSpace);
                
                if (data.videos && data.videos.length > 0) {
                    videoListElement.innerHTML = '';
                    
                    data.videos.forEach(video => {
                        const li = document.createElement('li');
                        
                        const videoInfo = document.createElement('div');
                        videoInfo.classList.add('video-info');
                        
                        const videoName = document.createElement('div');
                        videoName.classList.add('video-name');
                        videoName.textContent = video.name;
                        
                        const videoSize = document.createElement('div');
                        videoSize.classList.add('video-size');
                        videoSize.textContent = formatSize(video.size);
                        
                        const videoDate = document.createElement('div');
                        videoDate.classList.add('video-size');
                        videoDate.textContent = new Date(video.time).toLocaleDateString() + ' ' + 
                                               new Date(video.time).toLocaleTimeString();
                        
                        videoInfo.appendChild(videoName);
                        videoInfo.appendChild(videoSize);
                        videoInfo.appendChild(videoDate);
                        
                        const videoActions = document.createElement('div');
                        videoActions.classList.add('video-actions');
                        
                        const viewButton = document.createElement('button');
                        viewButton.textContent = 'Visualizar';
                        viewButton.addEventListener('click', () => {
                            window.open(video.url, '_blank');
                        });
                        videoActions.appendChild(viewButton);
                        
                        const deleteButton = document.createElement('button');
                        deleteButton.textContent = 'Excluir';
                        deleteButton.style.backgroundColor = 'var(--error-color)';
                        deleteButton.addEventListener('click', async () => {
                            if (confirm(`Tem certeza que deseja excluir o vídeo "${video.name}"?`)) {
                                try {
                                    const deleteResponse = await fetch(`${API_URL}/videos/${video.name}`, {
                                        method: 'DELETE'
                                    });
                                    
                                    const deleteData = await deleteResponse.json();
                                    
                                    if (deleteData.success) {
                                        showMessage('Vídeo excluído com sucesso!', 'success');
                                        loadVideoList(); // Recarrega a lista
                                    } else {
                                        showMessage(`Erro ao excluir vídeo: ${deleteData.error}`, 'error');
                                    }
                                } catch (error) {
                                    showMessage('Erro ao comunicar com o servidor', 'error');
                                    console.error(error);
                                }
                            }
                        });
                        
                        videoActions.appendChild(deleteButton);
                        
                        li.appendChild(videoInfo);
                        li.appendChild(videoActions);
                        
                        videoListElement.appendChild(li);
                    });
                } else {
                    videoListElement.innerHTML = '<li class="loading">Nenhum vídeo encontrado</li>';
                }
            } else {
                throw new Error(data.error || 'Erro ao carregar a lista de vídeos');
            }
        } catch (error) {
            console.error('Erro ao carregar a lista de vídeos:', error);
            videoListElement.innerHTML = '<li class="loading">Erro ao carregar vídeos</li>';
            showMessage('Não foi possível carregar a lista de vídeos. Verifique se o servidor está funcionando.', 'error');
        }
    };
    
    // Inicializa a página carregando a lista de vídeos
    loadVideoList();
    
    // Evento para quando o usuário seleciona um arquivo
    videoFile.addEventListener('change', () => {
        if (videoFile.files.length > 0) {
            const file = videoFile.files[0];
            
            // Verifica se o arquivo é realmente um vídeo
            if (!file.type.startsWith('video/')) {
                showMessage('Por favor, selecione apenas arquivos de vídeo', 'error');
                videoFile.value = '';
                fileInfo.textContent = 'Nenhum arquivo selecionado';
                return;
            }
            
            // Verifica o tamanho do arquivo
            if (file.size > MAX_FILE_SIZE) {
                showMessage(`O tamanho do arquivo excede o limite de ${formatSize(MAX_FILE_SIZE)}`, 'error');
                videoFile.value = '';
                fileInfo.textContent = 'Nenhum arquivo selecionado';
                return;
            }
            
            // Verifica se há espaço suficiente
            if (totalUsedSpace + file.size > MAX_TOTAL_STORAGE) {
                showMessage('Espaço de armazenamento insuficiente', 'error');
                videoFile.value = '';
                fileInfo.textContent = 'Nenhum arquivo selecionado';
                return;
            }
            
            // Atualiza a informação do arquivo
            fileInfo.textContent = `${file.name} (${formatSize(file.size)})`;
        } else {
            fileInfo.textContent = 'Nenhum arquivo selecionado';
        }
    });
    
    // Manipula o envio do formulário
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!videoFile.files.length) {
            showMessage('Por favor, selecione um arquivo para enviar', 'error');
            return;
        }
        
        const file = videoFile.files[0];
        
        // Verifica novamente o tamanho e o tipo
        if (file.size > MAX_FILE_SIZE || !file.type.startsWith('video/')) {
            showMessage('Arquivo inválido ou muito grande', 'error');
            return;
        }
        
        // Prepara os dados para envio
        const formData = new FormData();
        formData.append('videoFile', file);
        
        // Desativa o botão e mostra progresso
        uploadButton.disabled = true;
        uploadButton.textContent = 'Enviando...';
        
        try {
            const xhr = new XMLHttpRequest();
            
            // Configura o progresso do upload
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    progressBar.style.width = percentComplete + '%';
                }
            });
            
            // Configura o evento de conclusão
            xhr.onload = function() {
                uploadButton.disabled = false;
                uploadButton.textContent = 'Enviar Vídeo';
                
                try {
                    const response = JSON.parse(xhr.responseText);
                    
                    if (response.success) {
                        showMessage('Upload realizado com sucesso!', 'success');
                        videoFile.value = '';
                        fileInfo.textContent = 'Nenhum arquivo selecionado';
                        progressBar.style.width = '0';
                        
                        // Recarrega a lista de vídeos
                        loadVideoList();
                    } else {
                        showMessage(`Erro: ${response.error}`, 'error');
                    }
                } catch (error) {
                    showMessage('Erro ao processar resposta do servidor', 'error');
                    console.error(error);
                }
            };
            
            // Configura evento de erro
            xhr.onerror = function() {
                uploadButton.disabled = false;
                uploadButton.textContent = 'Enviar Vídeo';
                showMessage('Erro na comunicação com o servidor', 'error');
                progressBar.style.width = '0';
            };
            
            // Envia o arquivo
            xhr.open('POST', `${API_URL}/upload`, true);
            xhr.send(formData);
            
        } catch (error) {
            uploadButton.disabled = false;
            uploadButton.textContent = 'Enviar Vídeo';
            showMessage('Erro ao enviar o arquivo', 'error');
            console.error(error);
        }
    });
}); 