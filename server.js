const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/files', express.static(path.join(__dirname, 'wwwroot', 'files')));

const uploadDir = path.join(__dirname, 'wwwroot', 'files');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        cb(null, `${nameWithoutExt}_${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/plain', 'text/csv',
            'application/zip', 'application/x-rar-compressed'
        ];

        if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido'), false);
        }
    }
});

app.post('/api/upload', upload.array('files', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Nenhum arquivo enviado' });
        }

        const uploadedFiles = req.files.map(file => ({
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.filename,
            originalName: file.originalname,
            size: file.size,
            type: file.mimetype,
            path: `/files/${file.filename}`,
            uploadDate: new Date()
        }));

        res.json({
            success: true,
            files: uploadedFiles
        });
    } catch (error) {
        console.error('Erro no upload:', error);
        res.status(500).json({ error: 'Erro ao processar upload' });
    }
});

app.delete('/api/files/:filename', (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(uploadDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Arquivo não encontrado' });
        }

        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'Arquivo excluído com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir arquivo:', error);
        res.status(500).json({ error: 'Erro ao excluir arquivo' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uploadDir });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor de upload rodando na porta ${PORT}`);
    console.log(`📁 Pasta de uploads: ${uploadDir}`);
});
