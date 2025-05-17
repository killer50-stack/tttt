const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

// Configuração do servidor
const app = express();
const PORT = 3000;
const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB em bytes
const MAX_TOTAL_STORAGE = 999 * 1024 * 1024 * 1024; // 999GB em bytes
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Certificar de que a pasta uploads existe
fs.ensureDirSync(UPLOAD_DIR);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR)); // Servir arquivos da pasta uploads

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // Cria um nome seguro para o arquivo
    const uniqueName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '')}`;
    cb(null, uniqueName);
  }
});

// Função para calcular o tamanho total dos arquivos na pasta uploads
function calculateTotalSize() {
  let totalSize = 0;
  const files = fs.readdirSync(UPLOAD_DIR);
  
  for (const file of files) {
    const filePath = path.join(UPLOAD_DIR, file);
    if (fs.statSync(filePath).isFile()) {
      totalSize += fs.statSync(filePath).size;
    }
  }
  
  return totalSize;
}

// Filtro para verificar tipo de arquivo e tamanho
const fileFilter = (req, file, cb) => {
  // Verificar se é vídeo
  if (!file.mimetype.startsWith('video/')) {
    return cb(new Error('Apenas arquivos de vídeo são permitidos'), false);
  }

  // Verificar espaço disponível
  const totalSize = calculateTotalSize();
  const fileSize = parseInt(req.headers['content-length']);

  if (fileSize > MAX_FILE_SIZE) {
    return cb(new Error(`O arquivo excede o limite de ${MAX_FILE_SIZE/(1024*1024*1024)}GB`), false);
  }

  if (totalSize + fileSize > MAX_TOTAL_STORAGE) {
    return cb(new Error(`Limite de armazenamento excedido (${MAX_TOTAL_STORAGE/(1024*1024*1024)}GB)`), false);
  }

  cb(null, true);
};

// Configuração final do multer
const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }
});

// Rota para listar vídeos
app.get('/api/videos', (req, res) => {
  try {
    const videos = [];
    const files = fs.readdirSync(UPLOAD_DIR);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(UPLOAD_DIR, file);
      if (fs.statSync(filePath).isFile()) {
        const stats = fs.statSync(filePath);
        const size = stats.size;
        totalSize += size;
        
        videos.push({
          name: file,
          size: size,
          time: stats.mtime.getTime(),
          url: `/uploads/${file}`
        });
      }
    }

    // Ordena por data de upload (mais recente primeiro)
    videos.sort((a, b) => b.time - a.time);

    res.json({
      success: true,
      videos: videos,
      totalSize: totalSize,
      availableSpace: MAX_TOTAL_STORAGE - totalSize
    });
  } catch (error) {
    console.error('Erro ao listar vídeos:', error);
    res.status(500).json({ success: false, error: 'Erro ao listar vídeos' });
  }
});

// Rota para fazer upload de vídeo
app.post('/api/upload', upload.single('videoFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
  }

  // Atualiza as estatísticas do armazenamento
  const totalSize = calculateTotalSize();
  
  res.json({
    success: true,
    filename: req.file.filename,
    size: req.file.size,
    totalSize: totalSize,
    availableSpace: MAX_TOTAL_STORAGE - totalSize,
    url: `/uploads/${req.file.filename}`
  });
});

// Rota para excluir um vídeo
app.delete('/api/videos/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Arquivo não encontrado' });
    }
    
    fs.unlinkSync(filePath);
    
    // Retorna a lista atualizada
    const totalSize = calculateTotalSize();
    
    res.json({
      success: true,
      totalSize: totalSize,
      availableSpace: MAX_TOTAL_STORAGE - totalSize
    });
  } catch (error) {
    console.error('Erro ao excluir vídeo:', error);
    res.status(500).json({ success: false, error: 'Erro ao excluir o vídeo' });
  }
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  const totalSize = calculateTotalSize();
  console.log(`Espaço utilizado: ${(totalSize/(1024*1024*1024)).toFixed(2)}GB de ${(MAX_TOTAL_STORAGE/(1024*1024*1024))}GB`);
}); 