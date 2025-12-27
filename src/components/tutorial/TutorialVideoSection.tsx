import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Zap, ArrowRight, Workflow, Video } from "lucide-react";
import { AnimatedTutorialGif } from "./AnimatedTutorialGif";

interface TutorialVideoSectionProps {
  icon: React.ElementType;
  title: string;
  description: string;
  steps: string[];
  result: string;
  tips?: string[];
  image?: string;
  videoSrc?: string;
}

export const TutorialVideoSection = ({
  icon: Icon,
  title,
  description,
  steps,
  result,
  tips,
  image,
  videoSrc,
}: TutorialVideoSectionProps) => (
  <Card className="glass-card border-border/30">
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-primary/20 text-primary">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Video Animation (prioritaire) */}
      {videoSrc && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <Video className="w-4 h-4 text-primary" />
            <span>Démonstration animée - Cliquez pour lire</span>
          </div>
          <AnimatedTutorialGif
            videoSrc={videoSrc}
            posterSrc={image}
            title={`Démonstration: ${title}`}
          />
        </div>
      )}

      {/* Static Screenshot (fallback si pas de vidéo) */}
      {!videoSrc && image && (
        <div className="rounded-xl overflow-hidden border border-border/30 shadow-lg">
          <img
            src={image}
            alt={`Capture d'écran - ${title}`}
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      <div>
        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <Workflow className="w-4 h-4 text-primary" />
          Étapes à suivre
        </h4>
        <ol className="space-y-2">
          {steps.map((step, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-medium">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <Separator className="bg-border/30" />

      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
        <h4 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Résultat attendu
        </h4>
        <p className="text-muted-foreground text-sm">{result}</p>
      </div>

      {tips && tips.length > 0 && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <h4 className="font-semibold text-yellow-400 mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Conseils
          </h4>
          <ul className="space-y-1">
            {tips.map((tip, index) => (
              <li key={index} className="text-muted-foreground text-sm flex items-start gap-2">
                <ArrowRight className="w-3 h-3 mt-1 text-yellow-400 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </CardContent>
  </Card>
);
