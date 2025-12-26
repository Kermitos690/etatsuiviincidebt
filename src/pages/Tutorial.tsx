import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Mail, 
  FileSearch, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  Zap,
  Database,
  Brain,
  FileText,
  Clock,
  CheckCircle,
  ArrowRight,
  Workflow,
  Shield,
  Users,
  Download,
  RefreshCw,
  Eye,
  PlusCircle,
  Filter,
  Search
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Import tutorial images
import gmailConfigImg from "@/assets/tutorial/gmail-config.png";
import emailSyncImg from "@/assets/tutorial/email-sync.png";
import analysisPipelineImg from "@/assets/tutorial/analysis-pipeline.png";
import emailsAnalyzedImg from "@/assets/tutorial/emails-analyzed.png";
import incidentsImg from "@/assets/tutorial/incidents.png";
import dashboardImg from "@/assets/tutorial/dashboard.png";
import attachmentsImg from "@/assets/tutorial/attachments.png";
import violationsImg from "@/assets/tutorial/violations.png";
import exportsImg from "@/assets/tutorial/exports.png";
import iaAuditorImg from "@/assets/tutorial/ia-auditor.png";
import iaTrainingImg from "@/assets/tutorial/ia-training.png";

const TutorialSection = ({ 
  icon: Icon, 
  title, 
  description, 
  steps,
  result,
  tips,
  image
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  steps: string[];
  result: string;
  tips?: string[];
  image?: string;
}) => (
  <Card className="glass-card border-border/30">
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/20 text-primary">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Screenshot */}
      {image && (
        <div className="rounded-xl overflow-hidden border border-border/30 shadow-lg">
          <img 
            src={image} 
            alt={`Capture d'écran - ${title}`}
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      <div>
        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Workflow className="w-4 h-4 text-primary" />
          Étapes à suivre
        </h4>
        <ol className="space-y-2">
          {steps.map((step, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-medium">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      
      <Separator className="bg-border/30" />
      
      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
        <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Résultat attendu
        </h4>
        <p className="text-muted-foreground text-sm">{result}</p>
      </div>

      {tips && tips.length > 0 && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <h4 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Conseils
          </h4>
          <ul className="space-y-1">
            {tips.map((tip, index) => (
              <li key={index} className="text-muted-foreground text-sm flex items-start gap-2">
                <ArrowRight className="w-3 h-3 mt-1 text-yellow-400 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </CardContent>
  </Card>
);

const WorkflowStep = ({ number, title, description, isLast = false }: { number: number; title: string; description: string; isLast?: boolean }) => (
  <div className="flex items-start gap-4">
    <div className="flex flex-col items-center">
      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
        {number}
      </div>
      {!isLast && <div className="w-0.5 h-16 bg-primary/30 mt-2" />}
    </div>
    <div className="pb-8">
      <h4 className="font-semibold text-foreground">{title}</h4>
      <p className="text-muted-foreground text-sm mt-1">{description}</p>
    </div>
  </div>
);

export default function Tutorial() {
  return (
    <AppLayout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge variant="outline" className="border-primary/50 text-primary">
            Guide Complet
          </Badge>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Tutoriel - Système de Vigilance Juridique
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Guide exhaustif pour maîtriser toutes les fonctionnalités du système de surveillance et d'analyse des incidents juridiques.
          </p>
        </div>

        {/* Quick Overview */}
        <Card className="glass-card border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              Vue d'ensemble du système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Ce système est conçu pour surveiller, analyser et documenter les dysfonctionnements institutionnels 
              à travers l'analyse automatisée des emails, la détection d'incidents et la génération de rapports juridiques.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Mail, label: "Emails", desc: "Synchronisation Gmail" },
                { icon: Brain, label: "IA", desc: "Analyse automatique" },
                { icon: AlertTriangle, label: "Incidents", desc: "Détection & suivi" },
                { icon: FileText, label: "Rapports", desc: "Export juridique" },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-lg bg-background/50 border border-border/30 text-center">
                  <item.icon className="w-8 h-8 mx-auto text-primary mb-2" />
                  <div className="font-medium text-foreground">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Workflow Global */}
        <Card className="glass-card border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-primary" />
              Flux de travail recommandé
            </CardTitle>
            <CardDescription>
              Suivez ces étapes dans l'ordre pour une utilisation optimale du système
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <WorkflowStep 
                  number={1} 
                  title="Configurer Gmail" 
                  description="Connectez votre compte Gmail pour synchroniser automatiquement les emails entrants et sortants."
                />
                <WorkflowStep 
                  number={2} 
                  title="Synchroniser les emails" 
                  description="Lancez une synchronisation complète pour récupérer tous les emails de tous les dossiers."
                />
                <WorkflowStep 
                  number={3} 
                  title="Analyser les emails" 
                  description="Utilisez le pipeline d'analyse pour extraire les faits, détecter les violations et identifier les acteurs."
                />
              </div>
              <div>
                <WorkflowStep 
                  number={4} 
                  title="Créer des incidents" 
                  description="Les incidents sont créés automatiquement ou manuellement à partir des analyses."
                />
                <WorkflowStep 
                  number={5} 
                  title="Valider et enrichir" 
                  description="Révisez les incidents, ajoutez des preuves et validez les analyses de l'IA."
                />
                <WorkflowStep 
                  number={6} 
                  title="Exporter les rapports" 
                  description="Générez des rapports PDF pour le juge de paix ou d'autres autorités."
                  isLast
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Sections */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Fonctionnalités détaillées</h2>
          
          <Accordion type="single" collapsible className="space-y-4">
            {/* Configuration Gmail */}
            <AccordionItem value="gmail" className="border-none">
              <AccordionTrigger className="glass-card px-6 py-4 rounded-lg hover:no-underline">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-primary" />
                  <span className="font-semibold">1. Configuration Gmail</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <TutorialSection
                  icon={Settings}
                  title="Configuration Gmail"
                  description="Connectez et configurez votre compte Gmail pour la synchronisation automatique"
                  image={gmailConfigImg}
                  steps={[
                    "Accédez à 'Configuration Gmail' dans le menu latéral",
                    "Cliquez sur 'Connecter Gmail' pour lancer le processus OAuth",
                    "Autorisez l'accès à votre compte Google",
                    "Configurez les domaines à surveiller (ex: @institution.be)",
                    "Ajoutez des mots-clés de filtrage pour cibler les emails pertinents",
                    "Activez la synchronisation automatique"
                  ]}
                  result="Votre compte Gmail est connecté. Le système synchronisera automatiquement les nouveaux emails correspondant à vos filtres."
                  tips={[
                    "Utilisez des domaines spécifiques pour filtrer uniquement les emails institutionnels",
                    "Les mots-clés peuvent inclure : 'convocation', 'décision', 'notification'",
                    "La synchronisation récupère les emails de tous les dossiers : Inbox, Envoyés, Spam, Corbeille"
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Synchronisation */}
            <AccordionItem value="sync" className="border-none">
              <AccordionTrigger className="glass-card px-6 py-4 rounded-lg hover:no-underline">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  <span className="font-semibold">2. Synchronisation des emails</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <TutorialSection
                  icon={RefreshCw}
                  title="Synchronisation des emails"
                  description="Récupérez tous vos emails depuis Gmail vers le système"
                  image={emailSyncImg}
                  steps={[
                    "Accédez à 'Boîte de réception' dans le menu",
                    "Cliquez sur le bouton 'Synchroniser' en haut à droite",
                    "Choisissez le type de synchronisation : rapide (nouveaux) ou complète (tous)",
                    "Attendez la fin du processus (peut prendre plusieurs minutes)",
                    "Vérifiez le nombre d'emails récupérés dans les statistiques"
                  ]}
                  result="Tous vos emails sont importés dans le système avec leurs métadonnées, corps de texte et pièces jointes."
                  tips={[
                    "La première synchronisation peut prendre du temps si vous avez beaucoup d'emails",
                    "Les pièces jointes sont téléchargées automatiquement",
                    "Les emails déjà importés ne sont pas dupliqués"
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Pipeline d'analyse */}
            <AccordionItem value="pipeline" className="border-none">
              <AccordionTrigger className="glass-card px-6 py-4 rounded-lg hover:no-underline">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-primary" />
                  <span className="font-semibold">3. Pipeline d'analyse IA</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <TutorialSection
                  icon={Zap}
                  title="Pipeline d'analyse IA"
                  description="Centre de contrôle pour lancer et gérer toutes les analyses automatisées"
                  image={analysisPipelineImg}
                  steps={[
                    "Accédez à 'Pipeline d'Analyse' dans le menu",
                    "Consultez les statistiques actuelles (emails analysés, threads, etc.)",
                    "Lancez l'analyse des emails non traités",
                    "Exécutez l'extraction des faits pour chaque email",
                    "Déclenchez l'analyse des threads (conversations)",
                    "Lancez la corroboration croisée pour valider les preuves"
                  ]}
                  result="Les emails sont analysés, les faits extraits, les threads reconstitués et les preuves corroborées automatiquement."
                  tips={[
                    "L'analyse par batch permet de traiter plusieurs emails à la fois",
                    "Les threads regroupent les emails d'une même conversation",
                    "La corroboration croise les informations pour détecter contradictions et confirmations"
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Emails analysés */}
            <AccordionItem value="emails" className="border-none">
              <AccordionTrigger className="glass-card px-6 py-4 rounded-lg hover:no-underline">
                <div className="flex items-center gap-3">
                  <FileSearch className="w-5 h-5 text-primary" />
                  <span className="font-semibold">4. Emails analysés</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <TutorialSection
                  icon={FileSearch}
                  title="Consultation des emails analysés"
                  description="Visualisez les résultats d'analyse de chaque email"
                  image={emailsAnalyzedImg}
                  steps={[
                    "Accédez à 'Emails Analysés' dans le menu",
                    "Utilisez les filtres pour trouver des emails spécifiques",
                    "Cliquez sur un email pour voir son analyse détaillée",
                    "Consultez les faits extraits, personnes mentionnées, dates",
                    "Visualisez le niveau d'urgence et le sentiment détecté",
                    "Créez un incident directement depuis l'email si nécessaire"
                  ]}
                  result="Vous avez une vue complète de chaque email avec toutes les informations extraites par l'IA."
                  tips={[
                    "Filtrez par sentiment (négatif, neutre, positif) pour identifier les problèmes",
                    "Le niveau d'urgence aide à prioriser les actions",
                    "Les personnes et institutions mentionnées sont automatiquement identifiées"
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Incidents */}
            <AccordionItem value="incidents" className="border-none">
              <AccordionTrigger className="glass-card px-6 py-4 rounded-lg hover:no-underline">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-primary" />
                  <span className="font-semibold">5. Gestion des incidents</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <TutorialSection
                  icon={AlertTriangle}
                  title="Gestion des incidents"
                  description="Créez, suivez et documentez les incidents juridiques"
                  image={incidentsImg}
                  steps={[
                    "Accédez à 'Incidents' dans le menu pour voir la liste",
                    "Cliquez sur 'Nouvel incident' pour en créer un manuellement",
                    "Remplissez les champs : titre, type, gravité, institution, faits",
                    "Liez l'incident à un email source si applicable",
                    "Ajoutez des preuves et références Gmail",
                    "Définissez le statut : ouvert, en cours, résolu, transmis",
                    "Marquez comme 'Transmis JP' une fois envoyé au juge de paix"
                  ]}
                  result="Chaque incident est documenté avec un numéro unique, une chronologie et des preuves liées."
                  tips={[
                    "Utilisez la gravité (faible, moyenne, élevée, critique) pour prioriser",
                    "Le score de l'incident reflète son impact cumulé",
                    "La timeline permet de voir tous les incidents chronologiquement"
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Dashboard Audit */}
            <AccordionItem value="audit" className="border-none">
              <AccordionTrigger className="glass-card px-6 py-4 rounded-lg hover:no-underline">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <span className="font-semibold">6. Dashboard d'audit</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <TutorialSection
                  icon={BarChart3}
                  title="Dashboard d'audit"
                  description="Vue d'ensemble des statistiques et alertes du système"
                  image={dashboardImg}
                  steps={[
                    "Accédez au 'Dashboard' dans le menu",
                    "Consultez les KPIs : emails, incidents, violations",
                    "Visualisez les graphiques de tendances",
                    "Identifiez les alertes actives nécessitant attention",
                    "Analysez la répartition par institution",
                    "Suivez les récurrences et patterns détectés"
                  ]}
                  result="Vous avez une vision globale de l'état du système et des actions prioritaires à mener."
                  tips={[
                    "Les alertes non résolues sont affichées en rouge",
                    "Le score cumulatif reflète l'impact total des violations",
                    "Les graphiques permettent d'identifier les tendances temporelles"
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Pièces jointes */}
            <AccordionItem value="attachments" className="border-none">
              <AccordionTrigger className="glass-card px-6 py-4 rounded-lg hover:no-underline">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-primary" />
                  <span className="font-semibold">7. Pièces jointes</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <TutorialSection
                  icon={Database}
                  title="Gestion des pièces jointes"
                  description="Téléchargez et analysez les documents joints aux emails"
                  image={attachmentsImg}
                  steps={[
                    "Accédez à 'Pièces jointes' dans le menu",
                    "Consultez la liste de toutes les pièces jointes",
                    "Cliquez sur 'Télécharger' pour récupérer un fichier",
                    "Utilisez 'Analyser' pour lancer l'analyse IA du document",
                    "Filtrez par type de fichier (PDF, images, documents)",
                    "Associez les pièces jointes pertinentes aux incidents"
                  ]}
                  result="Les pièces jointes sont stockées, leur contenu est extrait (OCR) et analysé par l'IA."
                  tips={[
                    "L'OCR permet d'extraire le texte des images et PDF scannés",
                    "Les documents analysés peuvent révéler des preuves supplémentaires",
                    "Le stockage sécurisé préserve les originaux"
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Violations */}
            <AccordionItem value="violations" className="border-none">
              <AccordionTrigger className="glass-card px-6 py-4 rounded-lg hover:no-underline">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <span className="font-semibold">8. Dashboard Violations</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <TutorialSection
                  icon={Shield}
                  title="Dashboard des violations"
                  description="Suivi des violations légales et récurrences détectées"
                  image={violationsImg}
                  steps={[
                    "Accédez à 'Violations' dans le menu",
                    "Consultez les récurrences par type de violation",
                    "Identifiez les institutions les plus problématiques",
                    "Analysez les implications légales détectées",
                    "Exportez les données pour rapports juridiques"
                  ]}
                  result="Vue consolidée de toutes les violations avec leur fréquence et implications légales."
                  tips={[
                    "Les récurrences renforcent la valeur probatoire",
                    "Les implications légales citent les articles de loi violés",
                    "Utilisez ces données pour construire un dossier solide"
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Exports */}
            <AccordionItem value="exports" className="border-none">
              <AccordionTrigger className="glass-card px-6 py-4 rounded-lg hover:no-underline">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-primary" />
                  <span className="font-semibold">9. Exports et rapports</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <TutorialSection
                  icon={Download}
                  title="Exports et rapports"
                  description="Générez des rapports PDF et exportez vos données"
                  image={exportsImg}
                  steps={[
                    "Accédez à 'Exports' dans le menu",
                    "Sélectionnez le type de rapport à générer",
                    "Choisissez la période et les filtres",
                    "Générez le rapport mensuel automatique",
                    "Téléchargez le PDF pour impression ou envoi",
                    "Synchronisez avec Google Sheets si configuré"
                  ]}
                  result="Rapports professionnels prêts à être transmis aux autorités judiciaires."
                  tips={[
                    "Le rapport mensuel inclut un résumé, les incidents et les références légales",
                    "Les exports Google Sheets permettent un suivi collaboratif",
                    "Conservez une copie de chaque rapport généré"
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            {/* IA Auditeur */}
            <AccordionItem value="ia-auditor" className="border-none">
              <AccordionTrigger className="glass-card px-6 py-4 rounded-lg hover:no-underline">
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-primary" />
                  <span className="font-semibold">10. IA Auditeur</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <TutorialSection
                  icon={Brain}
                  title="IA Auditeur - Analyse quotidienne"
                  description="Système d'audit automatique avec analyse quotidienne des données"
                  image={iaAuditorImg}
                  steps={[
                    "Accédez à 'IA Auditeur' dans le menu",
                    "Consultez les alertes générées automatiquement",
                    "Lancez une analyse d'audit manuelle si nécessaire",
                    "Révisez les détections et marquez-les comme résolues",
                    "Configurez les seuils de détection si besoin"
                  ]}
                  result="Le système détecte automatiquement les anomalies et génère des alertes prioritaires."
                  tips={[
                    "L'analyse quotidienne s'exécute automatiquement",
                    "Les alertes critiques sont mises en évidence",
                    "Chaque alerte contient une référence légale si applicable"
                  ]}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Entraînement IA */}
            <AccordionItem value="ia-training" className="border-none">
              <AccordionTrigger className="glass-card px-6 py-4 rounded-lg hover:no-underline">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="font-semibold">11. Entraînement IA</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <TutorialSection
                  icon={Users}
                  title="Entraînement de l'IA"
                  description="Améliorez les détections en fournissant des feedbacks"
                  image={iaTrainingImg}
                  steps={[
                    "Accédez à 'Entraînement IA' dans le menu",
                    "Consultez les analyses nécessitant validation",
                    "Validez ou corrigez les détections de l'IA",
                    "Ajoutez des notes explicatives pour les corrections",
                    "Marquez les feedbacks comme utilisés pour l'entraînement"
                  ]}
                  result="L'IA s'améliore progressivement grâce à vos corrections et validations."
                  tips={[
                    "Plus vous validez, plus l'IA devient précise",
                    "Les corrections sont utilisées pour améliorer les modèles",
                    "Consultez les scores de confiance des acteurs"
                  ]}
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Best Practices */}
        <Card className="glass-card border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Bonnes pratiques
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">À faire ✓</h4>
                <ul className="space-y-2">
                  {[
                    "Synchronisez régulièrement vos emails",
                    "Validez les analyses de l'IA pour l'améliorer",
                    "Documentez chaque incident avec précision",
                    "Exportez des rapports mensuels régulièrement",
                    "Liez les preuves aux incidents correspondants",
                    "Utilisez les filtres pour cibler vos recherches"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">À éviter ✗</h4>
                <ul className="space-y-2">
                  {[
                    "Ne modifiez pas les emails originaux",
                    "Ne supprimez pas les pièces jointes sources",
                    "Ne validez pas sans vérifier les détections",
                    "Ne négligez pas les alertes critiques",
                    "Ne laissez pas les incidents sans suivi",
                    "Ne partagez pas les accès à des tiers"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Glossary */}
        <Card className="glass-card border-border/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Glossaire
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { term: "Thread", def: "Conversation email regroupant tous les messages d'un même échange" },
                { term: "Corroboration", def: "Validation croisée des preuves entre différentes sources" },
                { term: "Récurrence", def: "Répétition d'un même type de violation par une institution" },
                { term: "Score d'incident", def: "Valeur numérique reflétant l'impact et la gravité" },
                { term: "RLS", def: "Row Level Security - Protection des données par utilisateur" },
                { term: "OCR", def: "Reconnaissance optique de caractères pour extraire du texte" },
                { term: "Pipeline", def: "Chaîne de traitement automatique des données" },
                { term: "Transmis JP", def: "Incident transmis au Juge de Paix" },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/30">
                  <span className="font-semibold text-primary">{item.term}</span>
                  <p className="text-sm text-muted-foreground mt-1">{item.def}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
