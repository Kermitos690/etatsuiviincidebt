import { supabase } from '@/integrations/supabase/client';

export interface LegalSearchResult {
  id?: string;
  title: string;
  reference_number: string;
  summary: string;
  source_url: string;
  source_name: string;
  source_type: 'jurisprudence' | 'legislation' | 'doctrine';
  date_decision?: string;
  legal_domain?: string;
  keywords?: string[];
  relevance_score?: number;
  is_saved?: boolean;
}

export interface SearchResponse {
  success: boolean;
  error?: string;
  query?: string;
  results?: LegalSearchResult[];
  sources_searched?: string[];
}

export interface ExtractResponse {
  success: boolean;
  error?: string;
  title?: string;
  reference_number?: string;
  summary?: string;
  full_text?: string;
  date_decision?: string;
  legal_domain?: string;
  court_or_source?: string;
  keywords?: string[];
  legal_references?: string[];
  source_url?: string;
  source_type?: string;
}

export const legalSearchApi = {
  /**
   * Search for legal documents (jurisprudence, legislation)
   */
  async search(
    query: string,
    options?: {
      sourceType?: 'jurisprudence' | 'legislation' | 'all';
      domain?: string;
      limit?: number;
      yearFrom?: number;
      yearTo?: number;
    }
  ): Promise<SearchResponse> {
    const { data, error } = await supabase.functions.invoke('scrape-legal-sources', {
      body: {
        query,
        sourceType: options?.sourceType || 'all',
        domain: options?.domain,
        limit: options?.limit || 10,
        yearFrom: options?.yearFrom,
        yearTo: options?.yearTo,
      },
    });

    if (error) {
      console.error('Legal search error:', error);
      return { success: false, error: error.message };
    }

    return data;
  },

  /**
   * Extract full content from a legal document URL
   */
  async extractContent(
    url: string,
    sourceType?: 'jurisprudence' | 'legislation' | 'doctrine'
  ): Promise<ExtractResponse> {
    const { data, error } = await supabase.functions.invoke('extract-legal-content', {
      body: { url, source_type: sourceType },
    });

    if (error) {
      console.error('Content extraction error:', error);
      return { success: false, error: error.message };
    }

    return data;
  },

  /**
   * Save a search result to the database
   */
  async saveResult(
    result: LegalSearchResult,
    userId: string
  ): Promise<{ success: boolean; error?: string; id?: string }> {
    const { data, error } = await supabase
      .from('legal_search_results')
      .insert({
        user_id: userId,
        search_query: result.title,
        source_type: result.source_type,
        source_name: result.source_name,
        source_url: result.source_url,
        title: result.title,
        reference_number: result.reference_number,
        summary: result.summary,
        date_decision: result.date_decision || null,
        legal_domain: result.legal_domain || null,
        keywords: result.keywords || [],
        relevance_score: result.relevance_score,
        is_saved: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving result:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  },

  /**
   * Get saved search results
   */
  async getSavedResults(userId: string): Promise<LegalSearchResult[]> {
    const { data, error } = await supabase
      .from('legal_search_results')
      .select('*')
      .eq('user_id', userId)
      .eq('is_saved', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved results:', error);
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      reference_number: row.reference_number || '',
      summary: row.summary || '',
      source_url: row.source_url,
      source_name: row.source_name,
      source_type: row.source_type as 'jurisprudence' | 'legislation' | 'doctrine',
      date_decision: row.date_decision || undefined,
      legal_domain: row.legal_domain || undefined,
      keywords: row.keywords || [],
      relevance_score: row.relevance_score ? Number(row.relevance_score) : undefined,
      is_saved: row.is_saved || false,
    }));
  },

  /**
   * Delete a saved result
   */
  async deleteResult(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('legal_search_results')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting result:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /**
   * Save to legal_articles for permanent reference
   */
  async saveToLegalArticles(
    result: LegalSearchResult & { full_text?: string },
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Generate content hash
    const contentToHash = result.full_text || result.summary || result.title;
    const encoder = new TextEncoder();
    const data = encoder.encode(contentToHash);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Determine code name from source
    let codeName = 'Jurisprudence';
    if (result.source_type === 'legislation') {
      // Try to extract code from reference
      const codeMatch = result.reference_number?.match(/^(CC|CO|CP|CPC|CPP|PA|LPD|Cst\.|LVPAE|LPA-VD|LSP|RAM|CSIAS)/i);
      codeName = codeMatch ? codeMatch[1].toUpperCase() : 'Loi';
    } else if (result.reference_number?.startsWith('ATF')) {
      codeName = 'ATF';
    }

    const { error } = await supabase.from('legal_articles').insert({
      code_name: codeName,
      article_number: result.reference_number || 'N/A',
      article_title: result.title,
      article_text: result.full_text || result.summary || '',
      domain: result.legal_domain || null,
      keywords: result.keywords || [],
      source_url: result.source_url,
      content_hash: contentHash,
      user_id: userId,
      version_date: result.date_decision || new Date().toISOString().split('T')[0],
    });

    if (error) {
      console.error('Error saving to legal_articles:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },
};
