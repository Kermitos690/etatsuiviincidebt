import React, { memo, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Email, EmailAttachment } from './types';
import { EmailDetail } from './EmailDetail';

interface EmailBottomSheetProps {
  email: Email | null;
  attachments: EmailAttachment[];
  loadingAttachments: boolean;
  analyzingAttachment: string | null;
  isProcessing: boolean;
  isAdvancedAnalyzing: boolean;
  onClose: () => void;
  onAnalyze: () => void;
  onAdvancedAnalyze: () => void;
  onCreateIncident: () => void;
  onGenerateResponse: () => void;
  onAnalyzeAttachment: (id: string) => void;
  onDownloadAttachment: (attachment: EmailAttachment) => void;
  onDelete?: () => void;
}

function EmailBottomSheetInner({
  email,
  attachments,
  loadingAttachments,
  analyzingAttachment,
  isProcessing,
  isAdvancedAnalyzing,
  onClose,
  onAnalyze,
  onAdvancedAnalyze,
  onCreateIncident,
  onGenerateResponse,
  onAnalyzeAttachment,
  onDownloadAttachment,
  onDelete,
}: EmailBottomSheetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState(0);

  useEffect(() => {
    if (email) {
      // Small delay for animation
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [email]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setDragY(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startY;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 100) {
      handleClose();
    } else {
      setDragY(0);
    }
  };

  if (!email) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-3xl shadow-2xl",
          "transition-transform duration-300 ease-out",
          isVisible ? "translate-y-0" : "translate-y-full"
        )}
        style={{
          maxHeight: '90vh',
          height: '90vh',
          transform: isVisible && dragY > 0 ? `translateY(${dragY}px)` : undefined,
          transition: isDragging ? 'none' : undefined,
        }}
      >
        {/* Handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1.5 rounded-full bg-border" />
        </div>

        {/* Close button for non-touch devices */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="absolute top-3 right-3 h-8 w-8 p-0 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Content */}
        <div className="h-[calc(100%-2rem)] overflow-hidden">
          <EmailDetail
            email={email}
            attachments={attachments}
            loadingAttachments={loadingAttachments}
            analyzingAttachment={analyzingAttachment}
            isProcessing={isProcessing}
            isAdvancedAnalyzing={isAdvancedAnalyzing}
            onClose={handleClose}
            onAnalyze={onAnalyze}
            onAdvancedAnalyze={onAdvancedAnalyze}
            onCreateIncident={onCreateIncident}
            onGenerateResponse={onGenerateResponse}
            onAnalyzeAttachment={onAnalyzeAttachment}
            onDownloadAttachment={onDownloadAttachment}
            onDelete={onDelete}
          />
        </div>
      </div>
    </>
  );
}

export const EmailBottomSheet = memo(EmailBottomSheetInner);
export default EmailBottomSheet;
