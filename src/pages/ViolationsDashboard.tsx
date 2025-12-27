import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  AlertTriangle, 
  UserX, 
  FileX, 
  MessageSquareOff, 
  Shield, 
  TrendingUp,
  Scale,
  Eye,
  ChevronRight,
  RefreshCw,
  BarChart3,
  PieChart,
  Clock,
  Building2,
  Mail
} from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { toast } from "sonner";
import { EmailLink } from "@/components/email";

interface ViolationStats {
  consentViolations: number;
  collaborationViolations: number;
  lostDocuments: number;
  deadlineViolations: number;
  unilateralDecisions: number;
  unansweredQuestions: number;
  totalViolations: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

interface ViolationDetail {
  id: string;
  emailId: string;
  subject: string;
  date: string;
  type: string;
  severity: string;
  description: string;
  institution: string;
  legalBasis: string[];
}

interface InstitutionViolation {
  institution: string;
  count: number;
  types: string[];
}

const COLORS = {
  consent: "#ef4444",
  collaboration: "#f97316",
  documents: "#8b5cf6",
  deadlines: "#3b82f6",
  unilateral: "#ec4899",
  unanswered: "#6b7280"
};

const SEVERITY_COLORS = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#16a34a"
};

export default function ViolationsDashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ViolationStats>({
    consentViolations: 0,
    collaborationViolations: 0,
    lostDocuments: 0,
    deadlineViolations: 0,
    unilateralDecisions: 0,
    unansweredQuestions: 0,
    totalViolations: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0
  });
  const [violations, setViolations] = useState<ViolationDetail[]>([]);
  const [institutionViolations, setInstitutionViolations] = useState<InstitutionViolation[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      // Fetch emails with AI analysis
      const { data: emails, error } = await supabase
        .from("emails")
        .select("id, subject, sender, received_at, ai_analysis, thread_analysis")
        .not("ai_analysis", "is", null)
        .order("received_at", { ascending: false });

      if (error) throw error;

      // Process violations from AI analysis
      let consentViolations = 0;
      let collaborationViolations = 0;
      let lostDocuments = 0;
      let deadlineViolations = 0;
      let unilateralDecisions = 0;
      let unansweredQuestions = 0;
      let criticalCount = 0;
      let highCount = 0;
      let mediumCount = 0;
      let lowCount = 0;

      const violationDetails: ViolationDetail[] = [];
      const institutionMap: Record<string, { count: number; types: Set<string> }> = {};

      emails?.forEach(email => {
        const analysis = email.ai_analysis as any;
        const threadAnalysis = email.thread_analysis as any;

        if (!analysis) return;

        const institution = analysis.institution || "Non identifiée";
        if (!institutionMap[institution]) {
          institutionMap[institution] = { count: 0, types: new Set() };
        }

        // Check for consent violations
        if (analysis.echange_sans_consentement || 
            threadAnalysis?.consent_violations?.detected ||
            analysis.type === "Consentement" ||
            analysis.type === "Confidentialité") {
          consentViolations++;
          institutionMap[institution].count++;
          institutionMap[institution].types.add("Consentement");
          
          violationDetails.push({
            id: `consent-${email.id}`,
            emailId: email.id,
            subject: email.subject,
            date: email.received_at,
            type: "Consentement",
            severity: analysis.gravite || "Moyenne",
            description: analysis.justification || "Échange d'informations sans consentement détecté",
            institution,
            legalBasis: analysis.articles_violes || ["Art. 30 LPD"]
          });
        }

        // Check for collaboration violations
        if (analysis.pupille_consulte === false || 
            analysis.decision_unilaterale ||
            threadAnalysis?.collaboration_analysis?.unilateral_decisions ||
            analysis.type === "Collaboration") {
          collaborationViolations++;
          institutionMap[institution].count++;
          institutionMap[institution].types.add("Collaboration");
          
          if (analysis.decision_unilaterale) {
            unilateralDecisions++;
          }

          violationDetails.push({
            id: `collab-${email.id}`,
            emailId: email.id,
            subject: email.subject,
            date: email.received_at,
            type: "Collaboration",
            severity: analysis.gravite || "Haute",
            description: analysis.dysfonctionnement || "Décision prise sans consultation du pupille",
            institution,
            legalBasis: analysis.articles_violes || ["Art. 406 CC", "Art. 394 CC"]
          });
        }

        // Check for lost documents
        if (threadAnalysis?.lost_documents?.detected ||
            (analysis.faits && (
              analysis.faits.toLowerCase().includes("perdu") ||
              analysis.faits.toLowerCase().includes("disparu") ||
              analysis.faits.toLowerCase().includes("jamais reçu") ||
              analysis.faits.toLowerCase().includes("non transmis")
            ))) {
          lostDocuments++;
          institutionMap[institution].count++;
          institutionMap[institution].types.add("Documents perdus");
          
          violationDetails.push({
            id: `docs-${email.id}`,
            emailId: email.id,
            subject: email.subject,
            date: email.received_at,
            type: "Documents perdus",
            severity: "Critique",
            description: threadAnalysis?.lost_documents?.documents?.join(", ") || "Document officiel perdu ou non transmis",
            institution,
            legalBasis: ["Art. 26 PA", "Art. 29 Cst."]
          });
        }

        // Check for deadline violations
        if (threadAnalysis?.deadline_violations?.detected ||
            analysis.type === "Délai") {
          deadlineViolations++;
          institutionMap[institution].count++;
          institutionMap[institution].types.add("Délais");
          
          violationDetails.push({
            id: `deadline-${email.id}`,
            emailId: email.id,
            subject: email.subject,
            date: email.received_at,
            type: "Délai",
            severity: threadAnalysis?.deadline_violations?.severity || "Moyenne",
            description: threadAnalysis?.deadline_violations?.details?.join(", ") || "Délai non respecté",
            institution,
            legalBasis: ["Art. 29 al. 1 Cst.", "Art. 46a PA"]
          });
        }

        // Check for unanswered questions
        if (threadAnalysis?.unanswered_questions?.detected) {
          unansweredQuestions++;
          institutionMap[institution].count++;
          institutionMap[institution].types.add("Sans réponse");
        }

        // Count by severity
        const severity = (analysis.gravite || "").toLowerCase();
        if (severity === "critique" || severity === "critical") criticalCount++;
        else if (severity === "haute" || severity === "high") highCount++;
        else if (severity === "moyenne" || severity === "medium") mediumCount++;
        else if (severity === "faible" || severity === "low") lowCount++;
      });

      const totalViolations = consentViolations + collaborationViolations + lostDocuments + deadlineViolations;

      setStats({
        consentViolations,
        collaborationViolations,
        lostDocuments,
        deadlineViolations,
        unilateralDecisions,
        unansweredQuestions,
        totalViolations,
        criticalCount,
        highCount,
        mediumCount,
        lowCount
      });

      // Sort violations by date
      violationDetails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setViolations(violationDetails);

      // Convert institution map to array
      const institutionArray = Object.entries(institutionMap)
        .map(([institution, data]) => ({
          institution,
          count: data.count,
          types: Array.from(data.types)
        }))
        .filter(i => i.count > 0)
        .sort((a, b) => b.count - a.count);
      
      setInstitutionViolations(institutionArray);

    } catch (error) {
      console.error("Error fetching violations:", error);
      toast.error("Erreur lors du chargement des violations");
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: "Consentement", value: stats.consentViolations, color: COLORS.consent },
    { name: "Collaboration", value: stats.collaborationViolations, color: COLORS.collaboration },
    { name: "Documents perdus", value: stats.lostDocuments, color: COLORS.documents },
    { name: "Délais", value: stats.deadlineViolations, color: COLORS.deadlines },
  ].filter(d => d.value > 0);

  const severityData = [
    { name: "Critique", value: stats.criticalCount, fill: SEVERITY_COLORS.critical },
    { name: "Haute", value: stats.highCount, fill: SEVERITY_COLORS.high },
    { name: "Moyenne", value: stats.mediumCount, fill: SEVERITY_COLORS.medium },
    { name: "Faible", value: stats.lowCount, fill: SEVERITY_COLORS.low },
  ].filter(d => d.value > 0);

  const getSeverityBadge = (severity: string) => {
    const s = severity.toLowerCase();
    if (s === "critique" || s === "critical") return <Badge variant="destructive">Critique</Badge>;
    if (s === "haute" || s === "high") return <Badge className="bg-orange-500">Haute</Badge>;
    if (s === "moyenne" || s === "medium") return <Badge className="bg-yellow-500">Moyenne</Badge>;
    return <Badge variant="secondary">Faible</Badge>;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Consentement": return <Shield className="h-4 w-4 text-red-500" />;
      case "Collaboration": return <UserX className="h-4 w-4 text-orange-500" />;
      case "Documents perdus": return <FileX className="h-4 w-4 text-purple-500" />;
      case "Délai": return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <RefreshCw className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Analyse des violations en cours...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Scale className="h-8 w-8 text-primary" />
              Tableau de Bord des Violations
            </h1>
            <p className="text-muted-foreground mt-1">
              Analyse des violations des droits du pupille dans le cadre de la curatelle volontaire
            </p>
          </div>
          <Button onClick={fetchViolations} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-500" />
                Violations Consentement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{stats.consentViolations}</div>
              <p className="text-xs text-muted-foreground mt-1">Échanges d'infos sans accord</p>
            </CardContent>
          </Card>

          <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserX className="h-4 w-4 text-orange-500" />
                Violations Collaboration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">{stats.collaborationViolations}</div>
              <p className="text-xs text-muted-foreground mt-1">
                dont {stats.unilateralDecisions} décisions unilatérales
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileX className="h-4 w-4 text-purple-500" />
                Documents Perdus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-500">{stats.lostDocuments}</div>
              <p className="text-xs text-muted-foreground mt-1">Courriers, décisions non transmis</p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Violations Délais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">{stats.deadlineViolations}</div>
              <p className="text-xs text-muted-foreground mt-1">
                + {stats.unansweredQuestions} questions sans réponse
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Severity Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Répartition par Gravité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <div className="text-2xl font-bold text-red-500">{stats.criticalCount}</div>
                <p className="text-sm text-muted-foreground">Critiques</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                <div className="text-2xl font-bold text-orange-500">{stats.highCount}</div>
                <p className="text-sm text-muted-foreground">Hautes</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="text-2xl font-bold text-yellow-500">{stats.mediumCount}</div>
                <p className="text-sm text-muted-foreground">Moyennes</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="text-2xl font-bold text-green-500">{stats.lowCount}</div>
                <p className="text-sm text-muted-foreground">Faibles</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Détails ({violations.length})
            </TabsTrigger>
            <TabsTrigger value="institutions" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Par Institution
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Types de Violations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPie>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Aucune violation détectée
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Bar Chart Severity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Gravité des Violations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {severityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={severityData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {severityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      Aucune donnée de gravité
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Legal Context Card */}
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Contexte Juridique - Curatelle Volontaire
                </CardTitle>
                <CardDescription>
                  Rappel des droits du pupille dans le cadre d'une curatelle de gestion et représentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2">Art. 394 CC - Curatelle de coopération</h4>
                    <p className="text-sm text-muted-foreground">
                      Le curateur doit ASSISTER le pupille, pas décider à sa place. Toute action nécessite la collaboration.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2">Art. 406 CC - Devoirs du curateur</h4>
                    <p className="text-sm text-muted-foreground">
                      Le curateur doit tenir compte de l'AVIS du pupille et respecter sa VOLONTÉ autant que possible.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2">Art. 30 LPD - Communication à des tiers</h4>
                    <p className="text-sm text-muted-foreground">
                      Tout échange d'informations personnelles avec des tiers nécessite le CONSENTEMENT explicite.
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <h4 className="font-semibold mb-2">Art. 29 Cst. - Droit d'être entendu</h4>
                    <p className="text-sm text-muted-foreground">
                      Le pupille a le droit d'être entendu AVANT toute décision le concernant.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Liste des Violations Détectées</CardTitle>
                <CardDescription>
                  Toutes les violations identifiées par l'analyse IA, triées par date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className={isMobile ? "space-y-3 pb-4" : "space-y-3 max-h-[600px] overflow-y-auto pr-2"}>
                    {violations.length > 0 ? violations.map((violation) => (
                      <div
                        key={violation.id}
                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            {getTypeIcon(violation.type)}
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline">{violation.type}</Badge>
                                {getSeverityBadge(violation.severity)}
                                <span className="text-xs text-muted-foreground">
                                  {new Date(violation.date).toLocaleDateString("fr-CH")}
                                </span>
                              </div>
                              <p className="font-medium text-sm">{violation.subject}</p>
                              <p className="text-sm text-muted-foreground">{violation.description}</p>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <Building2 className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{violation.institution}</span>
                                {violation.legalBasis.length > 0 && (
                                  <>
                                    <span className="text-muted-foreground">•</span>
                                    <span className="text-xs text-primary">
                                      {violation.legalBasis.slice(0, 2).join(", ")}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <EmailLink
                            emailId={violation.emailId}
                            label="Voir l'email"
                            variant="cta"
                            size="sm"
                            tooltip="Voir l'email source de cette violation"
                          />
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Aucune violation détectée pour le moment</p>
                        <p className="text-sm mt-2">Lancez une analyse des emails pour détecter les violations</p>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="institutions">
            <Card>
              <CardHeader>
                <CardTitle>Violations par Institution</CardTitle>
                <CardDescription>
                  Répartition des violations par organisme concerné
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {institutionViolations.length > 0 ? institutionViolations.map((inst, index) => (
                    <div key={index} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-5 w-5 text-primary" />
                          <span className="font-medium">{inst.institution}</span>
                        </div>
                        <Badge variant="secondary">{inst.count} violation(s)</Badge>
                      </div>
                      <Progress 
                        value={(inst.count / Math.max(...institutionViolations.map(i => i.count))) * 100} 
                        className="h-2 mb-2"
                      />
                      <div className="flex flex-wrap gap-2">
                        {inst.types.map((type, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Aucune institution avec violations détectées</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}