-- Créer le bucket pour les screenshots du tutoriel
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorial-screenshots', 'tutorial-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Policy pour permettre aux utilisateurs authentifiés d'uploader des screenshots
CREATE POLICY "Authenticated users can upload tutorial screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tutorial-screenshots');

-- Policy pour permettre aux utilisateurs authentifiés de mettre à jour leurs screenshots
CREATE POLICY "Authenticated users can update tutorial screenshots"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tutorial-screenshots');

-- Policy pour permettre aux utilisateurs authentifiés de supprimer des screenshots
CREATE POLICY "Authenticated users can delete tutorial screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tutorial-screenshots');

-- Policy pour permettre à tout le monde de lire les screenshots (public)
CREATE POLICY "Public read access for tutorial screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'tutorial-screenshots');