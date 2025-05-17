document.addEventListener('DOMContentLoaded', function() {
    // Elementos do DOM
    const uploadForm = document.getElementById('uploadForm');
    const videoFileInput = document.getElementById('videoFile');
    const selectedFileText = document.getElementById('selectedFile');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const messageContainer = document.getElementById('messageContainer');
    const messageText = document.getElementById('messageText');
    const closeMessageBtn = document.getElementById('closeMessage');
    const storageUsedElement = document.getElementById('storageUsed');
    const usedStorageText = document.getElementById('usedStorage');
    const phpStatusElement = document.getElementById('phpStatus');
    const troubleshootingElement = document.getElementById('troubleshooting');
    const submitButton = document.getElementById('submitBtn');

    // Constantes
    const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB em bytes
    const MAX_TOTAL_STORAGE = 999 * 1024 * 1024 * 1024; // 999GB em bytes

    // Verificar se o PHP está funcionando corretamente
    checkPHPStatus();

    // Event listeners
    videoFileInput.addEventListener('change', handleFileSelect);
    uploadForm.addEventListener('submit', handleSubmit);
    closeMessageBtn.addEventListener('click', closeMessage);

    // Função para verificar se o PHP está funcionando
    function checkPHPStatus() {
        // Por padrão, desabilitar o botão até termos certeza de que o PHP está funcionando
        submitButton.disabled = true;
        
        fetch('simple_test.php', {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Resposta do servidor não foi ok: ' + response.status);
            }
            
            // Verificar o tipo de conteúdo
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Resposta não é JSON válido');
            }
            
            return response.json();
        })
        .then(data => {
            phpStatusElement.innerHTML = `<span class="status-icon">✅</span> PHP ${data.server_info.php_version} está funcionando!`;
            phpStatusElement.classList.add('success');
            submitButton.disabled = false;
            troubleshootingElement.classList.add('hidden');
            
            // Agora podemos carregar as informações de armazenamento
            fetchStorageInfo();
        })
        .catch(error => {
            console.error('Erro ao verificar status do PHP:', error);
            phpStatusElement.innerHTML = `<span class="status-icon">❌</span> PHP não está funcionando corretamente`;
            phpStatusElement.classList.add('error');
            submitButton.disabled = true;
            troubleshootingElement.classList.remove('hidden');
            
            showMessage('O servidor PHP não está respondendo corretamente. O upload não funcionará até que este problema seja resolvido.', 'error');
        });
    }

    // Função para buscar informações de armazenamento
    function fetchStorageInfo() {
        fetch('upload.php?action=getStorageInfo', {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Resposta de rede não foi ok: ' + response.status);
            }
            
            // Verificar o tipo de conteúdo
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Resposta não é JSON válido');
            }
            
            return response.json();
        })
        .then(data => {
            const usedGB = (data.used / (1024 * 1024 * 1024)).toFixed(2);
            const usedPercentage = (data.used / MAX_TOTAL_STORAGE) * 100;
            
            usedStorageText.textContent = usedGB;
            storageUsedElement.style.width = `${usedPercentage}%`;

            // Mudar cor da barra conforme o uso
            if (usedPercentage > 90) {
                storageUsedElement.style.backgroundColor = 'var(--error-color)';
            } else if (usedPercentage > 70) {
                storageUsedElement.style.backgroundColor = 'orange';
            }
        })
        .catch(error => {
            console.error('Erro ao buscar informações de armazenamento:', error);
            showMessage('Não foi possível carregar informações de armazenamento. Recarregue a página.', 'error');
        });
    }

    // Função para lidar com a seleção de arquivo
    function handleFileSelect(e) {
        const file = e.target.files[0];
        
        if (file) {
            // Exibir nome do arquivo selecionado
            selectedFileText.textContent = `${file.name} (${formatFileSize(file.size)})`;
            
            // Validar tamanho do arquivo
            if (file.size > MAX_FILE_SIZE) {
                showMessage(`Erro: O arquivo excede o limite de 3GB. Tamanho atual: ${formatFileSize(file.size)}`, 'error');
                e.target.value = ''; // Limpar seleção
                selectedFileText.textContent = 'Nenhum arquivo selecionado';
            }
        } else {
            selectedFileText.textContent = 'Nenhum arquivo selecionado';
        }
    }

    // Função para lidar com o envio do formulário
    function handleSubmit(e) {
        e.preventDefault();
        
        const file = videoFileInput.files[0];
        
        if (!file) {
            showMessage('Por favor, selecione um arquivo para enviar.', 'error');
            return;
        }
        
        // Validar novamente o tamanho do arquivo
        if (file.size > MAX_FILE_SIZE) {
            showMessage(`Erro: O arquivo excede o limite de 3GB. Tamanho atual: ${formatFileSize(file.size)}`, 'error');
            return;
        }
        
        // Mostrar mensagem sobre o início do upload
        showMessage('Iniciando upload do vídeo, isso pode levar algum tempo para arquivos grandes...', 'success');
        
        // Preparar formulário para envio
        const formData = new FormData();
        formData.append('videoFile', file);
        
        // Configurar e mostrar barra de progresso
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        
        // Enviar arquivo
        const xhr = new XMLHttpRequest();
        
        // Configurar um timeout maior para uploads grandes (10 minutos)
        xhr.timeout = 600000; // 10 minutos em milissegundos
        
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = percentComplete + '%';
                progressText.textContent = percentComplete + '%';
                
                // Se chegar a 100%, mostrar mensagem de processamento
                if (percentComplete === 100) {
                    showMessage('Upload concluído! Processando o arquivo...', 'success');
                }
            }
        });
        
        xhr.addEventListener('load', function() {
            let response;
            
            try {
                if (xhr.responseText.trim().startsWith('<?php')) {
                    // O PHP não está sendo processado, está sendo enviado como texto
                    throw new Error('O servidor não está processando arquivos PHP corretamente');
                }
                
                response = JSON.parse(xhr.responseText);
            } catch (error) {
                console.error('Erro ao analisar resposta:', error, xhr.responseText);
                showMessage('Erro ao processar resposta do servidor. O PHP pode não estar configurado corretamente.', 'error');
                troubleshootingElement.classList.remove('hidden');
                return;
            }
            
            if (xhr.status === 200 && response.success) {
                showMessage(response.message, 'success');
                // Limpar formulário
                uploadForm.reset();
                selectedFileText.textContent = 'Nenhum arquivo selecionado';
                // Atualizar informações de armazenamento
                fetchStorageInfo();
            } else {
                showMessage(response.message || 'Erro no upload do arquivo.', 'error');
            }
            
            // Esconder barra de progresso depois de um tempo
            setTimeout(() => {
                progressContainer.classList.add('hidden');
            }, 1500);
        });
        
        xhr.addEventListener('error', function(e) {
            console.error('Erro de conexão:', e);
            showMessage('Erro na conexão com o servidor. Verifique sua conexão de internet ou contate o administrador.', 'error');
            troubleshootingElement.classList.remove('hidden');
            progressContainer.classList.add('hidden');
        });
        
        xhr.addEventListener('timeout', function() {
            console.error('Timeout de conexão');
            showMessage('Tempo limite excedido. O arquivo pode ser muito grande para sua conexão atual.', 'error');
            progressContainer.classList.add('hidden');
        });
        
        xhr.addEventListener('abort', function() {
            showMessage('Upload cancelado.', 'error');
            progressContainer.classList.add('hidden');
        });
        
        xhr.open('POST', 'upload.php');
        xhr.send(formData);
    }

    // Função para exibir mensagens
    function showMessage(msg, type) {
        messageText.textContent = msg;
        messageContainer.classList.remove('hidden', 'success', 'error');
        messageContainer.classList.add(type);
        messageContainer.classList.remove('hidden');
        
        // Auto-esconder após 8 segundos (mais tempo para mensagens importantes)
        setTimeout(() => {
            closeMessage();
        }, 8000);
    }
    
    // Função para fechar mensagem
    function closeMessage() {
        messageContainer.classList.add('hidden');
    }
    
    // Função para formatar tamanho do arquivo
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}); 