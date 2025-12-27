import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Search, BookOpen, Shield, Scale, FileText, ExternalLink, 
  Save, Loader2, Gavel, BookMarked, Trash2, RefreshCw 
} from "lucide-react";
import { legalSearchApi, LegalSearchResult } from "@/lib/api/legalSearch";

interface LegalArticle {
  id: string;
  code_name: string;
  article_number: string;
  article_title: string | null;
  article_text: string;
  domain: string | null;
  keywords: string[];
  version_number: number;
  version_date: string;
  source_url: string | null;
  is_current: boolean;
  content_hash: string;
  created_at: string;
}

const DOMAINS = [
  { value: "protection_adulte", label: "Protection de l'adulte" },
  { value: "protection_donnees", label: "Protection des données" },
  { value: "procedure", label: "Procédure administrative" },
  { value: "penal", label: "Droit pénal" },
  { value: "civil", label: "Droit civil" },
];

const SOURCE_TYPES = [
  { value: "all", label: "Tous les types" },
  { value: "jurisprudence", label: "Jurisprudence (ATF)" },
  { value: "legislation", label: "Législation (Lois)" },
];

export default function LegalRepository() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceType, setSourceType] = useState<"all" | "jurisprudence" | "legislation">("all");
  const [searchDomain, setSearchDomain] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<LegalSearchResult[]>([]);
  const [sourcesSearched, setSourcesSearched] = useState<string[]>([]);
  
  // Saved articles state
  const [articles, setArticles] = useState<LegalArticle[]>([]);
  const [savedResults, setSavedResults] = useState<LegalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState("");
  
  // Saving state
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUserId(user.id);
    loadSavedData(user.id);
  };

  const loadSavedData = async (uid: string) => {
    setIsLoading(true);
    
    // Load legal articles
    const { data: articlesData, error: articlesError } = await supabase
      .from("legal_articles")
      .select("*")
      .eq("is_current", true)
      .order("code_name")
      .order("article_number");

    if (articlesError) {
      console.error("Error loading articles:", articlesError);
    } else {
      setArticles(articlesData || []);
    }

    // Load saved search results
    const saved = await legalSearchApi.getSavedResults(uid);
    setSavedResults(saved);
    
    setIsLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Veuillez entrer une requête de recherche");
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await legalSearchApi.search(searchQuery, {
        sourceType: sourceType === "all" ? "all" : sourceType,
        domain: searchDomain || undefined,
        limit: 15,
      });

      if (!response.success) {
        toast.error(response.error || "Erreur lors de la recherche");
        return;
      }

      setSearchResults(response.results || []);
      setSourcesSearched(response.sources_searched || []);
      
      if ((response.results?.length || 0) === 0) {
        toast.info("Aucun résultat trouvé pour cette recherche");
      } else {
        toast.success(`${response.results?.length} résultats trouvés`);
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Erreur lors de la recherche");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveResult = async (result: LegalSearchResult) => {
    if (!userId) return;

    const resultKey = result.source_url;
    setSavingIds(prev => new Set(prev).add(resultKey));

    try {
      // First extract full content
      const extracted = await legalSearchApi.extractContent(result.source_url, result.source_type);
      
      // Save to legal_articles
      const saveResponse = await legalSearchApi.saveToLegalArticles(
        {
          ...result,
          full_text: extracted.success ? extracted.full_text : result.summary,
        },
        userId
      );

      if (saveResponse.success) {
        toast.success("Document ajouté au référentiel légal");
        loadSavedData(userId);
      } else {
        toast.error(saveResponse.error || "Erreur lors de la sauvegarde");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(resultKey);
        return next;
      });
    }
  };

  const handleDeleteSaved = async (id: string) => {
    const response = await legalSearchApi.deleteResult(id);
    if (response.success) {
      toast.success("Référence supprimée");
      setSavedResults(prev => prev.filter(r => r.id !== id));
    } else {
      toast.error("Erreur lors de la suppression");
    }
  };

  const filteredArticles = articles.filter(article => {
    if (!filterTerm) return true;
    const term = filterTerm.toLowerCase();
    return (
      article.code_name.toLowerCase().includes(term) ||
      article.article_number.toLowerCase().includes(term) ||
      article.article_text.toLowerCase().includes(term) ||
      article.article_title?.toLowerCase().includes(term)
    );
  });

  const stats = {
    total: articles.length,
    jurisprudence: articles.filter(a => a.code_name === "ATF" || a.code_name === "Jurisprudence").length,
    legislation: articles.filter(a => !["ATF", "Jurisprudence"].includes(a.code_name)).length,
    savedSearches: savedResults.length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Référentiel Légal</h1>
          <p className="text-muted-foreground">
            Recherche automatique de jurisprudence et bases légales suisses
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Références totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.jurisprudence}</p>
                  <p className="text-sm text-muted-foreground">Jurisprudence</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.legislation}</p>
                  <p className="text-sm text-muted-foreground">Législation</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BookMarked className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.savedSearches}</p>
                  <p className="text-sm text-muted-foreground">Recherches sauvées</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="search" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Recherche
            </TabsTrigger>
            <TabsTrigger value="saved" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Mes références ({articles.length})
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search" className="space-y-4">
            {/* Search Bar */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher: curatelle art 390, ATF protection adulte, CC 388..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="pl-10"
                        disabled={isSearching}
                      />
                    </div>
                    <Button onClick={handleSearch} disabled={isSearching}>
                      {isSearching ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Recherche...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Rechercher
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <Select value={sourceType} onValueChange={(v: "all" | "jurisprudence" | "legislation") => setSourceType(v)}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Type de source" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={searchDomain} onValueChange={setSearchDomain}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Domaine juridique" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les domaines</SelectItem>
                        {DOMAINS.map(d => (
                          <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {sourcesSearched.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Sources consultées: {sourcesSearched.join(", ")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Résultats ({searchResults.length})</CardTitle>
                  <CardDescription>
                    Cliquez sur "Sauvegarder" pour ajouter au référentiel permanent
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {searchResults.map((result, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={result.source_type === "jurisprudence" ? "default" : "secondary"}>
                                  {result.source_type === "jurisprudence" ? (
                                    <><Gavel className="h-3 w-3 mr-1" />ATF</>
                                  ) : (
                                    <><Scale className="h-3 w-3 mr-1" />Loi</>
                                  )}
                                </Badge>
                                {result.reference_number && (
                                  <Badge variant="outline">{result.reference_number}</Badge>
                                )}
                                {result.date_decision && (
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(result.date_decision).toLocaleDateString("fr-CH")}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-semibold mb-1 line-clamp-2">{result.title}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-3 mb-2">
                                {result.summary}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {result.keywords?.slice(0, 5).map((kw, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {kw}
                                  </Badge>
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Source: {result.source_name}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleSaveResult(result)}
                                disabled={savingIds.has(result.source_url)}
                              >
                                {savingIds.has(result.source_url) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <><Save className="h-4 w-4 mr-1" />Sauvegarder</>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(result.source_url, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Source
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Empty state for search */}
            {!isSearching && searchResults.length === 0 && searchQuery === "" && (
              <Card className="py-12">
                <CardContent className="text-center">
                  <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Recherche automatique</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Entrez vos mots-clés pour rechercher automatiquement dans le Tribunal fédéral (bger.ch), 
                    Fedlex et autres sources légales suisses officielles.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-4">
                    {["curatelle art 394", "ATF protection adulte", "CC 390", "droit de visite"].map(example => (
                      <Button
                        key={example}
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery(example)}
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Saved References Tab */}
          <TabsContent value="saved" className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filtrer les références..."
                      value={filterTerm}
                      onChange={(e) => setFilterTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button onClick={() => userId && loadSavedData(userId)} variant="outline" size="icon">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Références sauvegardées ({filteredArticles.length})</CardTitle>
                <CardDescription>
                  Base légale vérifiée pour la validation des analyses IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                  </div>
                ) : filteredArticles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune référence dans le référentiel</p>
                    <p className="text-sm">
                      Utilisez la recherche pour trouver et sauvegarder des articles légaux
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-24">Code</TableHead>
                        <TableHead className="w-28">Référence</TableHead>
                        <TableHead>Titre / Résumé</TableHead>
                        <TableHead className="w-32">Domaine</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredArticles.map((article) => (
                        <TableRow key={article.id}>
                          <TableCell>
                            <Badge variant="outline">{article.code_name}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {article.article_number}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{article.article_title || "—"}</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {article.article_text.substring(0, 150)}...
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {article.domain && (
                              <Badge variant="secondary">
                                {DOMAINS.find(d => d.value === article.domain)?.label || article.domain}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {article.source_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(article.source_url!, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Recent Saved Searches */}
            {savedResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recherches récentes sauvegardées</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {savedResults.slice(0, 10).map((result) => (
                      <div key={result.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{result.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {result.source_name} • {result.reference_number}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(result.source_url, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => result.id && handleDeleteSaved(result.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
