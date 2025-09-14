-- Migration: Create files management tables
-- Compatible with ASP.NET Core 8 migration

-- Create files table for metadata storage
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name TEXT NOT NULL,
    ext TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    sha256 CHAR(64) NOT NULL,
    storage_path TEXT NOT NULL,
    is_private BOOLEAN DEFAULT true,
    access_scope TEXT DEFAULT 'private' CHECK (access_scope IN ('private', 'public', 'signed')),
    uploader_user_id UUID NULL,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Create file_links table for entity associations
CREATE TABLE IF NOT EXISTS file_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(file_id, entity_type, entity_id)
);

-- Create allowed_file_types configuration table
CREATE TABLE IF NOT EXISTS allowed_file_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    extension TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    max_size_mb INTEGER DEFAULT 20,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_sha256_size ON files(sha256, size_bytes) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_files_deleted_at ON files(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_file_links_entity ON file_links(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_file_links_file ON file_links(file_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_files_updated_at 
    BEFORE UPDATE ON files 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE files IS 'File metadata storage with deduplication support';
COMMENT ON TABLE file_links IS 'Links files to business entities (contas, fornecedores, etc.)';
COMMENT ON TABLE allowed_file_types IS 'Configuration for allowed file types and sizes';
COMMENT ON COLUMN files.sha256 IS 'SHA-256 hash for deduplication and integrity';
COMMENT ON COLUMN files.storage_path IS 'Relative path from wwwroot (e.g., files/upload/2024/09/uuid.ext)';
COMMENT ON COLUMN files.access_scope IS 'Access control: private (auth required), public (open), signed (temporary URL)';