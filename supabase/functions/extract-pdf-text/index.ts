import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(JSON.stringify({ error: 'documentId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[extract-pdf-text] Starting extraction for document ${documentId}`);

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('pdf_documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single();

    if (docError || !document) {
      console.error('[extract-pdf-text] Document not found:', docError);
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update status to extracting
    await supabase
      .from('pdf_documents')
      .update({ extraction_status: 'extracting' })
      .eq('id', documentId);

    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('pdf-documents')
      .download(document.storage_path);

    if (downloadError || !fileData) {
      console.error('[extract-pdf-text] Failed to download file:', downloadError);
      await supabase
        .from('pdf_documents')
        .update({ extraction_status: 'error' })
        .eq('id', documentId);
      
      return new Response(JSON.stringify({ error: 'Failed to download file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Convert to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 in chunks to avoid stack overflow
    let base64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      base64 += String.fromCharCode(...chunk);
    }
    base64 = btoa(base64);

    let extractedText = '';

    if (lovableApiKey) {
      console.log('[extract-pdf-text] Using Lovable AI for text extraction');
      
      // Use Gemini Pro which has better document handling
      // Send as text prompt asking to describe/extract content
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Tu es un assistant d'extraction de texte de documents PDF.
                  
Voici un document PDF encodé en base64. Extrais TOUT le texte visible de ce document.
Préserve la structure du document (titres, paragraphes, dates, signatures, en-têtes, tableaux).
Si le document contient plusieurs pages ou sections, sépare-les clairement avec des lignes vides.
Retourne UNIQUEMENT le texte extrait, sans commentaires, sans analyse, sans interprétation.
Si tu ne peux pas lire le document, dis "ERREUR: Impossible de lire le document".

Document (PDF base64): ${base64.substring(0, 50000)}`
                }
              ]
            }
          ],
          temperature: 0.1,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        extractedText = aiData.choices?.[0]?.message?.content || '';
        
        // Check for error messages
        if (extractedText.includes('ERREUR:') || extractedText.length < 50) {
          console.log('[extract-pdf-text] AI could not extract text, trying alternative method');
          
          // Try with a simpler prompt
          const retryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${lovableApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              messages: [
                {
                  role: 'user',
                  content: `Lis ce document PDF et extrais tout le texte visible. Nom du fichier: ${document.original_filename}. Taille: ${document.file_size} bytes.
                  
Si le document est un courrier administratif, extrais: l'expéditeur, le destinataire, la date, l'objet, et le contenu complet.
Si c'est un autre type de document, extrais tout le texte tel quel.

Document base64 (tronqué): ${base64.substring(0, 30000)}`
                }
              ],
              temperature: 0.1,
            }),
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            const retryText = retryData.choices?.[0]?.message?.content || '';
            if (retryText.length > extractedText.length) {
              extractedText = retryText;
            }
          }
        }
        
        console.log(`[extract-pdf-text] Extracted ${extractedText.length} characters`);
      } else {
        const errorText = await aiResponse.text();
        console.error('[extract-pdf-text] AI extraction failed:', aiResponse.status, errorText);
        
        // Handle rate limits
        if (aiResponse.status === 429) {
          extractedText = '[Limite de requêtes atteinte - Réessayez dans quelques minutes]\n\nL\'extraction automatique a échoué car trop de requêtes ont été effectuées. Veuillez réessayer plus tard.';
        } else if (aiResponse.status === 402) {
          extractedText = '[Crédits épuisés]\n\nVeuillez recharger vos crédits Lovable AI pour utiliser l\'extraction automatique.';
        } else {
          extractedText = `[Extraction automatique échouée - Erreur ${aiResponse.status}]\n\nVeuillez copier-coller le texte manuellement ou réessayer.`;
        }
      }
    } else {
      console.log('[extract-pdf-text] No AI key available');
      extractedText = '[Aucune clé API AI configurée]\n\nL\'extraction automatique nécessite Lovable AI. Veuillez copier-coller le texte du PDF manuellement.';
    }

    // Determine status based on extraction result
    const isError = extractedText.startsWith('[') && (
      extractedText.includes('échoué') || 
      extractedText.includes('Erreur') || 
      extractedText.includes('épuisés') ||
      extractedText.includes('Aucune clé')
    );

    // Update document with extracted text
    const { error: updateError } = await supabase
      .from('pdf_documents')
      .update({
        extracted_text: extractedText,
        extraction_status: isError ? 'error' : 'completed',
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('[extract-pdf-text] Failed to save extracted text:', updateError);
    }

    console.log(`[extract-pdf-text] Extraction ${isError ? 'failed' : 'complete'} for document ${documentId}`);

    return new Response(JSON.stringify({
      success: !isError,
      extractedText,
      characterCount: extractedText.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[extract-pdf-text] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});