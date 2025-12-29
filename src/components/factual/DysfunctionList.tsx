import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, FileText, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Dysfunction {
  id: string;
  type: string;
  description: string;
  date: string;
  proof: string;
  emailId: string;
  severity: 'high' | 'medium' | 'low';
}

interface DysfunctionListProps {
  dysfunctions: Dysfunction[];
}

export function DysfunctionList({ dysfunctions }: DysfunctionListProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return 'Critique';
      case 'medium': return 'Modéré';
      default: return 'Mineur';
    }
  };

  // Group by type
  const groupedByType = dysfunctions.reduce((acc, d) => {
    if (!acc[d.type]) acc[d.type] = [];
    acc[d.type].push(d);
    return acc;
  }, {} as Record<string, Dysfunction[]>);

  if (dysfunctions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Aucun dysfonctionnement détecté</h3>
          <p className="text-sm text-muted-foreground">
            L'analyse des emails n'a pas révélé de dysfonctionnements
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">
              {dysfunctions.filter(d => d.severity === 'high').length}
            </p>
            <p className="text-xs text-muted-foreground">Critiques</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-500">
              {dysfunctions.filter(d => d.severity === 'medium').length}
            </p>
            <p className="text-xs text-muted-foreground">Modérés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">
              {dysfunctions.filter(d => d.severity === 'low').length}
            </p>
            <p className="text-xs text-muted-foreground">Mineurs</p>
          </CardContent>
        </Card>
      </div>

      {/* List by type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Dysfonctionnements constatés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {Object.entries(groupedByType).map(([type, items]) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-sm">{type}</h3>
                    <Badge variant="outline">{items.length}</Badge>
                  </div>

                  <div className="space-y-2">
                    {items.map(dysfunction => (
                      <div 
                        key={dysfunction.id}
                        className="border rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm">{dysfunction.description}</p>
                          <Badge variant={getSeverityColor(dysfunction.severity)} className="shrink-0">
                            {getSeverityLabel(dysfunction.severity)}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {dysfunction.date ? format(new Date(dysfunction.date), 'dd/MM/yyyy', { locale: fr }) : 'N/A'}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {dysfunction.proof}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
