import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Search, Gavel, Loader2, Download, ExternalLink, 
  Calendar, Filter, CheckCircle2, XCircle 
} from "lucide-react";
import { legalSearchApi, LegalSearchResult } from "@/lib/api/legalSearch";

interface ATFImporterProps {
  userId: string;
  onImportComplete?: () => void;
}

const PRESET_KEYWORDS = [
  { value: "curatelle", label: "Curatelle" },
  { value: "protection adulte", label: "Protection de l'adulte" },
  { value: "mesure provisionnelle", label: "Mesures provisionnelles" },
  { value: "tutelle", label: "Tutelle" },
  { value: "mandat pour cause inaptitude", label: "Mandat pour cause d'inaptitude" },
  { value: "placement institution", label: "Placement en institution" },
  { value: "droit de visite", label: "Droit de visite" },
  { value: "APEA", label: "APEA" },
  { value: "capacité discernement", label: "Capacité de discernement" },
  { value: "conflit intérêt curateur", label: "Conflit d'intérêt curateur" },
];

const CURRENT_YEAR = new Date().getFullYear();

export function ATFImporter({ userId, onImportComplete }: ATFImporterProps) {
  const [keywords, setKeywords] = useState("");
  const [yearFrom, setYearFrom] = useState<number>(2015);
  const [yearTo, setYearTo] = useState<number>(CURRENT_YEAR);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<LegalSearchResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [sourcesSearched, setSourcesSearched] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!keywords.trim()) {
      toast.error("Veuillez entrer des mots-clés");
      return;
    }

    setIsSearching(true);
    setResults([]);
    setSelectedResults(new Set());

    try {
      const { data, error } = await supabase.functions.invoke('scrape-legal-sources', {
        body: {
          query: keywords,
          sourceType: 'jurisprudence',
          limit: 20,
          yearFrom,
          yearTo,
        },
      });

      if (error) {
        toast.error("Erreur lors de la recherche");
        console.error(error);
        return;
      }

      if (!data.success) {
        toast.error(data.error || "Erreur lors de la recherche");
        return;
      }

      setResults(data.results || []);
      setSourcesSearched(data.sources_searched || []);
      
      if ((data.results?.length || 0) === 0) {
        toast.info("Aucun arrêt ATF trouvé pour ces critères");
      } else {
        toast.success(`${data.results.length} arrêts ATF trouvés`);
        // Auto-select all results
        setSelectedResults(new Set(data.results.map((r: LegalSearchResult) => r.source_url)));
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Erreur lors de la recherche");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedResults.size === results.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(results.map(r => r.source_url)));
    }
  };

  const toggleSelection = (url: string) => {
    const newSelection = new Set(selectedResults);
    if (newSelection.has(url)) {
      newSelection.delete(url);
    } else {
      newSelection.add(url);
    }
    setSelectedResults(newSelection);
  };

  const handleImportSelected = async () => {
    if (selectedResults.size === 0) {
      toast.error("Sélectionnez au moins un arrêt à importer");
      return;
    }

    setIsImporting(true);
    setImportProgress({ current: 0, total: selectedResults.size });
    let successCount = 0;
    let errorCount = 0;

    const selectedItems = results.filter(r => selectedResults.has(r.source_url));

    for (let i = 0; i < selectedItems.length; i++) {
      const result = selectedItems[i];
      setImportProgress({ current: i + 1, total: selectedItems.length });

      try {
        // Extract full content first
        const extracted = await legalSearchApi.extractContent(result.source_url, 'jurisprudence');
        
        // Save to legal_articles
        const saveResponse = await legalSearchApi.saveToLegalArticles(
          {
            ...result,
            full_text: extracted.success ? extracted.full_text : result.summary,
          },
          userId
        );

        if (saveResponse.success) {
          successCount++;
        } else {
          console.error(`Failed to save ${result.reference_number}:`, saveResponse.error);
          errorCount++;
        }
      } catch (error) {
        console.error(`Error importing ${result.reference_number}:`, error);
        errorCount++;
      }
    }

    setIsImporting(false);
    
    if (successCount > 0) {
      toast.success(`${successCount} arrêt(s) ATF importé(s) avec succès`);
      onImportComplete?.();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} erreur(s) lors de l'import`);
    }

    // Clear selection after import
    setSelectedResults(new Set());
  };

  const addPresetKeyword = (keyword: string) => {
    if (keywords) {
      setKeywords(prev => `${prev} ${keyword}`);
    } else {
      setKeywords(keyword);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-amber-500" />
          Import ATF automatique
        </CardTitle>
        <CardDescription>
          Recherchez et importez des arrêts du Tribunal fédéral (ATF) par mots-clés
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Keywords input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Mots-clés de recherche</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ex: curatelle protection adulte, art 390 CC..."
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
                disabled={isSearching || isImporting}
              />
            </div>
          </div>
          
          {/* Preset keywords */}
          <div className="flex flex-wrap gap-1">
            {PRESET_KEYWORDS.map(kw => (
              <Badge
                key={kw.value}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => addPresetKeyword(kw.value)}
              >
                + {kw.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Year filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Période:</span>
          </div>
          <Select value={yearFrom.toString()} onValueChange={(v) => setYearFrom(parseInt(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - 29 + i).map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">à</span>
          <Select value={yearTo.toString()} onValueChange={(v) => setYearTo(parseInt(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - 29 + i).map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleSearch} disabled={isSearching || isImporting}>
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recherche...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Rechercher ATF
              </>
            )}
          </Button>
        </div>

        {/* Sources searched */}
        {sourcesSearched.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Sources consultées: {sourcesSearched.join(", ")}
          </p>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedResults.size === results.length && results.length > 0}
                  onCheckedChange={handleSelectAll}
                  id="select-all"
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Sélectionner tout ({selectedResults.size}/{results.length})
                </label>
              </div>
              <Button 
                onClick={handleImportSelected} 
                disabled={isImporting || selectedResults.size === 0}
                size="sm"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Import {importProgress.current}/{importProgress.total}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Importer sélection ({selectedResults.size})
                  </>
                )}
              </Button>
            </div>

            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-2 space-y-2">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                      selectedResults.has(result.source_url) 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedResults.has(result.source_url)}
                      onCheckedChange={() => toggleSelection(result.source_url)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="default" className="shrink-0">
                          <Gavel className="h-3 w-3 mr-1" />
                          {result.reference_number || 'ATF'}
                        </Badge>
                        {result.date_decision && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(result.date_decision).toLocaleDateString("fr-CH")}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-medium line-clamp-2">{result.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {result.summary}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {result.keywords?.slice(0, 4).map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => window.open(result.source_url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty state */}
        {!isSearching && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Gavel className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              Entrez des mots-clés pour rechercher des arrêts ATF
            </p>
            <p className="text-xs mt-1">
              Les résultats seront extraits automatiquement de bger.ch et entscheide.ch
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
