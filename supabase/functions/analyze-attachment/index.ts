import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, corsHeaders, log } from "../_shared/core.ts";
import { verifyAuth, unauthorizedResponse, createServiceClient } from "../_shared/auth.ts";

// Prompt OCR ultra-précis pour documents juridiques suisses
const OCR_SYSTEM_PROMPT = `Tu es un EXPERT OCR JURIDIQUE spécialisé dans l'extraction exhaustive de texte depuis des documents.

===== MISSION OCR EXHAUSTIVE =====

1. EXTRAIS CHAQUE MOT visible sur ce document, caractère par caractère
2. PRÉSERVE LA STRUCTURE EXACTE :
   - Numérotation (1., 1.1, a), b))
   - Tableaux avec colonnes alignées
   - En-têtes et pieds de page
   - Marges et indentations
3. IDENTIFIE ET TRANSCRIS :
   - Dates (format JJ.MM.AAAA ou DD/MM/YYYY)
   - Références (N° dossier, Art. XX, § X)
   - Montants (CHF X'XXX.XX, EUR, etc.)
   - Noms propres et institutions
   - Numéros de téléphone, emails
4. ANNOTATIONS ET MARQUES :
   - Tampons officiels (date, nom, institution)
   - Signatures (décris emplacement et type)
   - Notes manuscrites (même partielles)
   - Surlignages ou marques
5. QUALITÉ :
   - [?] pour caractères illisibles
   - [ILLISIBLE] pour sections impossibles à lire
   - Précise si document est incliné, taché, ou partiellement visible

===== FORMAT DE SORTIE =====
Retourne un JSON structuré:
{
  "full_text": "TEXTE INTÉGRAL préservant structure et sauts de ligne",
  "pages_count": 1,
  "dates": ["date1", "date2"],
  "persons": ["nom complet 1", "nom complet 2"],
  "institutions": ["institution1", "institution2"],
  "amounts": ["CHF X.XX"],
  "references": ["N° 123", "Art. 394 CC"],
  "emails_found": ["email@domain.ch"],
  "phones_found": ["+41 XX XXX XX XX"],
  "annotations": ["tampon: date X", "signature manuscrite"],
  "quality_score": 0-100,
  "issues": ["coin inférieur droit illisible"]
}`;

// Prompt d'analyse juridique pour curatelle
const LEGAL_ANALYSIS_PROMPT = `Tu es un AUDITEUR JURIDIQUE EXPERT analysant une pièce jointe dans le contexte d'une CURATELLE VOLONTAIRE DE GESTION ET DE REPRÉSENTATION (droit suisse).

===== CONTEXTE ESSENTIEL =====
- Le pupille a DEMANDÉ cette curatelle lui-même
- Le curateur N'A PAS TOUS LES DROITS, il doit COLLABORER avec le pupille
- Les décisions DOIVENT être prises AVEC le pupille
- Tout échange d'info avec tiers nécessite le CONSENTEMENT explicite
- La violation de ces principes est une FAUTE GRAVE

===== ÉLÉMENTS CRITIQUES À RECHERCHER =====

DOCUMENTS HAUTEMENT SENSIBLES:
- Décisions de justice / tribunal de protection
- Courriers recommandés (surtout si "perdus" ou non transmis)
- Documents signés SANS la présence/accord du pupille
- Échanges d'informations confidentielles avec tiers
- Preuves d'exclusion du pupille des décisions
- Rapports médicaux transmis sans consentement

VIOLATIONS POTENTIELLES (avec articles):
- Art. 394 CC : Décisions sans consultation du pupille
- Art. 413 CC : Manque de diligence dans la gestion
- Art. 416 CC : Actes sans autorisation requise
- Art. 419 CC : Défaut de reddition de comptes
- Art. 13 Cst. : Violation de la vie privée
- Art. 28 CC : Atteinte à la personnalité
- Art. 6 LPD : Transmission de données sans consentement

===== ANALYSE REQUISE =====

À partir du texte OCR extrait, identifie:
1. TYPE de document et caractère officiel
2. ÉLÉMENTS CLÉS (dates, noms, institutions, montants, signatures)
3. PREUVES de dysfonctionnement ou violation
4. IMPLICATIONS JURIDIQUES avec articles précis
5. Le pupille était-il IMPLIQUÉ/INFORMÉ ?
6. Y a-t-il eu CONSENTEMENT pour les actions décrites ?

===== FORMAT DE SORTIE =====
{
  "document_type": "type précis de document",
  "is_official": boolean,
  "is_registered_mail": boolean,
  "key_elements": ["élément1", "élément2"],
  "institutions_mentioned": ["institution1"],
  "persons_mentioned": ["nom1", "nom2"],
  "dates_found": ["JJ.MM.AAAA"],
  "amounts_found": ["CHF X.XX"],
  "references_found": ["réf1"],
  "signatures_present": boolean,
  "pupille_involved": boolean,
  "pupille_informed": boolean,
  "pupille_signature_present": boolean,
  "consent_given": boolean,
  "consent_issues": boolean,
  "unauthorized_disclosure": boolean,
  "problems_detected": [
    {
      "issue": "description du problème",
      "evidence": "citation EXACTE du document",
      "legal_article": "Art. X CC/Cst./LPD"
    }
  ],
  "legal_violations": ["Art. X CC - description précise"],
  "legal_implications": "implications juridiques détaillées",
  "exact_citations": ["citation exacte 1", "citation exacte 2"],
  "summary": "résumé factuel en 3-4 phrases",
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "confidence": 0-100,
  "recommended_actions": ["action recommandée 1"]
}`;

// Convertir ArrayBuffer en base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// Analyser une image avec OCR puis analyse juridique
async function analyzeImageWithOCR(
  imageBase64: string, 
  mimeType: string, 
  filename: string,
  emailSubject: string,
  apiKey: string
): Promise<{ ocr: any; analysis: any }> {
  
  const imageUrl = `data:${mimeType};base64,${imageBase64}`;
  
  // Étape 1: OCR exhaustif
  console.log(`OCR extraction for image: ${filename}`);
  const ocrResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: OCR_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: `Extrais TOUT le texte de cette image de manière exhaustive. Fichier: ${filename}` },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
    }),
  });

  if (!ocrResponse.ok) {
    console.error("OCR error:", await ocrResponse.text());
    throw new Error(`OCR error: ${ocrResponse.status}`);
  }

  const ocrData = await ocrResponse.json();
  const ocrContent = ocrData.choices?.[0]?.message?.content || "";
  
  let ocrResult: any = { full_text: "", quality_score: 0 };
  const ocrJsonMatch = ocrContent.match(/\{[\s\S]*\}/);
  if (ocrJsonMatch) {
    try {
      ocrResult = JSON.parse(ocrJsonMatch[0]);
    } catch (e) {
      ocrResult.full_text = ocrContent;
    }
  } else {
    ocrResult.full_text = ocrContent;
  }

  console.log(`OCR extracted ${ocrResult.full_text?.length || 0} characters`);

  // Étape 2: Analyse juridique basée sur le texte OCR
  console.log(`Legal analysis for: ${filename}`);
  const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: LEGAL_ANALYSIS_PROMPT },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Analyse ce document juridiquement.\n\nFichier: ${filename}\nEmail source: ${emailSubject}\n\nTEXTE OCR EXTRAIT:\n${ocrResult.full_text}\n\nÉléments OCR identifiés:\n- Dates: ${JSON.stringify(ocrResult.dates || [])}\n- Personnes: ${JSON.stringify(ocrResult.persons || [])}\n- Institutions: ${JSON.stringify(ocrResult.institutions || [])}\n- Montants: ${JSON.stringify(ocrResult.amounts || [])}`
            },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
    }),
  });

  if (!analysisResponse.ok) {
    console.error("Analysis error:", await analysisResponse.text());
    throw new Error(`Analysis error: ${analysisResponse.status}`);
  }

  const analysisData = await analysisResponse.json();
  const analysisContent = analysisData.choices?.[0]?.message?.content || "";
  
  let analysisResult: any = {};
  const analysisJsonMatch = analysisContent.match(/\{[\s\S]*\}/);
  if (analysisJsonMatch) {
    try {
      analysisResult = JSON.parse(analysisJsonMatch[0]);
    } catch (e) {
      analysisResult = { summary: analysisContent, confidence: 50 };
    }
  }

  return { ocr: ocrResult, analysis: analysisResult };
}

// Analyser un PDF en envoyant chaque représentation comme image
async function analyzePDFWithOCR(
  pdfBase64: string,
  filename: string,
  emailSubject: string,
  apiKey: string
): Promise<{ ocr: any; analysis: any }> {
  
  console.log(`Analyzing PDF: ${filename} (${pdfBase64.length} base64 chars)`);
  
  // Pour les PDFs, on utilise le modèle vision avec le PDF encodé
  // Note: Gemini peut analyser les PDFs directement via base64
  const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;
  
  // Étape 1: OCR du PDF complet
  console.log(`OCR extraction for PDF: ${filename}`);
  const ocrResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: OCR_SYSTEM_PROMPT + "\n\nCe document est un PDF. Extrais le texte de TOUTES les pages visibles." },
        {
          role: "user",
          content: [
            { type: "text", text: `Extrais TOUT le texte de ce PDF, page par page. Fichier: ${filename}` },
            { type: "image_url", image_url: { url: pdfDataUrl } }
          ]
        }
      ],
    }),
  });

  if (!ocrResponse.ok) {
    const errorText = await ocrResponse.text();
    console.error("PDF OCR error:", errorText);
    
    // Fallback: essayer sans l'image si le PDF est trop gros
    if (ocrResponse.status === 400 || ocrResponse.status === 413) {
      console.log("PDF too large for vision, using text extraction fallback");
      return {
        ocr: { 
          full_text: `[PDF trop volumineux pour OCR direct: ${filename}]`,
          quality_score: 10,
          issues: ["PDF trop volumineux pour extraction OCR directe"]
        },
        analysis: {
          document_type: "PDF non analysable",
          summary: `Le fichier ${filename} est trop volumineux pour être analysé directement.`,
          severity: "low",
          confidence: 10
        }
      };
    }
    throw new Error(`PDF OCR error: ${ocrResponse.status}`);
  }

  const ocrData = await ocrResponse.json();
  const ocrContent = ocrData.choices?.[0]?.message?.content || "";
  
  let ocrResult: any = { full_text: "", quality_score: 0 };
  const ocrJsonMatch = ocrContent.match(/\{[\s\S]*\}/);
  if (ocrJsonMatch) {
    try {
      ocrResult = JSON.parse(ocrJsonMatch[0]);
    } catch (e) {
      ocrResult.full_text = ocrContent;
    }
  } else {
    ocrResult.full_text = ocrContent;
  }

  console.log(`PDF OCR extracted ${ocrResult.full_text?.length || 0} characters`);

  // Étape 2: Analyse juridique
  console.log(`Legal analysis for PDF: ${filename}`);
  const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: LEGAL_ANALYSIS_PROMPT },
        {
          role: "user",
          content: `Analyse ce document juridiquement.\n\nFichier: ${filename}\nEmail source: ${emailSubject}\n\nTEXTE OCR EXTRAIT DU PDF:\n${ocrResult.full_text}\n\nÉléments OCR identifiés:\n- Dates: ${JSON.stringify(ocrResult.dates || [])}\n- Personnes: ${JSON.stringify(ocrResult.persons || [])}\n- Institutions: ${JSON.stringify(ocrResult.institutions || [])}\n- Montants: ${JSON.stringify(ocrResult.amounts || [])}\n- Références: ${JSON.stringify(ocrResult.references || [])}`
        }
      ],
    }),
  });

  if (!analysisResponse.ok) {
    console.error("PDF Analysis error:", await analysisResponse.text());
    throw new Error(`PDF Analysis error: ${analysisResponse.status}`);
  }

  const analysisData = await analysisResponse.json();
  const analysisContent = analysisData.choices?.[0]?.message?.content || "";
  
  let analysisResult: any = {};
  const analysisJsonMatch = analysisContent.match(/\{[\s\S]*\}/);
  if (analysisJsonMatch) {
    try {
      analysisResult = JSON.parse(analysisJsonMatch[0]);
    } catch (e) {
      analysisResult = { summary: analysisContent, confidence: 50 };
    }
  }

  return { ocr: ocrResult, analysis: analysisResult };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const { user, error: authError } = await verifyAuth(req);
    if (authError || !user) {
      return unauthorizedResponse(authError || 'Authentication required');
    }

    const { attachmentId } = await req.json();
    
    console.log(`=== ANALYZING ATTACHMENT: ${attachmentId} ===`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createServiceClient();
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify attachment ownership through email
    const { data: attachmentCheck } = await supabase
      .from("email_attachments")
      .select("id, email_id, emails!inner(user_id)")
      .eq("id", attachmentId)
      .single();

    if (!attachmentCheck || (attachmentCheck.emails as any)?.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Attachment not found or access denied' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get attachment metadata
    const { data: attachment, error: attachmentError } = await supabase
      .from("email_attachments")
      .select("*, emails(*)")
      .eq("id", attachmentId)
      .single();

    if (attachmentError || !attachment) {
      throw new Error(`Attachment not found: ${attachmentId}`);
    }

    console.log(`Attachment: ${attachment.filename} (${attachment.mime_type})`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("email-attachments")
      .download(attachment.storage_path);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      throw new Error(`Failed to download file: ${attachment.storage_path}`);
    }

    const emailSubject = attachment.emails?.subject || 'Sans sujet';
    let result: { ocr: any; analysis: any };

    // Route by file type
    if (attachment.mime_type.startsWith("image/")) {
      // Images: OCR + Analyse
      console.log("Processing as IMAGE");
      const base64Data = arrayBufferToBase64(await fileData.arrayBuffer());
      result = await analyzeImageWithOCR(
        base64Data,
        attachment.mime_type,
        attachment.filename,
        emailSubject,
        LOVABLE_API_KEY
      );
    } else if (attachment.mime_type === "application/pdf") {
      // PDF: OCR multi-pages + Analyse
      console.log("Processing as PDF");
      const base64Data = arrayBufferToBase64(await fileData.arrayBuffer());
      result = await analyzePDFWithOCR(
        base64Data,
        attachment.filename,
        emailSubject,
        LOVABLE_API_KEY
      );
    } else if (attachment.mime_type.includes("text/") || 
               attachment.mime_type.includes("plain") ||
               attachment.filename.endsWith(".txt") ||
               attachment.filename.endsWith(".csv")) {
      // Text files: Direct extraction + Analyse
      console.log("Processing as TEXT");
      const textContent = await fileData.text();
      
      const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: LEGAL_ANALYSIS_PROMPT },
            {
              role: "user",
              content: `Analyse ce document texte juridiquement.\n\nFichier: ${attachment.filename}\nEmail source: ${emailSubject}\n\nCONTENU:\n${textContent.slice(0, 50000)}`
            }
          ],
        }),
      });

      if (!analysisResponse.ok) {
        throw new Error(`Text analysis error: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      const analysisContent = analysisData.choices?.[0]?.message?.content || "";
      
      let analysisResult: any = {};
      const analysisJsonMatch = analysisContent.match(/\{[\s\S]*\}/);
      if (analysisJsonMatch) {
        try {
          analysisResult = JSON.parse(analysisJsonMatch[0]);
        } catch (e) {
          analysisResult = { summary: analysisContent, confidence: 50 };
        }
      }

      result = {
        ocr: { full_text: textContent, quality_score: 100 },
        analysis: analysisResult
      };
    } else if (attachment.mime_type.includes("word") || 
               attachment.mime_type.includes("document") ||
               attachment.filename.endsWith(".docx") ||
               attachment.filename.endsWith(".doc")) {
      // Word documents: traiter comme PDF (vision)
      console.log("Processing as WORD DOCUMENT");
      const base64Data = arrayBufferToBase64(await fileData.arrayBuffer());
      
      // Tenter l'analyse vision
      result = await analyzePDFWithOCR(
        base64Data,
        attachment.filename,
        emailSubject,
        LOVABLE_API_KEY
      );
    } else {
      // Unsupported types
      console.log(`Unsupported type: ${attachment.mime_type}`);
      result = {
        ocr: { 
          full_text: `[Type non supporté: ${attachment.mime_type}]`,
          quality_score: 0 
        },
        analysis: {
          document_type: "Non supporté",
          summary: `Le fichier ${attachment.filename} de type ${attachment.mime_type} ne peut pas être analysé automatiquement.`,
          severity: "none",
          confidence: 0
        }
      };
    }

    // Combine OCR and analysis results
    const combinedAnalysis = {
      ...result.analysis,
      ocr_data: {
        full_text: result.ocr.full_text?.slice(0, 20000), // Limit stored text
        quality_score: result.ocr.quality_score,
        dates: result.ocr.dates,
        persons: result.ocr.persons,
        institutions: result.ocr.institutions,
        amounts: result.ocr.amounts,
        references: result.ocr.references,
        issues: result.ocr.issues
      }
    };

    // Update attachment with analysis
    const { error: updateError } = await supabase
      .from("email_attachments")
      .update({
        ai_analysis: combinedAnalysis,
        extracted_text: result.ocr.full_text?.slice(0, 50000),
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", attachmentId);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    console.log(`=== ANALYSIS COMPLETE: ${attachment.filename} ===`);
    console.log(`Severity: ${combinedAnalysis.severity}, Confidence: ${combinedAnalysis.confidence}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: combinedAnalysis,
        ocr_quality: result.ocr.quality_score 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Analyze attachment error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
