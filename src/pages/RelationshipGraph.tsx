import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Network, RefreshCw, ZoomIn, ZoomOut, Maximize, Filter, Users, Building, AlertTriangle, Mail, Download } from 'lucide-react';
import { toast } from 'sonner';

interface GraphNode {
  id: string;
  label: string;
  type: 'actor' | 'institution' | 'incident' | 'email';
  color: string;
  size: number;
  data?: Record<string, unknown>;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
  strength: number;
  color: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const NODE_COLORS = {
  actor: 'hsl(262, 83%, 58%)',      // Purple
  institution: 'hsl(199, 89%, 48%)', // Blue
  incident: 'hsl(0, 84%, 60%)',      // Red
  email: 'hsl(142, 76%, 36%)',       // Green
};

const NODE_SIZES = {
  actor: 8,
  institution: 12,
  incident: 10,
  email: 6,
};

export default function RelationshipGraph() {
  const graphRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [highlightLinks, setHighlightLinks] = useState<Set<string>>(new Set());

  // Fetch entity relations
  const { data: relations, isLoading: loadingRelations, refetch: refetchRelations } = useQuery({
    queryKey: ['entity-relations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entity_relations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch actors
  const { data: actors, isLoading: loadingActors } = useQuery({
    queryKey: ['actors-for-graph'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actor_trust_scores')
        .select('*');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch incidents
  const { data: incidents, isLoading: loadingIncidents } = useQuery({
    queryKey: ['incidents-for-graph'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incidents')
        .select('id, titre, institution, gravite, statut')
        .order('date_incident', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch emails for connections
  const { data: emails, isLoading: loadingEmails } = useQuery({
    queryKey: ['emails-for-graph'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emails')
        .select('id, subject, sender, recipient, incident_id')
        .order('received_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Build graph data from all sources
  const graphData = useMemo<GraphData>(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();
    const institutionNodes = new Map<string, GraphNode>();

    // Add actors as nodes
    actors?.forEach(actor => {
      const nodeId = `actor-${actor.id}`;
      if (!nodeIds.has(nodeId)) {
        nodes.push({
          id: nodeId,
          label: actor.actor_name,
          type: 'actor',
          color: NODE_COLORS.actor,
          size: NODE_SIZES.actor + (actor.trust_score ? actor.trust_score / 10 : 0),
          data: actor
        });
        nodeIds.add(nodeId);
      }

      // Create institution node if exists
      if (actor.actor_institution && !institutionNodes.has(actor.actor_institution)) {
        const instNodeId = `institution-${actor.actor_institution}`;
        const instNode: GraphNode = {
          id: instNodeId,
          label: actor.actor_institution,
          type: 'institution',
          color: NODE_COLORS.institution,
          size: NODE_SIZES.institution,
          data: { name: actor.actor_institution }
        };
        institutionNodes.set(actor.actor_institution, instNode);
        nodes.push(instNode);
        nodeIds.add(instNodeId);
      }

      // Link actor to institution
      if (actor.actor_institution) {
        links.push({
          source: nodeId,
          target: `institution-${actor.actor_institution}`,
          type: 'belongs_to',
          strength: 0.8,
          color: 'hsl(var(--muted-foreground) / 0.3)'
        });
      }
    });

    // Add incidents as nodes
    incidents?.forEach(incident => {
      const nodeId = `incident-${incident.id}`;
      if (!nodeIds.has(nodeId)) {
        nodes.push({
          id: nodeId,
          label: incident.titre.substring(0, 30) + (incident.titre.length > 30 ? '...' : ''),
          type: 'incident',
          color: incident.gravite === 'critique' ? 'hsl(0, 84%, 50%)' : 
                 incident.gravite === 'majeure' ? 'hsl(25, 95%, 53%)' : NODE_COLORS.incident,
          size: NODE_SIZES.incident,
          data: incident
        });
        nodeIds.add(nodeId);
      }

      // Create/link institution from incident
      if (incident.institution) {
        if (!institutionNodes.has(incident.institution)) {
          const instNodeId = `institution-${incident.institution}`;
          if (!nodeIds.has(instNodeId)) {
            const instNode: GraphNode = {
              id: instNodeId,
              label: incident.institution,
              type: 'institution',
              color: NODE_COLORS.institution,
              size: NODE_SIZES.institution,
              data: { name: incident.institution }
            };
            institutionNodes.set(incident.institution, instNode);
            nodes.push(instNode);
            nodeIds.add(instNodeId);
          }
        }

        links.push({
          source: nodeId,
          target: `institution-${incident.institution}`,
          type: 'involves',
          strength: 0.9,
          color: 'hsl(0, 84%, 60% / 0.4)'
        });
      }
    });

    // Add entity relations as links
    relations?.forEach(relation => {
      const sourceId = `${relation.source_type}-${relation.source_id}`;
      const targetId = `${relation.target_type}-${relation.target_id}`;
      
      if (nodeIds.has(sourceId) && nodeIds.has(targetId)) {
        links.push({
          source: sourceId,
          target: targetId,
          type: relation.relation_type,
          strength: relation.relation_strength || 0.5,
          color: relation.is_verified ? 'hsl(142, 76%, 36% / 0.6)' : 'hsl(var(--muted-foreground) / 0.3)'
        });
      }
    });

    // Add email connections to incidents
    emails?.forEach(email => {
      if (email.incident_id) {
        const emailNodeId = `email-${email.id}`;
        const incidentNodeId = `incident-${email.incident_id}`;
        
        if (nodeIds.has(incidentNodeId) && !nodeIds.has(emailNodeId)) {
          nodes.push({
            id: emailNodeId,
            label: email.subject?.substring(0, 25) || 'Email',
            type: 'email',
            color: NODE_COLORS.email,
            size: NODE_SIZES.email,
            data: email
          });
          nodeIds.add(emailNodeId);

          links.push({
            source: emailNodeId,
            target: incidentNodeId,
            type: 'evidence',
            strength: 0.7,
            color: 'hsl(142, 76%, 36% / 0.3)'
          });
        }
      }
    });

    // Filter nodes based on selected type
    if (filterType !== 'all') {
      const filteredNodes = nodes.filter(n => n.type === filterType);
      const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
      const filteredLinks = links.filter(l => 
        filteredNodeIds.has(l.source as string) && filteredNodeIds.has(l.target as string)
      );
      return { nodes: filteredNodes, links: filteredLinks };
    }

    return { nodes, links };
  }, [actors, incidents, emails, relations, filterType]);

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: Math.max(500, height) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Handle node click
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    
    // Highlight connected nodes
    const connectedNodes = new Set<string>();
    const connectedLinks = new Set<string>();
    
    connectedNodes.add(node.id);
    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source;
      const targetId = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target;
      
      if (sourceId === node.id) {
        connectedNodes.add(targetId);
        connectedLinks.add(`${sourceId}-${targetId}`);
      } else if (targetId === node.id) {
        connectedNodes.add(sourceId);
        connectedLinks.add(`${sourceId}-${targetId}`);
      }
    });

    setHighlightNodes(connectedNodes);
    setHighlightLinks(connectedLinks);
  }, [graphData.links]);

  // Reset highlight on background click
  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
  }, []);

  // Zoom controls
  const handleZoomIn = () => graphRef.current?.zoom(1.5, 400);
  const handleZoomOut = () => graphRef.current?.zoom(0.67, 400);
  const handleFitView = () => graphRef.current?.zoomToFit(400, 50);

  // Export graph as image
  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'relationship-graph.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Graphe exporté en PNG');
    }
  };

  const isLoading = loadingRelations || loadingActors || loadingIncidents || loadingEmails;

  // Stats
  const stats = useMemo(() => ({
    totalNodes: graphData.nodes.length,
    actors: graphData.nodes.filter(n => n.type === 'actor').length,
    institutions: graphData.nodes.filter(n => n.type === 'institution').length,
    incidents: graphData.nodes.filter(n => n.type === 'incident').length,
    emails: graphData.nodes.filter(n => n.type === 'email').length,
    connections: graphData.links.length
  }), [graphData]);

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <PageHeader
          title="Graphe de Relations"
          description="Visualisation des connexions entre acteurs, institutions et incidents"
          icon={<Network className="h-6 w-6" />}
        />

        <div className="flex-1 p-4 space-y-4 overflow-hidden">
          {/* Controls bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="actor">Acteurs</SelectItem>
                <SelectItem value="institution">Institutions</SelectItem>
                <SelectItem value="incident">Incidents</SelectItem>
                <SelectItem value="email">Emails</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 ml-auto">
              <Button variant="outline" size="icon" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={handleFitView}>
                <Maximize className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => refetchRelations()}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="icon" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" style={{ color: NODE_COLORS.actor }} />
              {stats.actors} Acteurs
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Building className="h-3 w-3" style={{ color: NODE_COLORS.institution }} />
              {stats.institutions} Institutions
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" style={{ color: NODE_COLORS.incident }} />
              {stats.incidents} Incidents
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Mail className="h-3 w-3" style={{ color: NODE_COLORS.email }} />
              {stats.emails} Emails
            </Badge>
            <Badge variant="secondary">
              {stats.connections} connexions
            </Badge>
          </div>

          {/* Graph and details panel */}
          <div className="flex gap-4 flex-1 min-h-0">
            {/* Graph container */}
            <Card className="flex-1 overflow-hidden">
              <div ref={containerRef} className="w-full h-[500px] lg:h-[600px]">
                {!isLoading && graphData.nodes.length > 0 ? (
                  <ForceGraph2D
                    ref={graphRef}
                    graphData={graphData}
                    width={dimensions.width}
                    height={dimensions.height}
                    nodeLabel={(node: GraphNode) => `${node.label} (${node.type})`}
                    nodeColor={(node: GraphNode) => 
                      highlightNodes.size === 0 || highlightNodes.has(node.id) 
                        ? node.color 
                        : 'hsl(var(--muted-foreground) / 0.2)'
                    }
                    nodeRelSize={1}
                    nodeVal={(node: GraphNode) => node.size}
                    linkColor={(link: GraphLink) => {
                      const sourceId = typeof link.source === 'object' ? (link.source as GraphNode).id : link.source;
                      const targetId = typeof link.target === 'object' ? (link.target as GraphNode).id : link.target;
                      return highlightLinks.size === 0 || highlightLinks.has(`${sourceId}-${targetId}`)
                        ? link.color
                        : 'hsl(var(--muted-foreground) / 0.05)';
                    }}
                    linkWidth={(link: GraphLink) => link.strength * 2}
                    linkDirectionalParticles={2}
                    linkDirectionalParticleWidth={2}
                    onNodeClick={handleNodeClick}
                    onBackgroundClick={handleBackgroundClick}
                    cooldownTicks={100}
                    d3AlphaDecay={0.02}
                    d3VelocityDecay={0.3}
                    enableNodeDrag={true}
                    enableZoomInteraction={true}
                    enablePanInteraction={true}
                  />
                ) : isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Network className="h-16 w-16 mb-4 opacity-30" />
                    <p>Aucune relation trouvée</p>
                    <p className="text-sm">Entraînez l'IA pour créer des connexions</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Details panel */}
            {selectedNode && (
              <Card className="w-80 shrink-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedNode.color }}
                    />
                    {selectedNode.label}
                  </CardTitle>
                  <Badge variant="outline" className="w-fit">
                    {selectedNode.type}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedNode.type === 'actor' && selectedNode.data && (
                    <>
                      {(selectedNode.data as { actor_email?: string }).actor_email && (
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm">{(selectedNode.data as { actor_email?: string }).actor_email}</p>
                        </div>
                      )}
                      {(selectedNode.data as { actor_institution?: string }).actor_institution && (
                        <div>
                          <p className="text-xs text-muted-foreground">Institution</p>
                          <p className="text-sm">{(selectedNode.data as { actor_institution?: string }).actor_institution}</p>
                        </div>
                      )}
                      {(selectedNode.data as { trust_score?: number }).trust_score !== undefined && (
                        <div>
                          <p className="text-xs text-muted-foreground">Score de confiance</p>
                          <p className="text-sm font-medium">{(selectedNode.data as { trust_score?: number }).trust_score}/100</p>
                        </div>
                      )}
                    </>
                  )}

                  {selectedNode.type === 'incident' && selectedNode.data && (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground">Titre complet</p>
                        <p className="text-sm">{(selectedNode.data as { titre?: string }).titre}</p>
                      </div>
                      {(selectedNode.data as { gravite?: string }).gravite && (
                        <div>
                          <p className="text-xs text-muted-foreground">Gravité</p>
                          <Badge variant={
                            (selectedNode.data as { gravite?: string }).gravite === 'critique' ? 'destructive' :
                            (selectedNode.data as { gravite?: string }).gravite === 'majeure' ? 'default' : 'secondary'
                          }>
                            {(selectedNode.data as { gravite?: string }).gravite}
                          </Badge>
                        </div>
                      )}
                      {(selectedNode.data as { statut?: string }).statut && (
                        <div>
                          <p className="text-xs text-muted-foreground">Statut</p>
                          <p className="text-sm">{(selectedNode.data as { statut?: string }).statut}</p>
                        </div>
                      )}
                    </>
                  )}

                  {selectedNode.type === 'email' && selectedNode.data && (
                    <>
                      <div>
                        <p className="text-xs text-muted-foreground">Sujet</p>
                        <p className="text-sm">{(selectedNode.data as { subject?: string }).subject}</p>
                      </div>
                      {(selectedNode.data as { sender?: string }).sender && (
                        <div>
                          <p className="text-xs text-muted-foreground">Expéditeur</p>
                          <p className="text-sm">{(selectedNode.data as { sender?: string }).sender}</p>
                        </div>
                      )}
                    </>
                  )}

                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Connexions: {graphData.links.filter(l => {
                        const sourceId = typeof l.source === 'object' ? (l.source as GraphNode).id : l.source;
                        const targetId = typeof l.target === 'object' ? (l.target as GraphNode).id : l.target;
                        return sourceId === selectedNode.id || targetId === selectedNode.id;
                      }).length}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="font-medium">Légende:</span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.actor }} />
              Acteur
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.institution }} />
              Institution
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.incident }} />
              Incident
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.email }} />
              Email
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
