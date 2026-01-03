import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { SuggestionCard } from '@/components/suggestions/SuggestionCard';
import { LoadingState, EmptyState, ErrorState } from '@/components/common';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Lightbulb, CheckCircle, XCircle, Archive } from 'lucide-react';

interface Suggestion {
  id: string;
  user_id: string;
  email_source_id: string | null;
  suggested_title: string;
  suggested_facts: string | null;
  suggested_dysfunction: string | null;
  suggested_institution: string | null;
  suggested_type: string | null;
  suggested_gravity: string | null;
  confidence: number | null;
  ai_analysis: Record<string, unknown> | null;
  legal_mentions: Record<string, unknown>[] | null;
  status: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_incident_id: string | null;
  created_at: string;
  updated_at: string;
  emails?: {
    id: string;
    subject: string;
    sender: string;
    received_at: string;
    body: string;
  } | null;
}

type SuggestionAction = 'approve' | 'reject' | 'low_importance';

export default function Suggestions() {
  const [activeTab, setActiveTab] = useState('pending');
  const queryClient = useQueryClient();

  // Fetch suggestions
  const { data: suggestions, isLoading, error, refetch } = useQuery({
    queryKey: ['incident-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_suggestions')
        .select(`
          *,
          emails:email_source_id (
            id,
            subject,
            sender,
            received_at,
            body
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Suggestion[];
    },
  });

  // Process suggestion mutation
  const processMutation = useMutation({
    mutationFn: async ({ 
      suggestionId, 
      action, 
      rejectionReason,
      modifications 
    }: { 
      suggestionId: string; 
      action: SuggestionAction;
      rejectionReason?: string;
      modifications?: Record<string, string>;
    }) => {
      const { data, error } = await supabase.functions.invoke('approve-suggestion', {
        body: { suggestionId, action, rejectionReason, modifications }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['incident-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });

      if (variables.action === 'approve') {
        toast.success('Incident créé avec succès', {
          description: `L'incident #${data.incident?.numero} a été créé.`
        });
      } else if (variables.action === 'reject') {
        toast.success('Suggestion rejetée');
      } else {
        toast.success('Classé comme peu important');
      }
    },
    onError: (error: Error) => {
      toast.error('Erreur lors du traitement', {
        description: error.message
      });
    }
  });

  const handleAction = (suggestionId: string, action: SuggestionAction, rejectionReason?: string) => {
    processMutation.mutate({ suggestionId, action, rejectionReason });
  };

  // Filter suggestions by status
  const pendingSuggestions = suggestions?.filter(s => s.status === 'pending') || [];
  const approvedSuggestions = suggestions?.filter(s => s.status === 'approved') || [];
  const rejectedSuggestions = suggestions?.filter(s => s.status === 'rejected') || [];
  const lowImportanceSuggestions = suggestions?.filter(s => s.status === 'low_importance') || [];
  const archivedSuggestions = [...rejectedSuggestions, ...lowImportanceSuggestions];

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <PageHeader 
          title="Suggestions d'Incidents" 
          description="Validez les incidents détectés par l'IA"
        />
        <LoadingState message="Chargement des suggestions..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <PageHeader 
          title="Suggestions d'Incidents" 
          description="Validez les incidents détectés par l'IA"
        />
        <ErrorState 
          message="Erreur lors du chargement des suggestions" 
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <PageHeader 
        title="Suggestions d'Incidents" 
        description="Validez, rejetez ou classez les incidents détectés automatiquement"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            En attente
            {pendingSuggestions.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingSuggestions.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Validés
          </TabsTrigger>
          <TabsTrigger value="archived" className="flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Archivés
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingSuggestions.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title="Aucune suggestion en attente"
              description="Les nouvelles suggestions d'incidents apparaîtront ici après l'analyse des emails."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {pendingSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onApprove={() => handleAction(suggestion.id, 'approve')}
                  onReject={(reason) => handleAction(suggestion.id, 'reject', reason)}
                  onLowImportance={() => handleAction(suggestion.id, 'low_importance')}
                  isProcessing={processMutation.isPending}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {approvedSuggestions.length === 0 ? (
            <EmptyState
              icon={CheckCircle}
              title="Aucune suggestion validée"
              description="Les suggestions que vous validez apparaîtront ici."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {approvedSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  readonly
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-6">
          {archivedSuggestions.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="Aucune suggestion archivée"
              description="Les suggestions rejetées ou classées peu importantes apparaîtront ici."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {archivedSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  readonly
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
