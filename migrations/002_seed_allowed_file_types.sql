-- Migration: Seed allowed file types
-- Configurable whitelist for security

-- Clear existing data (development only)
DELETE FROM allowed_file_types;

-- Document types
INSERT INTO allowed_file_types (extension, mime_type, max_size_mb, description, is_active) VALUES
('pdf', 'application/pdf', 50, 'Documentos PDF', true),
('doc', 'application/msword', 20, 'Documentos Word (.doc)', true),
('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 20, 'Documentos Word (.docx)', true),
('xls', 'application/vnd.ms-excel', 20, 'Planilhas Excel (.xls)', true),
('xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 20, 'Planilhas Excel (.xlsx)', true),
('txt', 'text/plain', 5, 'Arquivos de texto', true),
('csv', 'text/csv', 10, 'Arquivos CSV', true),
('xml', 'application/xml', 10, 'Arquivos XML', true);

-- Image types
INSERT INTO allowed_file_types (extension, mime_type, max_size_mb, description, is_active) VALUES
('jpg', 'image/jpeg', 10, 'Imagens JPEG', true),
('jpeg', 'image/jpeg', 10, 'Imagens JPEG', true),
('png', 'image/png', 10, 'Imagens PNG', true),
('gif', 'image/gif', 5, 'Imagens GIF', true),
('webp', 'image/webp', 10, 'Imagens WebP', true),
('svg', 'image/svg+xml', 2, 'Imagens SVG', true);

-- Archive types (with restrictions)
INSERT INTO allowed_file_types (extension, mime_type, max_size_mb, description, is_active) VALUES
('zip', 'application/zip', 100, 'Arquivos ZIP', true),
('rar', 'application/x-rar-compressed', 100, 'Arquivos RAR', false),
('7z', 'application/x-7z-compressed', 100, 'Arquivos 7-Zip', false);

-- Audio/Video (limited)
INSERT INTO allowed_file_types (extension, mime_type, max_size_mb, description, is_active) VALUES
('mp3', 'audio/mpeg', 20, 'Áudio MP3', false),
('mp4', 'video/mp4', 200, 'Vídeo MP4', false),
('avi', 'video/x-msvideo', 200, 'Vídeo AVI', false);

-- Log the seeding
INSERT INTO files (
    id,
    original_name,
    ext,
    mime_type,
    size_bytes,
    sha256,
    storage_path,
    is_private,
    access_scope
) VALUES (
    gen_random_uuid(),
    'seed_log.txt',
    'txt',
    'text/plain',
    42,
    '0000000000000000000000000000000000000000000000000000000000000000',
    'system/seed_log.txt',
    true,
    'private'
);