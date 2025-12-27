import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Search, BookOpen, Shield, Scale, FileText, Hash, Check, X, RefreshCw } from "lucide-react";

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

const CODE_NAMES = [
  "CC", "CO", "CP", "CPC", "CPP", "PA", "LPD", "Cst.",
  "LVPAE", "LPA-VD", "LSP", "RAM", "CSIAS"
];

export default function LegalRepository() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<LegalArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDomain, setFilterDomain] = useState<string>("");
  const [filterCode, setFilterCode] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newArticle, setNewArticle] = useState({
    code_name: "",
    article_number: "",
    article_title: "",
    article_text: "",
    domain: "",
    keywords: "",
    source_url: "",
  });

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("legal_articles")
      .select("*")
      .eq("is_current", true)
      .order("code_name")
      .order("article_number");

    if (error) {
      toast.error("Erreur lors du chargement du référentiel");
      console.error(error);
    } else {
      setArticles(data || []);
    }
    setIsLoading(false);
  };

  const generateHash = async (content: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  const handleAddArticle = async () => {
    if (!newArticle.code_name || !newArticle.article_number || !newArticle.article_text) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const contentHash = await generateHash(newArticle.article_text);
    const keywords = newArticle.keywords.split(",").map(k => k.trim()).filter(Boolean);

    const { error } = await supabase.from("legal_articles").insert({
      code_name: newArticle.code_name,
      article_number: newArticle.article_number,
      article_title: newArticle.article_title || null,
      article_text: newArticle.article_text,
      domain: newArticle.domain || null,
      keywords,
      source_url: newArticle.source_url || null,
      content_hash: contentHash,
      user_id: user.id,
    });

    if (error) {
      toast.error("Erreur lors de l'ajout de l'article");
      console.error(error);
    } else {
      toast.success("Article ajouté au référentiel");
      setIsAddDialogOpen(false);
      setNewArticle({
        code_name: "",
        article_number: "",
        article_title: "",
        article_text: "",
        domain: "",
        keywords: "",
        source_url: "",
      });
      loadArticles();
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = searchTerm === "" || 
      article.code_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.article_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.article_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.article_title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDomain = filterDomain === "" || filterDomain === "all" || article.domain === filterDomain;
    const matchesCode = filterCode === "" || filterCode === "all" || article.code_name === filterCode;
    
    return matchesSearch && matchesDomain && matchesCode;
  });

  const stats = {
    total: articles.length,
    byDomain: DOMAINS.map(d => ({
      ...d,
      count: articles.filter(a => a.domain === d.value).length
    })),
    byCodes: CODE_NAMES.map(code => ({
      code,
      count: articles.filter(a => a.code_name === code).length
    })).filter(c => c.count > 0),
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Référentiel Légal</h1>
          <p className="text-muted-foreground">Base de données des articles légaux suisses vérifiés</p>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Articles totaux</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.byDomain.find(d => d.value === "protection_adulte")?.count || 0}</p>
                  <p className="text-sm text-muted-foreground">Protection adulte</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.byDomain.find(d => d.value === "procedure")?.count || 0}</p>
                  <p className="text-sm text-muted-foreground">Procédure</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.byDomain.find(d => d.value === "protection_donnees")?.count || 0}</p>
                  <p className="text-sm text-muted-foreground">Protection données</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Bar */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un article..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterDomain} onValueChange={setFilterDomain}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Domaine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les domaines</SelectItem>
                  {DOMAINS.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCode} onValueChange={setFilterCode}>
                <SelectTrigger className="w-full md:w-32">
                  <SelectValue placeholder="Code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  {CODE_NAMES.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={loadArticles} variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Ajouter un article légal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Code *</label>
                        <Select value={newArticle.code_name} onValueChange={(v) => setNewArticle({...newArticle, code_name: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {CODE_NAMES.map(code => (
                              <SelectItem key={code} value={code}>{code}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Numéro d'article *</label>
                        <Input
                          placeholder="ex: 388"
                          value={newArticle.article_number}
                          onChange={(e) => setNewArticle({...newArticle, article_number: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Titre</label>
                      <Input
                        placeholder="ex: But des mesures"
                        value={newArticle.article_title}
                        onChange={(e) => setNewArticle({...newArticle, article_title: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Texte de l'article *</label>
                      <Textarea
                        placeholder="Contenu complet de l'article..."
                        value={newArticle.article_text}
                        onChange={(e) => setNewArticle({...newArticle, article_text: e.target.value})}
                        rows={5}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Domaine</label>
                        <Select value={newArticle.domain} onValueChange={(v) => setNewArticle({...newArticle, domain: v})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {DOMAINS.map(d => (
                              <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Mots-clés</label>
                        <Input
                          placeholder="ex: curatelle, protection, adulte"
                          value={newArticle.keywords}
                          onChange={(e) => setNewArticle({...newArticle, keywords: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">URL source</label>
                      <Input
                        placeholder="https://www.fedlex.admin.ch/..."
                        value={newArticle.source_url}
                        onChange={(e) => setNewArticle({...newArticle, source_url: e.target.value})}
                      />
                    </div>
                    <Button onClick={handleAddArticle} className="w-full">
                      <Check className="h-4 w-4 mr-2" />
                      Ajouter au référentiel
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Articles Table */}
        <Card>
          <CardHeader>
            <CardTitle>Articles ({filteredArticles.length})</CardTitle>
            <CardDescription>
              Base légale vérifiée pour la validation des analyses IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Chargement...</div>
            ) : filteredArticles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun article dans le référentiel</p>
                <p className="text-sm">Ajoutez des articles légaux pour activer les guardrails anti-hallucination</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Code</TableHead>
                    <TableHead className="w-20">Article</TableHead>
                    <TableHead>Titre / Résumé</TableHead>
                    <TableHead className="w-32">Domaine</TableHead>
                    <TableHead className="w-24">Version</TableHead>
                    <TableHead className="w-20">Hash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArticles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell>
                        <Badge variant="outline">{article.code_name}</Badge>
                      </TableCell>
                      <TableCell className="font-mono">{article.article_number}</TableCell>
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
                      <TableCell className="text-sm text-muted-foreground">
                        v{article.version_number}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {article.content_hash.substring(0, 8)}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
