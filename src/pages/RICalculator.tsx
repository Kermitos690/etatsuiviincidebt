import { useState, useMemo, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, Users, Home, MapPin, Briefcase, Info, TrendingUp, AlertCircle, Download, AlertTriangle, Scale } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import jsPDF from "jspdf";

// Normes CSIAS 2024 adaptées Vaud
const FORFAITS_ENTRETIEN: Record<number, number> = {
  1: 1031,
  2: 1577,
  3: 1918,
  4: 2201,
  5: 2456,
  6: 2683,
  7: 2910,
  8: 3137,
};

const PLAFONDS_LOYER: Record<string, Record<number, number>> = {
  A: { 1: 1100, 2: 1350, 3: 1550, 4: 1700, 5: 1850, 6: 2000, 7: 2150, 8: 2300 },
  B: { 1: 1000, 2: 1250, 3: 1450, 4: 1600, 5: 1750, 6: 1900, 7: 2050, 8: 2200 },
  C: { 1: 900, 2: 1150, 3: 1350, 4: 1500, 5: 1650, 6: 1800, 7: 1950, 8: 2100 },
};

const ZONES = [
  { value: "A", label: "Zone A - Lausanne, Pully, Prilly, Renens" },
  { value: "B", label: "Zone B - Morges, Nyon, Vevey, Montreux, Yverdon" },
  { value: "C", label: "Zone C - Autres régions VD" },
];

const PRIME_AM_BASE = 450;
const FRANCHISE_SALAIRE_TAUX = 0.25;
const FRANCHISE_SALAIRE_MAX = 400;
const SIS_MAX = 100;
const SIP_MAX = 300;

// Sanctions RI
const SANCTIONS = [
  { niveau: 0, label: "Aucune sanction", reduction: 0, description: "Situation normale, pas de manquement" },
  { niveau: 1, label: "Niveau 1 - Avertissement", reduction: 0, description: "Premier manquement mineur, avertissement écrit" },
  { niveau: 2, label: "Niveau 2 - Réduction 15%", reduction: 0.15, description: "Non-respect des obligations légères (ex: absence à un rendez-vous)" },
  { niveau: 3, label: "Niveau 3 - Réduction 30%", reduction: 0.30, description: "Non-respect répété ou manquement modéré (ex: refus de mesure d'insertion)" },
  { niveau: 4, label: "Niveau 4 - Réduction 50%", reduction: 0.50, description: "Manquement grave (ex: refus de collaboration, travail au noir)" },
  { niveau: 5, label: "Niveau 5 - Suspension", reduction: 1.0, description: "Refus total de collaboration, fraude avérée" },
];

const RICalculator = () => {
  // État du formulaire
  const [tailleManager, setTailleManager] = useState(1);
  const [zone, setZone] = useState("A");
  const [loyerEffectif, setLoyerEffectif] = useState(1000);
  const [primeAM, setPrimeAM] = useState(PRIME_AM_BASE);
  const [salaire, setSalaire] = useState(0);
  const [autresRevenus, setAutresRevenus] = useState(0);
  const [hasSIS, setHasSIS] = useState(false);
  const [hasSIP, setHasSIP] = useState(false);
  const [fraisMedicaux, setFraisMedicaux] = useState(0);
  const [fraisGarde, setFraisGarde] = useState(0);
  
  // Sanctions
  const [sanctionNiveau, setSanctionNiveau] = useState(0);

  // Calculs
  const calculs = useMemo(() => {
    const forfait = FORFAITS_ENTRETIEN[Math.min(tailleManager, 8)] || 
      FORFAITS_ENTRETIEN[8] + (tailleManager - 8) * 227;

    const plafondLoyer = PLAFONDS_LOYER[zone][Math.min(tailleManager, 8)] ||
      PLAFONDS_LOYER[zone][8] + (tailleManager - 8) * 150;
    
    const loyerReconnu = Math.min(loyerEffectif, plafondLoyer);
    const depassementLoyer = loyerEffectif > plafondLoyer ? loyerEffectif - plafondLoyer : 0;

    const sis = hasSIS ? SIS_MAX : 0;
    const sip = hasSIP ? SIP_MAX : 0;

    const besoinsReconnus = forfait + loyerReconnu + primeAM + fraisMedicaux + fraisGarde + sis + sip;

    const franchiseSalaire = Math.min(salaire * FRANCHISE_SALAIRE_TAUX, FRANCHISE_SALAIRE_MAX);
    const salairePrisEnCompte = salaire - franchiseSalaire;

    const revenusDeterminants = salairePrisEnCompte + autresRevenus;

    const montantRIBrut = Math.max(0, besoinsReconnus - revenusDeterminants);
    
    // Application de la sanction sur le forfait uniquement
    const sanction = SANCTIONS[sanctionNiveau];
    const montantSanction = Math.round(forfait * sanction.reduction);
    const montantRI = Math.max(0, montantRIBrut - montantSanction);

    const totalRessources = montantRI + salaire + autresRevenus;

    return {
      forfait,
      plafondLoyer,
      loyerReconnu,
      depassementLoyer,
      sis,
      sip,
      besoinsReconnus,
      franchiseSalaire,
      salairePrisEnCompte,
      revenusDeterminants,
      montantRIBrut,
      montantSanction,
      montantRI,
      totalRessources,
      sanction,
    };
  }, [tailleManager, zone, loyerEffectif, primeAM, salaire, autresRevenus, hasSIS, hasSIP, fraisMedicaux, fraisGarde, sanctionNiveau]);

  // Export PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    // Titre
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Calcul Budget Revenu d'Insertion (RI)", pageWidth / 2, y, { align: "center" });
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Normes CSIAS 2024 - Canton de Vaud | ${new Date().toLocaleDateString('fr-CH')}`, pageWidth / 2, y, { align: "center" });
    y += 15;

    // Situation
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Situation du ménage", 20, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Composition: ${tailleManager} personne(s)`, 25, y);
    y += 6;
    doc.text(`Zone géographique: ${ZONES.find(z => z.value === zone)?.label}`, 25, y);
    y += 6;
    doc.text(`Loyer effectif: ${loyerEffectif.toLocaleString('fr-CH')} CHF/mois`, 25, y);
    y += 12;

    // Besoins reconnus
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Besoins reconnus", 20, y);
    y += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    const besoins = [
      [`Forfait d'entretien (${tailleManager} pers.)`, `${calculs.forfait.toLocaleString('fr-CH')} CHF`],
      ["Loyer reconnu", `${calculs.loyerReconnu.toLocaleString('fr-CH')} CHF`],
      ["Prime assurance-maladie", `${primeAM.toLocaleString('fr-CH')} CHF`],
    ];
    
    if (fraisMedicaux > 0) besoins.push(["Frais médicaux", `${fraisMedicaux.toLocaleString('fr-CH')} CHF`]);
    if (fraisGarde > 0) besoins.push(["Frais de garde", `${fraisGarde.toLocaleString('fr-CH')} CHF`]);
    if (calculs.sis > 0) besoins.push(["SIS", `+${calculs.sis.toLocaleString('fr-CH')} CHF`]);
    if (calculs.sip > 0) besoins.push(["SIP", `+${calculs.sip.toLocaleString('fr-CH')} CHF`]);
    
    besoins.forEach(([label, value]) => {
      doc.text(label, 25, y);
      doc.text(value, 150, y, { align: "right" });
      y += 6;
    });
    
    doc.setFont("helvetica", "bold");
    doc.text("Total besoins", 25, y);
    doc.text(`${calculs.besoinsReconnus.toLocaleString('fr-CH')} CHF`, 150, y, { align: "right" });
    y += 12;

    // Revenus
    doc.setFont("helvetica", "bold");
    doc.text("Revenus déterminants", 20, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    
    if (salaire > 0) {
      doc.text("Salaire net", 25, y);
      doc.text(`${salaire.toLocaleString('fr-CH')} CHF`, 150, y, { align: "right" });
      y += 6;
      doc.text("Franchise (25%, max 400)", 25, y);
      doc.text(`-${calculs.franchiseSalaire.toLocaleString('fr-CH')} CHF`, 150, y, { align: "right" });
      y += 6;
    }
    
    if (autresRevenus > 0) {
      doc.text("Autres revenus", 25, y);
      doc.text(`${autresRevenus.toLocaleString('fr-CH')} CHF`, 150, y, { align: "right" });
      y += 6;
    }
    
    doc.setFont("helvetica", "bold");
    doc.text("Total revenus", 25, y);
    doc.text(`${calculs.revenusDeterminants.toLocaleString('fr-CH')} CHF`, 150, y, { align: "right" });
    y += 12;

    // Sanction si applicable
    if (sanctionNiveau > 1) {
      doc.setFont("helvetica", "bold");
      doc.text("Sanction appliquée", 20, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.text(calculs.sanction.label, 25, y);
      doc.text(`-${calculs.montantSanction.toLocaleString('fr-CH')} CHF`, 150, y, { align: "right" });
      y += 12;
    }

    // Résultat
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y - 5, pageWidth - 30, 20, "F");
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("MONTANT RI MENSUEL", 20, y + 5);
    doc.text(`${calculs.montantRI.toLocaleString('fr-CH')} CHF`, 150, y + 5, { align: "right" });
    y += 25;

    // Formule
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Formule: RI = Besoins (${calculs.besoinsReconnus}) - Revenus (${calculs.revenusDeterminants})${sanctionNiveau > 1 ? ` - Sanction (${calculs.montantSanction})` : ''} = ${calculs.montantRI} CHF`, 20, y);
    y += 10;

    // Avertissement
    doc.setFontSize(8);
    doc.text("Note: Ce calcul est indicatif et basé sur les normes CSIAS 2024. Le montant effectif peut varier.", 20, y);
    y += 5;
    doc.text("Consultez votre CSR (Centre Social Régional) pour une évaluation complète.", 20, y);

    doc.save(`calcul-ri-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF exporté avec succès");
  };

  const InfoTooltip = ({ content }: { content: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-4 w-4 text-muted-foreground cursor-help inline ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <AppLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Calculator className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Calculateur Budget RI</h1>
              <p className="text-muted-foreground">
                Calcul du Revenu d'Insertion selon les normes CSIAS 2024 - Canton de Vaud
              </p>
            </div>
          </div>
          <Button onClick={exportPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Exporter PDF
          </Button>
        </div>

        <Tabs defaultValue="calculator" className="space-y-6">
          <TabsList>
            <TabsTrigger value="calculator" className="gap-2">
              <Calculator className="h-4 w-4" />
              Calculateur
            </TabsTrigger>
            <TabsTrigger value="sanctions" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Sanctions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Formulaire */}
              <div className="space-y-6">
                {/* Composition ménage */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5" />
                      Composition du ménage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Nombre de personnes</Label>
                        <Badge variant="secondary" className="text-lg px-3">
                          {tailleManager}
                        </Badge>
                      </div>
                      <Slider
                        value={[tailleManager]}
                        onValueChange={(v) => setTailleManager(v[0])}
                        min={1}
                        max={10}
                        step={1}
                        className="py-2"
                      />
                      <p className="text-sm text-muted-foreground">
                        Forfait d'entretien: <span className="font-semibold text-foreground">{calculs.forfait.toLocaleString('fr-CH')} CHF/mois</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Logement */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Home className="h-5 w-5" />
                      Logement
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        Zone géographique
                        <InfoTooltip content="Zone A: centres urbains. Zone B: agglomérations. Zone C: autres régions." />
                      </Label>
                      <Select value={zone} onValueChange={setZone}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ZONES.map((z) => (
                            <SelectItem key={z.value} value={z.value}>
                              {z.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        Plafond loyer: <span className="font-semibold text-foreground">{calculs.plafondLoyer.toLocaleString('fr-CH')} CHF/mois</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Loyer effectif (CHF/mois)</Label>
                      <Input
                        type="number"
                        value={loyerEffectif}
                        onChange={(e) => setLoyerEffectif(Number(e.target.value))}
                        min={0}
                        max={5000}
                      />
                      {calculs.depassementLoyer > 0 && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          Dépassement de {calculs.depassementLoyer} CHF non couvert
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Assurance et frais */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Assurance et frais médicaux</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Prime assurance-maladie (CHF/mois)</Label>
                      <Input
                        type="number"
                        value={primeAM}
                        onChange={(e) => setPrimeAM(Number(e.target.value))}
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Frais médicaux non couverts (CHF/mois)</Label>
                      <Input
                        type="number"
                        value={fraisMedicaux}
                        onChange={(e) => setFraisMedicaux(Number(e.target.value))}
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Frais de garde d'enfants (CHF/mois)</Label>
                      <Input
                        type="number"
                        value={fraisGarde}
                        onChange={(e) => setFraisGarde(Number(e.target.value))}
                        min={0}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Revenus */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Briefcase className="h-5 w-5" />
                      Revenus
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center">
                        Salaire net mensuel
                        <InfoTooltip content="Franchise de 25% appliquée (max 400 CHF) pour encourager le travail" />
                      </Label>
                      <Input
                        type="number"
                        value={salaire}
                        onChange={(e) => setSalaire(Number(e.target.value))}
                        min={0}
                      />
                      {salaire > 0 && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Franchise: -{calculs.franchiseSalaire.toLocaleString('fr-CH')} CHF (non comptabilisé)
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center">
                        Autres revenus (rentes, pensions, etc.)
                        <InfoTooltip content="Rentes AI, AVS, PC, pensions alimentaires, allocations familiales" />
                      </Label>
                      <Input
                        type="number"
                        value={autresRevenus}
                        onChange={(e) => setAutresRevenus(Number(e.target.value))}
                        min={0}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Suppléments */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5" />
                      Suppléments d'intégration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center">
                          SIS - Supplément intégration sociale
                          <InfoTooltip content="Accordé pour participation à des activités sociales, bénévolat, etc." />
                        </Label>
                        <p className="text-sm text-muted-foreground">Max {SIS_MAX} CHF/mois</p>
                      </div>
                      <Switch checked={hasSIS} onCheckedChange={setHasSIS} />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="flex items-center">
                          SIP - Supplément intégration professionnelle
                          <InfoTooltip content="Accordé pour activité professionnelle, stage ou formation" />
                        </Label>
                        <p className="text-sm text-muted-foreground">Max {SIP_MAX} CHF/mois</p>
                      </div>
                      <Switch checked={hasSIP} onCheckedChange={setHasSIP} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Résultats */}
              <div className="space-y-6">
                {/* Montant RI */}
                <Card className={sanctionNiveau > 1 ? "border-destructive/50 bg-destructive/5" : "border-primary/50 bg-primary/5"}>
                  <CardHeader>
                    <CardTitle className="text-lg">Montant RI estimé</CardTitle>
                    <CardDescription>Revenu d'Insertion mensuel</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-5xl font-bold ${sanctionNiveau > 1 ? "text-destructive" : "text-primary"}`}>
                      {calculs.montantRI.toLocaleString('fr-CH')} <span className="text-2xl">CHF</span>
                    </div>
                    {sanctionNiveau > 1 && (
                      <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Sanction: -{calculs.montantSanction.toLocaleString('fr-CH')} CHF ({calculs.sanction.label})
                      </p>
                    )}
                    <p className="text-muted-foreground mt-2">
                      Total ressources mensuelles: <span className="font-semibold text-foreground">{calculs.totalRessources.toLocaleString('fr-CH')} CHF</span>
                    </p>
                  </CardContent>
                </Card>

                {/* Détail besoins */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Besoins reconnus</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span>Forfait d'entretien ({tailleManager} pers.)</span>
                      <span className="font-medium">{calculs.forfait.toLocaleString('fr-CH')} CHF</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Loyer reconnu</span>
                      <span className="font-medium">{calculs.loyerReconnu.toLocaleString('fr-CH')} CHF</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Prime assurance-maladie</span>
                      <span className="font-medium">{primeAM.toLocaleString('fr-CH')} CHF</span>
                    </div>
                    {fraisMedicaux > 0 && (
                      <div className="flex justify-between">
                        <span>Frais médicaux</span>
                        <span className="font-medium">{fraisMedicaux.toLocaleString('fr-CH')} CHF</span>
                      </div>
                    )}
                    {fraisGarde > 0 && (
                      <div className="flex justify-between">
                        <span>Frais de garde</span>
                        <span className="font-medium">{fraisGarde.toLocaleString('fr-CH')} CHF</span>
                      </div>
                    )}
                    {calculs.sis > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>SIS</span>
                        <span className="font-medium">+{calculs.sis.toLocaleString('fr-CH')} CHF</span>
                      </div>
                    )}
                    {calculs.sip > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>SIP</span>
                        <span className="font-medium">+{calculs.sip.toLocaleString('fr-CH')} CHF</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total besoins</span>
                      <span>{calculs.besoinsReconnus.toLocaleString('fr-CH')} CHF</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Détail revenus */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Revenus déterminants</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {salaire > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span>Salaire brut</span>
                          <span className="font-medium">{salaire.toLocaleString('fr-CH')} CHF</span>
                        </div>
                        <div className="flex justify-between text-green-600 dark:text-green-400">
                          <span>Franchise (25%, max 400)</span>
                          <span className="font-medium">-{calculs.franchiseSalaire.toLocaleString('fr-CH')} CHF</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Salaire pris en compte</span>
                          <span className="font-medium">{calculs.salairePrisEnCompte.toLocaleString('fr-CH')} CHF</span>
                        </div>
                      </>
                    )}
                    {autresRevenus > 0 && (
                      <div className="flex justify-between">
                        <span>Autres revenus</span>
                        <span className="font-medium">{autresRevenus.toLocaleString('fr-CH')} CHF</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total revenus</span>
                      <span>{calculs.revenusDeterminants.toLocaleString('fr-CH')} CHF</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Formule */}
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Formule de calcul</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="font-mono text-sm space-y-1">
                      <p>RI = Besoins - Revenus{sanctionNiveau > 1 ? " - Sanction" : ""}</p>
                      <p className="text-muted-foreground">
                        RI = {calculs.besoinsReconnus.toLocaleString('fr-CH')} - {calculs.revenusDeterminants.toLocaleString('fr-CH')}{sanctionNiveau > 1 ? ` - ${calculs.montantSanction.toLocaleString('fr-CH')}` : ""} = <span className="text-primary font-bold">{calculs.montantRI.toLocaleString('fr-CH')} CHF</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Avertissement */}
                <Card className="border-amber-500/50 bg-amber-500/5">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> Ce calcul est indicatif et basé sur les normes CSIAS 2024 adaptées au canton de Vaud. 
                      Le montant effectif peut varier selon votre situation personnelle. Consultez votre CSR (Centre Social Régional) 
                      pour une évaluation complète.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sanctions" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Simulateur sanctions */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Simulateur de sanctions RI
                    </CardTitle>
                    <CardDescription>
                      Simulez l'impact des sanctions sur votre budget RI
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Niveau de sanction</Label>
                      <Select 
                        value={sanctionNiveau.toString()} 
                        onValueChange={(v) => setSanctionNiveau(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SANCTIONS.map((s) => (
                            <SelectItem key={s.niveau} value={s.niveau.toString()}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {sanctionNiveau > 0 && (
                      <div className={`p-4 rounded-lg ${sanctionNiveau > 1 ? "bg-destructive/10 border border-destructive/30" : "bg-amber-500/10 border border-amber-500/30"}`}>
                        <p className="text-sm font-medium mb-2">{calculs.sanction.label}</p>
                        <p className="text-sm text-muted-foreground">{calculs.sanction.description}</p>
                        {sanctionNiveau > 1 && (
                          <p className="text-sm font-semibold text-destructive mt-2">
                            Impact: -{calculs.montantSanction.toLocaleString('fr-CH')} CHF/mois sur le forfait
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Comparaison avant/après */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Impact de la sanction</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>RI sans sanction</span>
                      <span className="font-semibold text-lg">{calculs.montantRIBrut.toLocaleString('fr-CH')} CHF</span>
                    </div>
                    {sanctionNiveau > 1 && (
                      <>
                        <div className="flex justify-between items-center text-destructive">
                          <span>Réduction ({Math.round(calculs.sanction.reduction * 100)}% du forfait)</span>
                          <span className="font-semibold">-{calculs.montantSanction.toLocaleString('fr-CH')} CHF</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">RI après sanction</span>
                          <span className="font-bold text-xl text-destructive">{calculs.montantRI.toLocaleString('fr-CH')} CHF</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Grille des sanctions */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="h-5 w-5" />
                      Barème des sanctions RI
                    </CardTitle>
                    <CardDescription>
                      Selon LASV Art. 45-47 et RLASV - Canton de Vaud
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {SANCTIONS.map((s, idx) => (
                      <div 
                        key={s.niveau}
                        className={`p-3 rounded-lg border transition-colors ${
                          sanctionNiveau === s.niveau 
                            ? s.niveau > 1 
                              ? "bg-destructive/10 border-destructive" 
                              : "bg-primary/10 border-primary"
                            : "bg-muted/30 border-transparent hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{s.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                          </div>
                          {s.reduction > 0 && (
                            <Badge variant={s.reduction >= 0.5 ? "destructive" : "secondary"}>
                              -{Math.round(s.reduction * 100)}%
                            </Badge>
                          )}
                        </div>
                        {s.niveau > 1 && (
                          <p className="text-xs mt-2 text-destructive">
                            = -{Math.round(calculs.forfait * s.reduction).toLocaleString('fr-CH')} CHF sur votre forfait de {calculs.forfait.toLocaleString('fr-CH')} CHF
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-amber-500/50 bg-amber-500/5">
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Important:</strong> Les sanctions sont appliquées uniquement sur le forfait d'entretien, 
                      pas sur le loyer ni les primes d'assurance-maladie. Durée: 1 à 3 mois, renouvelable.
                      Recours possible dans les 30 jours auprès du DSAS.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default RICalculator;
