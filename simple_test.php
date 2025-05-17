<?php
// Configurar cabeçalho para JSON
header('Content-Type: application/json');

// Criar e retornar um array simples em formato JSON
$data = array(
    'status' => 'success',
    'message' => 'PHP está funcionando corretamente!',
    'server_info' => array(
        'php_version' => phpversion(),
        'webserver' => $_SERVER['SERVER_SOFTWARE'] ?? 'Desconhecido',
        'max_upload' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size'),
        'max_execution_time' => ini_get('max_execution_time') . ' segundos'
    )
);

echo json_encode($data);
?> 