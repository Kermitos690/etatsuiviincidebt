import jsPDF from 'jspdf';

interface TutorialSection {
  title: string;
  description: string;
  steps: string[];
  result: string;
  tips?: string[];
  imagePath?: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface GlossaryItem {
  term: string;
  def: string;
}

// Colors (RGB format for jsPDF)
const COLORS = {
  primary: [139, 92, 246] as [number, number, number], // Purple
  secondary: [100, 116, 139] as [number, number, number], // Slate
  text: [30, 41, 59] as [number, number, number], // Dark text
  muted: [100, 116, 139] as [number, number, number], // Muted text
  success: [34, 197, 94] as [number, number, number], // Green
  warning: [234, 179, 8] as [number, number, number], // Yellow
  background: [248, 250, 252] as [number, number, number], // Light gray
  white: [255, 255, 255] as [number, number, number],
};

export async function generateTutorialPDF(): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Helper functions
  const addNewPage = () => {
    pdf.addPage();
    y = margin;
    addFooter();
  };

  const checkPageBreak = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - 25) {
      addNewPage();
    }
  };

  const addFooter = () => {
    const pageNum = pdf.internal.pages.length - 1;
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.text('Système de Vigilance Juridique - Guide Complet', margin, pageHeight - 10);
  };

  const addTitle = (text: string, size: number, color: [number, number, number] = COLORS.text) => {
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    pdf.setFont('helvetica', 'bold');
    pdf.text(text, margin, y);
    y += size * 0.5;
  };

  const addText = (text: string, size: number = 10, color: [number, number, number] = COLORS.text, indent: number = 0) => {
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(text, contentWidth - indent);
    checkPageBreak(lines.length * (size * 0.4));
    pdf.text(lines, margin + indent, y);
    y += lines.length * (size * 0.4) + 2;
  };

  const addBulletPoint = (text: string, size: number = 10, indent: number = 5) => {
    pdf.setFontSize(size);
    pdf.setTextColor(...COLORS.text);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(text, contentWidth - indent - 5);
    checkPageBreak(lines.length * (size * 0.4) + 2);
    pdf.text('•', margin + indent, y);
    pdf.text(lines, margin + indent + 5, y);
    y += lines.length * (size * 0.4) + 2;
  };

  const addNumberedStep = (number: number, text: string, size: number = 10) => {
    pdf.setFontSize(size);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.primary);
    pdf.text(`${number}.`, margin + 5, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLORS.text);
    const lines = pdf.splitTextToSize(text, contentWidth - 15);
    checkPageBreak(lines.length * (size * 0.4) + 2);
    pdf.text(lines, margin + 15, y);
    y += lines.length * (size * 0.4) + 3;
  };

  const addSeparator = () => {
    y += 3;
    pdf.setDrawColor(...COLORS.muted);
    pdf.setLineWidth(0.3);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  const addBox = (title: string, content: string, boxColor: [number, number, number]) => {
    const boxHeight = 20;
    checkPageBreak(boxHeight + 5);
    
    // Box background
    pdf.setFillColor(...boxColor);
    pdf.setDrawColor(...boxColor);
    pdf.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, 'FD');
    
    // Title
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.white);
    pdf.text(title, margin + 5, y + 6);
    
    // Content
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(content, contentWidth - 10);
    pdf.text(lines[0] || '', margin + 5, y + 12);
    if (lines[1]) pdf.text(lines[1], margin + 5, y + 16);
    
    y += boxHeight + 5;
  };

  // ==================== COVER PAGE ====================
  pdf.setFillColor(...COLORS.primary);
  pdf.rect(0, 0, pageWidth, 80, 'F');
  
  pdf.setFontSize(32);
  pdf.setTextColor(...COLORS.white);
  pdf.setFont('helvetica', 'bold');
  pdf.text('GUIDE COMPLET', pageWidth / 2, 35, { align: 'center' });
  
  pdf.setFontSize(18);
  pdf.text('Système de Vigilance Juridique', pageWidth / 2, 50, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Tutoriel exhaustif pour maîtriser toutes les fonctionnalités', pageWidth / 2, 65, { align: 'center' });
  
  // Date
  pdf.setFontSize(11);
  pdf.setTextColor(...COLORS.text);
  const today = new Date().toLocaleDateString('fr-CH', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
  pdf.text(`Document généré le ${today}`, pageWidth / 2, 100, { align: 'center' });
  
  // Overview box
  y = 120;
  pdf.setFillColor(...COLORS.background);
  pdf.roundedRect(margin, y, contentWidth, 50, 3, 3, 'F');
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.primary);
  pdf.text('À propos de ce guide', margin + 5, y + 10);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.text);
  const overviewText = 'Ce document est conçu pour surveiller, analyser et documenter les dysfonctionnements institutionnels à travers l\'analyse automatisée des emails, la détection d\'incidents et la génération de rapports juridiques.';
  const overviewLines = pdf.splitTextToSize(overviewText, contentWidth - 10);
  pdf.text(overviewLines, margin + 5, y + 20);

  // ==================== TABLE OF CONTENTS ====================
  addNewPage();
  addTitle('TABLE DES MATIÈRES', 18, COLORS.primary);
  y += 10;

  const tocItems = [
    '1. Vue d\'ensemble du système',
    '2. Flux de travail recommandé',
    '3. Configuration Gmail',
    '4. Synchronisation des emails',
    '5. Pipeline d\'analyse IA',
    '6. Emails analysés',
    '7. Gestion des incidents',
    '8. Dashboard d\'audit',
    '9. Pièces jointes',
    '10. Dashboard Violations',
    '11. Exports et rapports',
    '12. IA Auditeur',
    '13. Entraînement IA',
    '14. Bonnes pratiques',
    '15. FAQ',
    '16. Glossaire',
  ];

  tocItems.forEach((item, index) => {
    pdf.setFontSize(11);
    pdf.setTextColor(...COLORS.text);
    pdf.setFont('helvetica', 'normal');
    pdf.text(item, margin + 5, y);
    y += 8;
  });

  // ==================== OVERVIEW SECTION ====================
  addNewPage();
  addTitle('1. VUE D\'ENSEMBLE DU SYSTÈME', 16, COLORS.primary);
  y += 5;
  
  addText('Ce système est conçu pour surveiller, analyser et documenter les dysfonctionnements institutionnels à travers l\'analyse automatisée des emails, la détection d\'incidents et la génération de rapports juridiques.');
  y += 5;

  const overviewFeatures = [
    { title: 'Emails', desc: 'Synchronisation Gmail automatique' },
    { title: 'IA', desc: 'Analyse automatique avec citations' },
    { title: 'Incidents', desc: 'Détection et suivi des violations' },
    { title: 'Rapports', desc: 'Export juridique pour le juge de paix' },
  ];

  overviewFeatures.forEach(feature => {
    addBulletPoint(`${feature.title}: ${feature.desc}`);
  });

  // ==================== WORKFLOW ====================
  addSeparator();
  addTitle('2. FLUX DE TRAVAIL RECOMMANDÉ', 16, COLORS.primary);
  y += 5;
  
  addText('Suivez ces étapes dans l\'ordre pour une utilisation optimale du système:');
  y += 3;

  const workflowSteps = [
    { title: 'Configurer Gmail', desc: 'Connectez votre compte Gmail pour synchroniser automatiquement les emails.' },
    { title: 'Synchroniser les emails', desc: 'Lancez une synchronisation complète pour récupérer tous les emails.' },
    { title: 'Analyser les emails', desc: 'Utilisez le pipeline d\'analyse pour extraire les faits et détecter les violations.' },
    { title: 'Créer des incidents', desc: 'Les incidents sont créés automatiquement ou manuellement.' },
    { title: 'Valider et enrichir', desc: 'Révisez les incidents et validez les analyses de l\'IA.' },
    { title: 'Exporter les rapports', desc: 'Générez des rapports PDF pour le juge de paix.' },
  ];

  workflowSteps.forEach((step, index) => {
    addNumberedStep(index + 1, `${step.title} - ${step.desc}`);
  });

  // ==================== DETAILED SECTIONS ====================
  const sections: TutorialSection[] = [
    {
      title: '3. CONFIGURATION GMAIL',
      description: 'Connectez et configurez votre compte Gmail pour la synchronisation automatique',
      steps: [
        'Accédez à "Configuration Gmail" dans le menu latéral',
        'Cliquez sur "Connecter Gmail" pour lancer le processus OAuth',
        'Autorisez l\'accès à votre compte Google',
        'Configurez les domaines à surveiller (ex: @institution.be)',
        'Ajoutez des mots-clés de filtrage pour cibler les emails pertinents',
        'Activez la synchronisation automatique'
      ],
      result: 'Votre compte Gmail est connecté. Le système synchronisera automatiquement les nouveaux emails correspondant à vos filtres.',
      tips: [
        'Utilisez des domaines spécifiques pour filtrer uniquement les emails institutionnels',
        'Les mots-clés peuvent inclure: "convocation", "décision", "notification"',
        'La synchronisation récupère les emails de tous les dossiers'
      ]
    },
    {
      title: '4. SYNCHRONISATION DES EMAILS',
      description: 'Récupérez tous vos emails depuis Gmail vers le système',
      steps: [
        'Accédez à "Boîte de réception" dans le menu',
        'Cliquez sur le bouton "Synchroniser"',
        'Choisissez le type de synchronisation: rapide ou complète',
        'Attendez la fin du processus',
        'Vérifiez le nombre d\'emails récupérés'
      ],
      result: 'Tous vos emails sont importés avec leurs métadonnées, corps de texte et pièces jointes.',
      tips: [
        'La première synchronisation peut prendre du temps',
        'Les pièces jointes sont téléchargées automatiquement',
        'Les emails déjà importés ne sont pas dupliqués'
      ]
    },
    {
      title: '5. PIPELINE D\'ANALYSE IA',
      description: 'Centre de contrôle pour les analyses automatisées',
      steps: [
        'Accédez à "Pipeline d\'Analyse" dans le menu',
        'Consultez les statistiques actuelles',
        'Lancez l\'analyse des emails non traités',
        'Exécutez l\'extraction des faits',
        'Déclenchez l\'analyse des threads',
        'Lancez la corroboration croisée'
      ],
      result: 'Les emails sont analysés, les faits extraits, les threads reconstitués et les preuves corroborées.',
      tips: [
        'L\'analyse par batch permet de traiter plusieurs emails à la fois',
        'Les threads regroupent les emails d\'une même conversation',
        'La corroboration croise les informations pour détecter contradictions'
      ]
    },
    {
      title: '6. EMAILS ANALYSÉS',
      description: 'Visualisez les résultats d\'analyse de chaque email',
      steps: [
        'Accédez à "Emails Analysés" dans le menu',
        'Utilisez les filtres pour trouver des emails spécifiques',
        'Cliquez sur un email pour voir son analyse détaillée',
        'Consultez les faits extraits, personnes mentionnées, dates',
        'Visualisez le niveau d\'urgence et le sentiment détecté',
        'Créez un incident directement depuis l\'email'
      ],
      result: 'Vue complète de chaque email avec toutes les informations extraites par l\'IA.',
      tips: [
        'Filtrez par sentiment (négatif, neutre, positif)',
        'Le niveau d\'urgence aide à prioriser les actions',
        'Les personnes et institutions sont automatiquement identifiées'
      ]
    },
    {
      title: '7. GESTION DES INCIDENTS',
      description: 'Créez, suivez et documentez les incidents juridiques',
      steps: [
        'Accédez à "Incidents" dans le menu',
        'Cliquez sur "Nouvel incident" pour en créer un',
        'Remplissez les champs: titre, type, gravité, institution, faits',
        'Liez l\'incident à un email source',
        'Ajoutez des preuves et références Gmail',
        'Définissez le statut: ouvert, en cours, résolu, transmis',
        'Marquez comme "Transmis JP" une fois envoyé au juge'
      ],
      result: 'Chaque incident est documenté avec un numéro unique, une chronologie et des preuves liées.',
      tips: [
        'Utilisez la gravité pour prioriser',
        'Le score de l\'incident reflète son impact cumulé',
        'La timeline permet de voir tous les incidents chronologiquement'
      ]
    },
    {
      title: '8. DASHBOARD D\'AUDIT',
      description: 'Vue d\'ensemble des statistiques et alertes',
      steps: [
        'Accédez au "Dashboard" dans le menu',
        'Consultez les KPIs: emails, incidents, violations',
        'Visualisez les graphiques de tendances',
        'Identifiez les alertes actives',
        'Analysez la répartition par institution',
        'Suivez les récurrences et patterns'
      ],
      result: 'Vision globale de l\'état du système et des actions prioritaires.',
      tips: [
        'Les alertes non résolues sont affichées en rouge',
        'Le score cumulatif reflète l\'impact total',
        'Les graphiques permettent d\'identifier les tendances'
      ]
    },
    {
      title: '9. PIÈCES JOINTES',
      description: 'Téléchargez et analysez les documents joints',
      steps: [
        'Accédez à "Pièces jointes" dans le menu',
        'Consultez la liste de toutes les pièces jointes',
        'Cliquez sur "Télécharger" pour récupérer un fichier',
        'Utilisez "Analyser" pour lancer l\'analyse IA',
        'Filtrez par type de fichier',
        'Associez les pièces jointes aux incidents'
      ],
      result: 'Les pièces jointes sont stockées, leur contenu est extrait (OCR) et analysé.',
      tips: [
        'L\'OCR permet d\'extraire le texte des images et PDF scannés',
        'Les documents analysés peuvent révéler des preuves supplémentaires',
        'Le stockage sécurisé préserve les originaux'
      ]
    },
    {
      title: '10. DASHBOARD VIOLATIONS',
      description: 'Suivi des violations légales et récurrences',
      steps: [
        'Accédez à "Violations" dans le menu',
        'Consultez les récurrences par type',
        'Identifiez les institutions problématiques',
        'Analysez les implications légales',
        'Exportez les données pour rapports'
      ],
      result: 'Vue consolidée des violations avec leur fréquence et implications légales.',
      tips: [
        'Les récurrences renforcent la valeur probatoire',
        'Les implications légales citent les articles de loi violés',
        'Utilisez ces données pour construire un dossier solide'
      ]
    },
    {
      title: '11. EXPORTS ET RAPPORTS',
      description: 'Générez des rapports PDF et exportez vos données',
      steps: [
        'Accédez à "Exports" dans le menu',
        'Sélectionnez le type de rapport à générer',
        'Choisissez la période et les filtres',
        'Générez le rapport mensuel automatique',
        'Téléchargez le PDF pour impression',
        'Synchronisez avec Google Sheets si configuré'
      ],
      result: 'Rapports professionnels prêts pour les autorités judiciaires.',
      tips: [
        'Le rapport mensuel inclut un résumé, incidents et références légales',
        'Les exports Google Sheets permettent un suivi collaboratif',
        'Conservez une copie de chaque rapport généré'
      ]
    },
    {
      title: '12. IA AUDITEUR',
      description: 'Système d\'audit automatique avec analyse quotidienne',
      steps: [
        'Accédez à "IA Auditeur" dans le menu',
        'Consultez les alertes générées automatiquement',
        'Lancez une analyse d\'audit manuelle si nécessaire',
        'Révisez les détections et marquez-les comme résolues',
        'Configurez les seuils de détection'
      ],
      result: 'Le système détecte automatiquement les anomalies et génère des alertes prioritaires.',
      tips: [
        'L\'analyse quotidienne s\'exécute automatiquement',
        'Les alertes critiques sont mises en évidence',
        'Chaque alerte contient une référence légale'
      ]
    },
    {
      title: '13. ENTRAÎNEMENT IA',
      description: 'Améliorez les détections en fournissant des feedbacks',
      steps: [
        'Accédez à "Entraînement IA" dans le menu',
        'Consultez les analyses nécessitant validation',
        'Validez ou corrigez les détections de l\'IA',
        'Ajoutez des notes explicatives pour les corrections',
        'Marquez les feedbacks comme utilisés'
      ],
      result: 'L\'IA s\'améliore progressivement grâce à vos corrections et validations.',
      tips: [
        'Plus vous validez, plus l\'IA devient précise',
        'Les corrections sont utilisées pour améliorer les modèles',
        'Consultez les scores de confiance des acteurs'
      ]
    },
  ];

  for (const section of sections) {
    addNewPage();
    addTitle(section.title, 16, COLORS.primary);
    y += 3;
    
    addText(section.description, 11, COLORS.muted);
    y += 5;

    addTitle('Étapes à suivre', 12, COLORS.text);
    y += 3;
    section.steps.forEach((step, index) => {
      addNumberedStep(index + 1, step);
    });
    
    y += 3;
    addBox('✓ Résultat attendu', section.result, COLORS.success);
    
    if (section.tips && section.tips.length > 0) {
      y += 3;
      addTitle('💡 Conseils', 11, COLORS.warning);
      y += 2;
      section.tips.forEach(tip => {
        addBulletPoint(tip, 9, 10);
      });
    }
  }

  // ==================== BEST PRACTICES ====================
  addNewPage();
  addTitle('14. BONNES PRATIQUES', 16, COLORS.primary);
  y += 5;

  addTitle('À faire ✓', 12, COLORS.success);
  y += 3;
  const doItems = [
    'Synchronisez régulièrement vos emails',
    'Validez les analyses de l\'IA pour l\'améliorer',
    'Documentez chaque incident avec précision',
    'Exportez des rapports mensuels régulièrement',
    'Liez les preuves aux incidents correspondants',
    'Utilisez les filtres pour cibler vos recherches'
  ];
  doItems.forEach(item => addBulletPoint(item, 10, 5));

  y += 5;
  addTitle('À éviter ✗', 12, [220, 38, 38] as [number, number, number]);
  y += 3;
  const dontItems = [
    'Ne modifiez pas les emails originaux',
    'Ne supprimez pas les pièces jointes sources',
    'Ne validez pas sans vérifier les détections',
    'Ne négligez pas les alertes critiques',
    'Ne laissez pas les incidents sans suivi',
    'Ne partagez pas les accès à des tiers'
  ];
  dontItems.forEach(item => addBulletPoint(item, 10, 5));

  // ==================== FAQ ====================
  addNewPage();
  addTitle('15. QUESTIONS FRÉQUEMMENT POSÉES', 16, COLORS.primary);
  y += 5;

  const faqItems: FAQItem[] = [
    { question: 'Comment connecter mon compte Gmail ?', answer: 'Accédez à "Configuration Gmail", cliquez sur "Connecter Gmail" et suivez le processus d\'authentification Google.' },
    { question: 'Les emails sont-ils modifiés ou supprimés de ma boîte Gmail ?', answer: 'Non, le système ne fait que lire et copier vos emails. Vos emails originaux restent intacts.' },
    { question: 'Combien de temps prend l\'analyse d\'un email ?', answer: 'L\'analyse prend généralement quelques secondes. Pour un batch de plusieurs emails, comptez 1-2 minutes pour 50 emails.' },
    { question: 'Comment l\'IA détecte-t-elle les violations ?', answer: 'L\'IA analyse le contenu des emails en cherchant des patterns spécifiques: délais non respectés, promesses non tenues, contradictions, etc.' },
    { question: 'Puis-je créer un incident manuellement ?', answer: 'Oui, via le bouton "Nouvel Incident" dans la section Incidents, ou directement depuis un email analysé.' },
    { question: 'Comment exporter un rapport pour le juge de paix ?', answer: 'Accédez à "Exports", sélectionnez les incidents, choisissez le format PDF et cliquez sur "Générer".' },
    { question: 'Les pièces jointes sont-elles analysées ?', answer: 'Oui, les PDF et images sont automatiquement téléchargés et analysés par OCR.' },
    { question: 'Mes données sont-elles sécurisées ?', answer: 'Oui, toutes les données sont chiffrées et protégées par authentification et politiques RLS.' },
  ];

  faqItems.forEach((faq, index) => {
    checkPageBreak(20);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.primary);
    pdf.text(`Q${index + 1}: ${faq.question}`, margin, y);
    y += 6;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLORS.text);
    const answerLines = pdf.splitTextToSize(`R: ${faq.answer}`, contentWidth - 5);
    pdf.text(answerLines, margin + 5, y);
    y += answerLines.length * 4 + 5;
  });

  // ==================== GLOSSARY ====================
  addNewPage();
  addTitle('16. GLOSSAIRE', 16, COLORS.primary);
  y += 5;

  const glossaryItems: GlossaryItem[] = [
    { term: 'Thread', def: 'Conversation email regroupant tous les messages d\'un même échange' },
    { term: 'Corroboration', def: 'Validation croisée des preuves entre différentes sources' },
    { term: 'Récurrence', def: 'Répétition d\'un même type de violation par une institution' },
    { term: 'Score d\'incident', def: 'Valeur numérique reflétant l\'impact et la gravité' },
    { term: 'RLS', def: 'Row Level Security - Protection des données par utilisateur' },
    { term: 'OCR', def: 'Reconnaissance optique de caractères pour extraire du texte' },
    { term: 'Pipeline', def: 'Chaîne de traitement automatique des données' },
    { term: 'Transmis JP', def: 'Incident transmis au Juge de Paix' },
  ];

  glossaryItems.forEach(item => {
    checkPageBreak(12);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.primary);
    pdf.text(item.term, margin, y);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLORS.text);
    pdf.text(` - ${item.def}`, margin + pdf.getTextWidth(item.term) + 2, y);
    y += 8;
  });

  // ==================== END PAGE ====================
  addNewPage();
  y = pageHeight / 2 - 20;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.primary);
  pdf.text('Fin du guide', pageWidth / 2, y, { align: 'center' });
  y += 15;
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.text);
  pdf.text('Pour toute question ou assistance, consultez le système d\'aide intégré.', pageWidth / 2, y, { align: 'center' });
  y += 10;
  pdf.text(`Document généré le ${today}`, pageWidth / 2, y, { align: 'center' });

  // Save the PDF
  pdf.save('tutoriel-vigilance-juridique.pdf');
}
