-- Add unique constraint on cite_key for ON CONFLICT support
ALTER TABLE legal_units ADD CONSTRAINT legal_units_cite_key_unique UNIQUE (cite_key);

-- Add unique constraint on source_catalog.source_url
ALTER TABLE source_catalog ADD CONSTRAINT source_catalog_source_url_unique UNIQUE (source_url);