<?php
// Configurações
$uploadsDir = 'uploads';
$maxFileSize = 3 * 1024 * 1024 * 1024; // 3GB em bytes
$maxTotalStorage = 999 * 1024 * 1024 * 1024; // 999GB em bytes

// Headers para permitir requisições AJAX
header('Content-Type: application/json');

// Criar diretório de uploads se não existir
if (!file_exists($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
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
    echo json_encode(getStorageInfo());
    exit;
}

// Processar upload de arquivo
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Verificar se há arquivo para upload
    if (!isset($_FILES['videoFile']) || $_FILES['videoFile']['error'] === UPLOAD_ERR_NO_FILE) {
        echo json_encode([
            'success' => false,
            'message' => 'Nenhum arquivo enviado.'
        ]);
        exit;
    }
    
    $file = $_FILES['videoFile'];
    $fileSize = $file['size'];
    $fileName = basename($file['name']);
    $targetFilePath = $uploadsDir . '/' . $fileName;
    
    // Validar tamanho do arquivo
    if ($fileSize > $maxFileSize) {
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
        echo json_encode([
            'success' => false,
            'message' => 'Erro: limite de espaço total excedido. Não há espaço suficiente para este arquivo.'
        ]);
        exit;
    }
    
    // Verificar erros específicos de upload
    switch ($file['error']) {
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            echo json_encode([
                'success' => false,
                'message' => 'Erro: O arquivo excede o limite de tamanho permitido pelo servidor.'
            ]);
            exit;
            
        case UPLOAD_ERR_PARTIAL:
            echo json_encode([
                'success' => false,
                'message' => 'Erro: O arquivo foi enviado parcialmente.'
            ]);
            exit;
            
        case UPLOAD_ERR_NO_TMP_DIR:
            echo json_encode([
                'success' => false,
                'message' => 'Erro: Diretório temporário ausente.'
            ]);
            exit;
            
        case UPLOAD_ERR_CANT_WRITE:
            echo json_encode([
                'success' => false,
                'message' => 'Erro: Falha ao escrever o arquivo no disco.'
            ]);
            exit;
            
        case UPLOAD_ERR_EXTENSION:
            echo json_encode([
                'success' => false,
                'message' => 'Erro: Uma extensão PHP interrompeu o upload.'
            ]);
            exit;
    }
    
    // Verificar se é um vídeo válido
    $fileType = mime_content_type($file['tmp_name']);
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
        echo json_encode([
            'success' => false,
            'message' => 'Erro: Apenas arquivos de vídeo são permitidos.'
        ]);
        exit;
    }
    
    // Verificar se o arquivo já existe
    if (file_exists($targetFilePath)) {
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
    if (move_uploaded_file($file['tmp_name'], $targetFilePath)) {
        echo json_encode([
            'success' => true,
            'message' => 'Upload realizado com sucesso!',
            'fileName' => $fileName
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Ocorreu um erro ao salvar o arquivo. Tente novamente.'
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Método inválido.'
    ]);
}
?> 