import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  TrendingDown,
  FileText,
  Scale,
  Eye,
  RefreshCw,
  AlertOctagon,
  Info,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ComplianceMetrics {
  totalIncidents: number;
  incidentsWithLegalBasis: number;
  incidentsValidated: number;
  averageScore: number;
  redZones: RedZone[];
  complianceByDomain: Record<string, number>;
  recentAssessments: ComplianceAssessment[];
}

interface RedZone {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium";
  title: string;
  description: string;
  affectedCount: number;
  recommendation: string;
}

interface ComplianceAssessment {
  id: string;
  entity_type: string;
  entity_id: string;
  compliance_status: string;
  overall_score: number | null;
  risk_level: string;
  created_at: string;
  issues_detected: unknown[] | null;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-destructive text-destructive-foreground";
    case "high":
      return "bg-orange-500 text-white";
    case "medium":
      return "bg-amber-500 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-destructive";
};

const getProgressColor = (score: number) => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-destructive";
};

const getRiskBadge = (risk: string) => {
  switch (risk) {
    case "low":
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Faible</Badge>;
    case "medium":
      return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Moyen</Badge>;
    case "high":
      return <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">Élevé</Badge>;
    case "critical":
      return <Badge variant="destructive">Critique</Badge>;
    default:
      return <Badge variant="secondary">Non déterminé</Badge>;
  }
};

export default function ComplianceDashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch incidents for compliance analysis
  const { data: incidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ["compliance-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch legal articles count
  const { data: legalArticles, isLoading: articlesLoading } = useQuery({
    queryKey: ["legal-articles-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_articles")
        .select("id, code_name, domain");
      if (error) throw error;
      return data;
    },
  });

  // Fetch compliance assessments
  const { data: assessments, isLoading: assessmentsLoading, refetch: refetchAssessments } = useQuery({
    queryKey: ["compliance-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_assessments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as ComplianceAssessment[];
    },
  });

  // Fetch fact-law mappings
  const { data: factLawMappings } = useQuery({
    queryKey: ["fact-law-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fact_law_mappings")
        .select("id, mapping_type, validated_at");
      if (error) throw error;
      return data;
    },
  });

  // Fetch AI validations
  const { data: aiValidations } = useQuery({
    queryKey: ["ai-validations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_output_validations")
        .select("id, validation_status, hallucination_detected")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Calculate compliance metrics
  const metrics = useMemo<ComplianceMetrics>(() => {
    const redZones: RedZone[] = [];
    
    // Incidents analysis
    const totalIncidents = incidents?.length || 0;
    const incidentsWithProofs = incidents?.filter(i => i.preuves && (i.preuves as unknown[]).length > 0).length || 0;
    const incidentsValidated = incidents?.filter(i => i.validated_at).length || 0;
    
    // Calculate average score
    const scores = incidents?.map(i => i.score).filter(s => s > 0) || [];
    const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    
    // Legal basis coverage
    const mappingsCount = factLawMappings?.length || 0;
    const validatedMappings = factLawMappings?.filter(m => m.validated_at).length || 0;
    
    // AI hallucination rate
    const hallucinationsDetected = aiValidations?.filter(v => v.hallucination_detected).length || 0;
    const hallucinationRate = aiValidations?.length ? Math.round((hallucinationsDetected / aiValidations.length) * 100) : 0;
    
    // Detect red zones
    if (totalIncidents > 0 && incidentsWithProofs / totalIncidents < 0.5) {
      redZones.push({
        id: "rz-proofs",
        type: "documentation",
        severity: "high",
        title: "Déficit de preuves",
        description: "Moins de 50% des incidents ont des preuves attachées",
        affectedCount: totalIncidents - incidentsWithProofs,
        recommendation: "Attacher systématiquement les emails sources et documents probatoires aux incidents"
      });
    }
    
    if (hallucinationRate > 20) {
      redZones.push({
        id: "rz-hallucination",
        type: "ai_reliability",
        severity: "critical",
        title: "Taux d'hallucination IA élevé",
        description: `${hallucinationRate}% des sorties IA contiennent des références douteuses`,
        affectedCount: hallucinationsDetected,
        recommendation: "Renforcer la validation humaine et enrichir le référentiel légal"
      });
    }
    
    if (mappingsCount === 0 && totalIncidents > 0) {
      redZones.push({
        id: "rz-legal",
        type: "legal_basis",
        severity: "critical",
        title: "Absence de qualification juridique",
        description: "Aucun fait n'est rattaché à une base légale",
        affectedCount: totalIncidents,
        recommendation: "Exécuter le moteur RAG légal sur les faits extraits"
      });
    } else if (validatedMappings / (mappingsCount || 1) < 0.3) {
      redZones.push({
        id: "rz-validation",
        type: "validation",
        severity: "medium",
        title: "Qualifications non validées",
        description: "La majorité des liens faits-loi n'ont pas été validés humainement",
        affectedCount: mappingsCount - validatedMappings,
        recommendation: "Valider les mappings via l'interface de formation IA"
      });
    }
    
    const criticalIncidents = incidents?.filter(i => i.gravite === "critique" && i.statut === "Ouvert").length || 0;
    if (criticalIncidents > 0) {
      redZones.push({
        id: "rz-critical",
        type: "urgency",
        severity: "critical",
        title: "Incidents critiques non traités",
        description: `${criticalIncidents} incident(s) de gravité critique restent ouverts`,
        affectedCount: criticalIncidents,
        recommendation: "Traiter en priorité les incidents critiques"
      });
    }
    
    // Compliance by domain
    const complianceByDomain: Record<string, number> = {};
    const domains = ["protection_adulte", "protection_donnees", "procedure_administrative"];
    domains.forEach(domain => {
      const domainArticles = legalArticles?.filter(a => a.domain === domain).length || 0;
      const domainMappings = factLawMappings?.length || 0; // Simplified - would need join in real case
      complianceByDomain[domain] = domainArticles > 0 ? Math.min(100, Math.round((domainMappings / domainArticles) * 10)) : 0;
    });
    
    return {
      totalIncidents,
      incidentsWithLegalBasis: mappingsCount > 0 ? Math.min(totalIncidents, mappingsCount) : 0,
      incidentsValidated,
      averageScore,
      redZones,
      complianceByDomain,
      recentAssessments: assessments || []
    };
  }, [incidents, legalArticles, factLawMappings, aiValidations, assessments]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchAssessments();
      toast.success("Données de conformité actualisées");
    } catch (error) {
      toast.error("Erreur lors de l'actualisation");
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading = incidentsLoading || articlesLoading || assessmentsLoading;

  // Calculate overall compliance score
  const overallScore = useMemo(() => {
    const proofScore = metrics.totalIncidents > 0 
      ? (metrics.incidentsWithLegalBasis / metrics.totalIncidents) * 25 
      : 0;
    const validationScore = metrics.totalIncidents > 0 
      ? (metrics.incidentsValidated / metrics.totalIncidents) * 25 
      : 0;
    const articleScore = (legalArticles?.length || 0) > 0 ? 25 : 0;
    const redZonePenalty = metrics.redZones.reduce((acc, rz) => {
      if (rz.severity === "critical") return acc + 15;
      if (rz.severity === "high") return acc + 10;
      return acc + 5;
    }, 0);
    
    return Math.max(0, Math.round(proofScore + validationScore + articleScore + 25 - redZonePenalty));
  }, [metrics, legalArticles]);

  return (
    <AppLayout>
      <div className="space-y-6 animate-scale-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Tableau de Conformité
            </h1>
            <p className="text-muted-foreground mt-1">
              Scoring automatique et détection des zones à risque
            </p>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Actualiser
          </Button>
        </div>

        {/* Score global */}
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-8 border-muted flex items-center justify-center relative">
                  <div 
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(
                        ${overallScore >= 80 ? 'hsl(142 76% 36%)' : overallScore >= 60 ? 'hsl(38 92% 50%)' : overallScore >= 40 ? 'hsl(25 95% 53%)' : 'hsl(var(--destructive))'} ${overallScore * 3.6}deg,
                        hsl(var(--muted)) ${overallScore * 3.6}deg
                      )`,
                      clipPath: 'circle(50% at 50% 50%)'
                    }}
                  />
                  <div className="absolute inset-2 rounded-full bg-card flex items-center justify-center">
                    <span className={cn("text-3xl font-bold", getScoreColor(overallScore))}>
                      {isLoading ? "..." : overallScore}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 space-y-4 text-center lg:text-left">
                <div>
                  <h2 className="text-xl font-semibold">Score de Conformité Global</h2>
                  <p className="text-muted-foreground">
                    {overallScore >= 80 ? "Excellent niveau de conformité" :
                     overallScore >= 60 ? "Conformité satisfaisante avec améliorations possibles" :
                     overallScore >= 40 ? "Conformité insuffisante - actions requises" :
                     "Non-conformité critique - intervention urgente nécessaire"}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-primary">{metrics.totalIncidents}</p>
                    <p className="text-xs text-muted-foreground">Incidents</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-green-600">{metrics.incidentsValidated}</p>
                    <p className="text-xs text-muted-foreground">Validés</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-amber-600">{legalArticles?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">Articles légaux</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold text-destructive">{metrics.redZones.length}</p>
                    <p className="text-xs text-muted-foreground">Zones rouges</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zones rouges */}
        {metrics.redZones.length > 0 && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertOctagon className="h-5 w-5" />
                Zones Rouges Détectées
              </CardTitle>
              <CardDescription>
                Points critiques nécessitant une attention immédiate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.redZones.map((zone) => (
                  <div 
                    key={zone.id}
                    className="p-4 rounded-lg bg-card border border-border hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <Badge className={getSeverityColor(zone.severity)}>
                        {zone.severity === "critical" ? "Critique" :
                         zone.severity === "high" ? "Élevé" : "Moyen"}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium">{zone.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {zone.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-muted-foreground">
                            {zone.affectedCount} élément(s) affecté(s)
                          </span>
                        </div>
                        <div className="mt-3 p-2 rounded bg-muted/50 text-sm">
                          <strong>Recommandation:</strong> {zone.recommendation}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for details */}
        <Tabs defaultValue="domains" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="domains" className="gap-2">
              <Scale className="h-4 w-4" />
              <span className="hidden sm:inline">Par domaine</span>
            </TabsTrigger>
            <TabsTrigger value="assessments" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Évaluations</span>
            </TabsTrigger>
            <TabsTrigger value="indicators" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Indicateurs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="domains">
            <Card>
              <CardHeader>
                <CardTitle>Conformité par Domaine Juridique</CardTitle>
                <CardDescription>
                  Couverture du référentiel légal par domaine
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    { key: "protection_adulte", label: "Protection de l'adulte (CC)", icon: Shield },
                    { key: "protection_donnees", label: "Protection des données (LPD)", icon: Eye },
                    { key: "procedure_administrative", label: "Procédure administrative (LPPA-VD)", icon: FileText }
                  ].map(({ key, label, icon: Icon }) => {
                    const articlesCount = legalArticles?.filter(a => a.domain === key).length || 0;
                    const score = metrics.complianceByDomain[key] || 0;
                    
                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{articlesCount} articles</Badge>
                            <span className={cn("font-bold", getScoreColor(score))}>
                              {score}%
                            </span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-500", getProgressColor(score))}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assessments">
            <Card>
              <CardHeader>
                <CardTitle>Évaluations Récentes</CardTitle>
                <CardDescription>
                  Dernières évaluations de conformité effectuées
                </CardDescription>
              </CardHeader>
              <CardContent>
                {assessmentsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : metrics.recentAssessments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Aucune évaluation de conformité enregistrée</p>
                    <p className="text-sm">Les évaluations seront créées automatiquement lors de l'analyse</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {metrics.recentAssessments.map((assessment) => (
                        <div 
                          key={assessment.id}
                          className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="capitalize">
                                {assessment.entity_type}
                              </Badge>
                              {getRiskBadge(assessment.risk_level)}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              ID: {assessment.entity_id.slice(0, 8)}...
                            </p>
                          </div>
                          <div className="text-right">
                            {assessment.overall_score !== null && (
                              <p className={cn("text-lg font-bold", getScoreColor(assessment.overall_score))}>
                                {assessment.overall_score}%
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(assessment.created_at), "dd MMM", { locale: fr })}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="indicators">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Indicateurs Positifs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span>{legalArticles?.length || 0} articles dans le référentiel</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span>{metrics.incidentsValidated} incidents validés</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span>Système de preuve en place</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    Points d'Amélioration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {metrics.redZones.length === 0 ? (
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>Aucun point critique détecté</span>
                      </li>
                    ) : (
                      metrics.redZones.slice(0, 4).map((zone) => (
                        <li key={zone.id} className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-destructive" />
                          <span>{zone.title}</span>
                        </li>
                      ))
                    )}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
