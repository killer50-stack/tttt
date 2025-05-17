<?php
// Aumentar limites de PHP para uploads grandes
ini_set('upload_max_filesize', '3G');
ini_set('post_max_size', '3G');
ini_set('max_execution_time', '300');
ini_set('max_input_time', '300');
ini_set('memory_limit', '512M');

// Configurações
$uploadsDir = 'uploads';
$maxFileSize = 3 * 1024 * 1024 * 1024; // 3GB em bytes
$maxTotalStorage = 999 * 1024 * 1024 * 1024; // 999GB em bytes

// Headers para permitir requisições AJAX e CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Log de depuração
error_log("Requisição recebida em upload.php: " . $_SERVER['REQUEST_METHOD']);

// Criar diretório de uploads se não existir
if (!file_exists($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
    error_log("Diretório de uploads criado");
} else {
    error_log("Diretório de uploads já existe");
}

// Verificar permissões
if (!is_writable($uploadsDir)) {
    error_log("ERRO: Diretório de uploads não tem permissão de escrita");
    echo json_encode([
        'success' => false,
        'message' => 'Erro: O servidor não tem permissão para escrever na pasta de uploads.'
    ]);
    exit;
}

// Função para obter informações de armazenamento
function getStorageInfo() {
    global $uploadsDir;
    
    $totalSize = 0;
    
    // Verificar se o diretório existe
    if (file_exists($uploadsDir)) {
        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($uploadsDir, RecursiveDirectoryIterator::SKIP_DOTS)
        );
        
        foreach ($iterator as $file) {
            $totalSize += $file->getSize();
        }
    }
    
    return [
        'success' => true,
        'used' => $totalSize
    ];
}

// Responder à solicitação de informações de armazenamento
if (isset($_GET['action']) && $_GET['action'] === 'getStorageInfo') {
    error_log("Solicitação de informações de armazenamento");
    echo json_encode(getStorageInfo());
    exit;
}

// Processar upload de arquivo
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    error_log("Iniciando processamento de upload");
    
    // Verificar se há arquivo para upload
    if (!isset($_FILES['videoFile']) || $_FILES['videoFile']['error'] === UPLOAD_ERR_NO_FILE) {
        error_log("Erro: Nenhum arquivo enviado");
        echo json_encode([
            'success' => false,
            'message' => 'Nenhum arquivo enviado.'
        ]);
        exit;
    }
    
    $file = $_FILES['videoFile'];
    error_log("Arquivo recebido: " . $file['name'] . " - Tamanho: " . $file['size'] . " bytes");
    
    $fileSize = $file['size'];
    $fileName = basename($file['name']);
    $targetFilePath = $uploadsDir . '/' . $fileName;
    
    // Validar tamanho do arquivo
    if ($fileSize > $maxFileSize) {
        error_log("Erro: Arquivo excede o limite de tamanho");
        echo json_encode([
            'success' => false,
            'message' => 'Erro: O arquivo excede o limite de 3GB.'
        ]);
        exit;
    }
    
    // Obter espaço usado
    $storageInfo = getStorageInfo();
    $usedStorage = $storageInfo['used'];
    
    // Verificar se há espaço disponível
    if (($usedStorage + $fileSize) > $maxTotalStorage) {
        error_log("Erro: Limite de espaço excedido");
        echo json_encode([
            'success' => false,
            'message' => 'Erro: limite de espaço total excedido. Não há espaço suficiente para este arquivo.'
        ]);
        exit;
    }
    
    // Verificar erros específicos de upload
    if ($file['error'] !== UPLOAD_ERR_OK) {
        error_log("Erro de upload: código " . $file['error']);
        switch ($file['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                echo json_encode([
                    'success' => false,
                    'message' => 'Erro: O arquivo excede o limite de tamanho permitido pelo servidor.'
                ]);
                break;
                
            case UPLOAD_ERR_PARTIAL:
                echo json_encode([
                    'success' => false,
                    'message' => 'Erro: O arquivo foi enviado parcialmente.'
                ]);
                break;
                
            case UPLOAD_ERR_NO_TMP_DIR:
                echo json_encode([
                    'success' => false,
                    'message' => 'Erro: Diretório temporário ausente.'
                ]);
                break;
                
            case UPLOAD_ERR_CANT_WRITE:
                echo json_encode([
                    'success' => false,
                    'message' => 'Erro: Falha ao escrever o arquivo no disco.'
                ]);
                break;
                
            case UPLOAD_ERR_EXTENSION:
                echo json_encode([
                    'success' => false,
                    'message' => 'Erro: Uma extensão PHP interrompeu o upload.'
                ]);
                break;
                
            default:
                echo json_encode([
                    'success' => false,
                    'message' => 'Erro desconhecido no upload: código ' . $file['error']
                ]);
        }
        exit;
    }
    
    // Verificar se é um vídeo válido
    if (function_exists('mime_content_type')) {
        $fileType = mime_content_type($file['tmp_name']);
        error_log("Tipo MIME do arquivo: " . $fileType);
        
        $allowedTypes = [
            'video/mp4',
            'video/mpeg',
            'video/quicktime',
            'video/x-msvideo',
            'video/x-ms-wmv',
            'video/webm',
            'video/x-matroska'
        ];
        
        if (!in_array($fileType, $allowedTypes)) {
            error_log("Erro: Tipo de arquivo não permitido - " . $fileType);
            echo json_encode([
                'success' => false,
                'message' => 'Erro: Apenas arquivos de vídeo são permitidos.'
            ]);
            exit;
        }
    } else {
        error_log("Aviso: Função mime_content_type não disponível. Pulando verificação de tipo.");
    }
    
    // Verificar se o arquivo já existe
    if (file_exists($targetFilePath)) {
        error_log("Arquivo já existe. Gerando nome único.");
        // Gerar nome único
        $pathInfo = pathinfo($fileName);
        $baseName = $pathInfo['filename'];
        $extension = isset($pathInfo['extension']) ? '.' . $pathInfo['extension'] : '';
        $counter = 1;
        
        while (file_exists($uploadsDir . '/' . $baseName . '-' . $counter . $extension)) {
            $counter++;
        }
        
        $fileName = $baseName . '-' . $counter . $extension;
        $targetFilePath = $uploadsDir . '/' . $fileName;
    }
    
    // Realizar o upload
    error_log("Movendo arquivo de " . $file['tmp_name'] . " para " . $targetFilePath);
    
    if (move_uploaded_file($file['tmp_name'], $targetFilePath)) {
        error_log("Upload realizado com sucesso: " . $targetFilePath);
        echo json_encode([
            'success' => true,
            'message' => 'Upload realizado com sucesso!',
            'fileName' => $fileName
        ]);
    } else {
        error_log("ERRO ao mover arquivo temporário para destino");
        
        // Informações adicionais para diagnóstico
        error_log("Permissões do diretório temporário: " . substr(sprintf('%o', fileperms(dirname($file['tmp_name']))), -4));
        error_log("Permissões do diretório de destino: " . substr(sprintf('%o', fileperms($uploadsDir)), -4));
        error_log("Espaço livre no disco: " . disk_free_space("/") . " bytes");
        
        echo json_encode([
            'success' => false,
            'message' => 'Ocorreu um erro ao salvar o arquivo. Tente novamente.'
        ]);
    }
} else {
    error_log("Método inválido: " . $_SERVER['REQUEST_METHOD']);
    echo json_encode([
        'success' => false,
        'message' => 'Método inválido.'
    ]);
}
?> 