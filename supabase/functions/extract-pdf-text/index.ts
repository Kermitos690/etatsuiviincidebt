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
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    let extractedText = '';

    if (lovableApiKey) {
      console.log('[extract-pdf-text] Using Lovable AI for OCR/extraction');
      
      // Use Gemini's vision capability for PDF text extraction
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
              content: [
                {
                  type: 'text',
                  text: `Extrais tout le texte de ce document PDF. Préserve la structure (dates, signatures, en-têtes).
Retourne UNIQUEMENT le texte extrait, sans commentaires ni analyse. Si le document contient plusieurs pages ou échanges, sépare-les clairement.`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`
                  }
                }
              ]
            }
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        extractedText = aiData.choices?.[0]?.message?.content || '';
        console.log(`[extract-pdf-text] Extracted ${extractedText.length} characters`);
      } else {
        const errorText = await aiResponse.text();
        console.error('[extract-pdf-text] AI extraction failed:', errorText);
        
        // Fallback: just note that manual extraction is needed
        extractedText = `[Extraction automatique échouée - Erreur: ${aiResponse.status}]\n\nVeuillez copier-coller le texte manuellement ou réessayer.`;
      }
    } else {
      console.log('[extract-pdf-text] No AI key available');
      extractedText = '[Aucune clé API AI configurée - Extraction automatique impossible]\n\nVeuillez copier-coller le texte du PDF manuellement.';
    }

    // Update document with extracted text
    const { error: updateError } = await supabase
      .from('pdf_documents')
      .update({
        extracted_text: extractedText,
        extraction_status: extractedText.includes('[Extraction automatique échouée') ? 'error' : 'completed',
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('[extract-pdf-text] Failed to save extracted text:', updateError);
    }

    console.log(`[extract-pdf-text] Extraction complete for document ${documentId}`);

    return new Response(JSON.stringify({
      success: true,
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
