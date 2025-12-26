import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attachmentId } = await req.json();
    
    console.log(`Analyzing attachment: ${attachmentId}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get attachment metadata
    const { data: attachment, error: attachmentError } = await supabase
      .from("email_attachments")
      .select("*, emails(*)")
      .eq("id", attachmentId)
      .single();

    if (attachmentError || !attachment) {
      throw new Error("Attachment not found");
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("email-attachments")
      .download(attachment.storage_path);

    if (downloadError || !fileData) {
      throw new Error("Failed to download file from storage");
    }

    let extractedText = "";
    let analysisPrompt = "";

    // Handle different file types
    if (attachment.mime_type.startsWith("image/")) {
      // For images, use vision model
      const base64Data = await fileData.arrayBuffer()
        .then(buffer => btoa(String.fromCharCode(...new Uint8Array(buffer))));
      
      const imageUrl = `data:${attachment.mime_type};base64,${base64Data}`;
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Tu es un AUDITEUR JURIDIQUE EXPERT analysant une pièce jointe dans le contexte d'une CURATELLE VOLONTAIRE DE GESTION ET DE REPRÉSENTATION (droit suisse).

===== CONTEXTE ESSENTIEL =====
- Le pupille a DEMANDÉ cette curatelle lui-même
- Le curateur N'A PAS TOUS LES DROITS, il doit COLLABORER
- Les décisions doivent être prises AVEC le pupille
- Tout échange d'info avec tiers nécessite le CONSENTEMENT

===== ÉLÉMENTS À RECHERCHER =====

DOCUMENTS CRITIQUES:
- Décisions de justice / tribunal
- Courriers recommandés (surtout si perdus)
- Documents signés sans le pupille
- Échanges d'informations confidentielles
- Preuves d'exclusion du pupille

VIOLATIONS POTENTIELLES:
- Décisions prises sans consultation du pupille
- Échanges avec tiers sans consentement
- Documents importants non transmis
- Signatures ou décisions unilatérales
- Dates dépassées / délais non respectés

Analyse cette image et identifie:
1. Type de document (courrier officiel, formulaire, décision, recommandé, etc.)
2. Éléments clés (dates, noms, institutions, montants, signatures)
3. Preuves de dysfonctionnement ou violation
4. Implications juridiques (art. CC, Cst., PA, LPD)
5. Le pupille était-il impliqué/informé?

Retourne un JSON structuré:
{
  "document_type": "type précis de document",
  "is_official": boolean,
  "is_registered_mail": boolean,
  "key_elements": ["élément1", "élément2"],
  "institutions_mentioned": ["institution1"],
  "persons_mentioned": ["nom1"],
  "dates_found": ["date1"],
  "amounts_found": ["montant1"],
  "signatures_present": boolean,
  "pupille_involved": boolean | null,
  "pupille_signature_present": boolean | null,
  "problems_detected": ["problème détecté"],
  "consent_issues": boolean,
  "unauthorized_disclosure": boolean,
  "legal_violations": ["Art. X CC - description"],
  "legal_implications": "implications juridiques détaillées",
  "summary": "résumé factuel en 3-4 phrases",
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "confidence": 0-100,
  "recommended_actions": ["action recommandée"]
}`
            },
            {
              role: "user",
              content: [
                { type: "text", text: `Analyse cette pièce jointe de l'email "${attachment.emails?.subject || 'Sans sujet'}"` },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Vision error:", errorText);
        throw new Error(`AI Vision error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        extractedText = analysis.summary || "";
        
        // Update attachment with analysis
        await supabase
          .from("email_attachments")
          .update({
            ai_analysis: analysis,
            extracted_text: extractedText,
            analyzed_at: new Date().toISOString(),
          })
          .eq("id", attachmentId);

        return new Response(
          JSON.stringify({ success: true, analysis }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (attachment.mime_type === "application/pdf" || 
               attachment.mime_type.includes("text/") ||
               attachment.mime_type.includes("document")) {
      // For text-based documents
      if (attachment.mime_type.includes("text/")) {
        extractedText = await fileData.text();
      } else {
        // For PDF and other documents, we'll use the AI to analyze the base64
        const base64Data = await fileData.arrayBuffer()
          .then(buffer => btoa(String.fromCharCode(...new Uint8Array(buffer))));
        
        // Truncate if too large
        const truncatedBase64 = base64Data.slice(0, 50000);
        
        analysisPrompt = `Document binaire (${attachment.mime_type}), premiers caractères base64: ${truncatedBase64.slice(0, 1000)}...`;
      }

      if (extractedText || analysisPrompt) {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `Tu es un AUDITEUR JURIDIQUE EXPERT analysant un document dans le contexte d'une CURATELLE VOLONTAIRE DE GESTION ET DE REPRÉSENTATION (droit suisse).

===== CONTEXTE ESSENTIEL =====
- Le pupille a DEMANDÉ cette curatelle lui-même
- Le curateur N'A PAS TOUS LES DROITS, il doit COLLABORER
- Les décisions doivent être prises AVEC le pupille
- Tout échange d'info avec tiers nécessite le CONSENTEMENT

===== RECHERCHE =====

DOCUMENTS CRITIQUES À IDENTIFIER:
- Décisions de justice perdues ou non transmises
- Courriers recommandés non reçus
- Échanges confidentiels avec tiers sans accord
- Documents signés sans le pupille

Analyse ce document et identifie:
1. Type de document et caractère officiel
2. Éléments clés (dates, noms, institutions, montants, signatures)
3. Preuves de dysfonctionnement
4. Implications juridiques (art. CC, Cst., PA, LPD)
5. Le pupille était-il impliqué/informé?

Retourne un JSON structuré:
{
  "document_type": "type précis",
  "is_official": boolean,
  "key_elements": ["élément1", "élément2"],
  "institutions_mentioned": ["institution1"],
  "dates_found": ["date1"],
  "amounts_found": ["montant"],
  "pupille_involved": boolean | null,
  "problems_detected": ["problème"],
  "consent_issues": boolean,
  "legal_violations": ["Art. X CC - description"],
  "legal_implications": "implications détaillées",
  "summary": "résumé factuel en 3-4 phrases",
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "confidence": 0-100,
  "recommended_actions": ["action"]
}`
              },
              {
                role: "user",
                content: `Fichier: ${attachment.filename}\nType: ${attachment.mime_type}\n\nContenu:\n${extractedText || analysisPrompt}`
              }
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("AI analysis error:", errorText);
          throw new Error(`AI analysis error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "";
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0]);
          
          await supabase
            .from("email_attachments")
            .update({
              ai_analysis: analysis,
              extracted_text: extractedText.slice(0, 10000), // Limit stored text
              analyzed_at: new Date().toISOString(),
            })
            .eq("id", attachmentId);

          return new Response(
            JSON.stringify({ success: true, analysis }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Default response for unsupported types
    const defaultAnalysis = {
      document_type: "unknown",
      key_elements: [],
      institutions_mentioned: [],
      dates_found: [],
      problems_detected: [],
      legal_implications: "Non analysable automatiquement",
      summary: `Fichier ${attachment.filename} de type ${attachment.mime_type}`,
      severity: "none",
      confidence: 0
    };

    await supabase
      .from("email_attachments")
      .update({
        ai_analysis: defaultAnalysis,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", attachmentId);

    return new Response(
      JSON.stringify({ success: true, analysis: defaultAnalysis }),
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
