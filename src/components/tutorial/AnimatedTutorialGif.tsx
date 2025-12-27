import { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnimatedTutorialGifProps {
  videoSrc: string;
  posterSrc?: string;
  title: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
}

export const AnimatedTutorialGif = ({
  videoSrc,
  posterSrc,
  title,
  className,
  autoPlay = false,
  loop = true,
}: AnimatedTutorialGifProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isHovered, setIsHovered] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setHasEnded(true);
      setIsPlaying(false);
    };
    const handleLoadedData = () => setIsLoaded(true);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("loadeddata", handleLoadedData);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("loadeddata", handleLoadedData);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (hasEnded) {
      video.currentTime = 0;
      setHasEnded(false);
    }

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const restart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setHasEnded(false);
    video.play();
  };

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden border border-border/30 shadow-lg group cursor-pointer",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={togglePlay}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoSrc}
        poster={posterSrc}
        loop={loop}
        muted
        playsInline
        autoPlay={autoPlay}
        className="w-full h-auto object-cover"
      />

      {/* Loading Overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Play/Pause Overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-background/40 flex items-center justify-center transition-opacity duration-300",
          isPlaying && !isHovered ? "opacity-0" : "opacity-100"
        )}
      >
        {hasEnded ? (
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full w-16 h-16 p-0 bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              restart();
            }}
          >
            <RotateCcw className="w-8 h-8" />
          </Button>
        ) : isPlaying ? (
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full w-16 h-16 p-0 bg-background/80 hover:bg-background text-foreground shadow-lg"
          >
            <Pause className="w-8 h-8" />
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full w-16 h-16 p-0 bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg"
          >
            <Play className="w-8 h-8 ml-1" />
          </Button>
        )}
      </div>

      {/* Title Badge */}
      <div className="absolute bottom-3 left-3 right-3">
        <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-medium text-foreground shadow-lg">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isPlaying ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
            )} />
            <span>{title}</span>
            {isPlaying && (
              <span className="text-xs text-muted-foreground ml-auto">En lecture</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
