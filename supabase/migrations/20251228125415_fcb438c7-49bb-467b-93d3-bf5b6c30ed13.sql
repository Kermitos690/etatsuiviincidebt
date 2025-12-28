-- Table des patterns de détection IA
CREATE TABLE public.detection_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  category TEXT NOT NULL,
  pattern_name TEXT NOT NULL,
  description TEXT,
  keywords TEXT[] DEFAULT '{}',
  regex_patterns TEXT[] DEFAULT '{}',
  example_citations TEXT[] DEFAULT '{}',
  severity TEXT DEFAULT 'medium',
  legal_articles TEXT[] DEFAULT '{}',
  counter_arguments TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  detection_count INTEGER DEFAULT 0,
  accuracy_score NUMERIC DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide
CREATE INDEX idx_detection_patterns_category ON public.detection_patterns(category);
CREATE INDEX idx_detection_patterns_user_active ON public.detection_patterns(user_id, is_active);

-- Enable RLS
ALTER TABLE public.detection_patterns ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own detection_patterns" ON public.detection_patterns
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert own detection_patterns" ON public.detection_patterns
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own detection_patterns" ON public.detection_patterns
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own detection_patterns" ON public.detection_patterns
  FOR DELETE USING (user_id = auth.uid());

-- Table de liaison de threads emails
CREATE TABLE public.email_thread_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  primary_thread_id TEXT NOT NULL,
  linked_email_ids UUID[] DEFAULT '{}',
  link_reason TEXT,
  link_type TEXT DEFAULT 'related',
  ai_suggested BOOLEAN DEFAULT false,
  user_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche
CREATE INDEX idx_email_thread_links_user ON public.email_thread_links(user_id);
CREATE INDEX idx_email_thread_links_thread ON public.email_thread_links(primary_thread_id);

-- Enable RLS
ALTER TABLE public.email_thread_links ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own email_thread_links" ON public.email_thread_links
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own email_thread_links" ON public.email_thread_links
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own email_thread_links" ON public.email_thread_links
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own email_thread_links" ON public.email_thread_links
  FOR DELETE USING (user_id = auth.uid());

-- Table de détection des ruptures de conversation
CREATE TABLE public.thread_break_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  thread_id TEXT NOT NULL,
  email_id UUID REFERENCES public.emails(id) ON DELETE CASCADE,
  break_type TEXT NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT now(),
  questions_unanswered TEXT[] DEFAULT '{}',
  days_gap INTEGER DEFAULT 0,
  continuation_suggested_id UUID REFERENCES public.emails(id),
  is_confirmed BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche
CREATE INDEX idx_thread_break_detections_user ON public.thread_break_detections(user_id);
CREATE INDEX idx_thread_break_detections_thread ON public.thread_break_detections(thread_id);
CREATE INDEX idx_thread_break_detections_unresolved ON public.thread_break_detections(user_id, is_resolved) WHERE is_resolved = false;

-- Enable RLS
ALTER TABLE public.thread_break_detections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own thread_break_detections" ON public.thread_break_detections
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own thread_break_detections" ON public.thread_break_detections
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own thread_break_detections" ON public.thread_break_detections
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own thread_break_detections" ON public.thread_break_detections
  FOR DELETE USING (user_id = auth.uid());

-- Trigger pour updated_at sur detection_patterns
CREATE TRIGGER update_detection_patterns_updated_at
  BEFORE UPDATE ON public.detection_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insérer les patterns prédéfinis (globaux, user_id = NULL)
INSERT INTO public.detection_patterns (user_id, category, pattern_name, description, keywords, severity, legal_articles, counter_arguments) VALUES
(NULL, 'excuse_temporelle', 'Absence vacances', 'Justification d''absence par congés ou vacances', ARRAY['vacances', 'congé', 'absent', 'indisponible', 'absence'], 'high', ARRAY['Art. 406 CC'], ARRAY['L''Art. 406 CC impose une continuité du service de curatelle']),
(NULL, 'excuse_temporelle', 'Maladie', 'Justification par raison médicale', ARRAY['malade', 'arrêt', 'médecin', 'incapacité', 'santé', 'hospitalisation'], 'medium', ARRAY['Art. 406 CC'], ARRAY['Une suppléance doit être organisée selon Art. 406 CC']),
(NULL, 'evitement', 'Renvoi vers tiers', 'Redirection vers un autre interlocuteur', ARRAY['contactez', 'adressez-vous', 'voyez avec', 'demandez à', 'ce n''est pas à moi'], 'high', ARRAY['Art. 394 CC', 'Art. 405 CC'], ARRAY['Le curateur doit assurer une gestion directe selon Art. 394 CC']),
(NULL, 'evitement', 'Pas mon rôle', 'Déni de responsabilité', ARRAY['ne relève pas', 'pas de ma compétence', 'pas mon rôle', 'hors mandat'], 'critical', ARRAY['Art. 405 CC'], ARRAY['Le mandat de curatelle englobe la protection globale des intérêts']),
(NULL, 'retard', 'Délai non respecté', 'Réponse ou action tardive', ARRAY['retard', 'délai', 'bientôt', 'prochainement', 'dès que possible', 'patience'], 'high', ARRAY['Art. 29 Cst.'], ARRAY['Art. 29 Cst. garantit le droit à un traitement dans un délai raisonnable']),
(NULL, 'contradiction', 'Promesse non tenue', 'Engagement sans suite', ARRAY['je vais', 'je ferai', 'prévu de', 'promis', 'engagé à'], 'high', ARRAY['Art. 3 CC'], ARRAY['Art. 3 CC impose la bonne foi dans les engagements']),
(NULL, 'minimisation', 'Banalisation', 'Minimisation des faits', ARRAY['petit', 'simple', 'juste', 'seulement', 'rien de grave', 'normal'], 'medium', ARRAY[]::TEXT[], ARRAY['La minimisation cache souvent un dysfonctionnement réel']),
(NULL, 'rupture', 'Changement de sujet', 'Évitement par digression', ARRAY['par ailleurs', 'autre sujet', 'concernant', 'à propos de', 'sinon'], 'medium', ARRAY[]::TEXT[], ARRAY['Le changement de sujet évite de répondre aux questions posées']),
(NULL, 'non_reponse', 'Question ignorée', 'Non-réponse sélective', ARRAY['?'], 'high', ARRAY['Art. 29 Cst.'], ARRAY['Le droit d''être entendu implique de répondre aux questions']),
(NULL, 'decision_unilaterale', 'Décision sans consultation', 'Action sans accord préalable', ARRAY['j''ai décidé', 'il a été décidé', 'nous avons décidé', 'tranché'], 'critical', ARRAY['Art. 394 CC'], ARRAY['Art. 394 CC exige la consultation du pupille pour les décisions importantes']),
(NULL, 'intimidation', 'Ton condescendant', 'Attitude méprisante', ARRAY['comme vous savez', 'évidemment', 'naturellement', 'vous devriez savoir'], 'medium', ARRAY['Art. 3 CC'], ARRAY['Art. 3 CC impose le respect et la bonne foi']),
(NULL, 'confidentialite', 'Partage non autorisé', 'Transmission d''informations sans consentement', ARRAY['j''ai informé', 'copie à', 'transmis à', 'partagé avec'], 'critical', ARRAY['Art. 4 LPD', 'Art. 28 CC'], ARRAY['Art. 4 LPD et Art. 28 CC protègent les données personnelles']),
(NULL, 'manipulation', 'Culpabilisation', 'Faire porter la faute à la victime', ARRAY['vous auriez dû', 'c''est votre faute', 'vous n''avez pas', 'si vous aviez'], 'high', ARRAY[]::TEXT[], ARRAY['La culpabilisation inverse les responsabilités']),
(NULL, 'obstruction', 'Refus d''information', 'Blocage d''accès aux documents', ARRAY['confidentiel', 'pas autorisé', 'interdit', 'impossible de'], 'critical', ARRAY['Art. 29 Cst.', 'Art. 449b CC'], ARRAY['Art. 449b CC garantit le droit de consultation du dossier']);