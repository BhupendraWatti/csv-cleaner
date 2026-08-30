import React from 'react';
import { CheckCircle2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ExportFormat, VerificationReport } from '../../lib/types';

interface SuccessModalProps {
  isOpen: boolean;
  exportFormat: ExportFormat;
  verificationReport: VerificationReport | null;
  lastExportedStats: { rowsRemoved: number; cellsModified: number };
  onClose: () => void;
}

export default function SuccessModal({
  isOpen,
  exportFormat,
  verificationReport,
  lastExportedStats,
  onClose,
}: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-[#c1ecd4] dark:bg-[#104430] text-primary dark:text-[#34d399]">
            <CheckCircle2Icon className="size-8" aria-hidden="true" />
          </div>
          <DialogTitle>Export Complete</DialogTitle>
          <DialogDescription>
            Your verified {exportFormat.toUpperCase()} download has started.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 rounded-xl border bg-muted p-4 text-sm">
          <dt className="text-muted-foreground">Verification status</dt>
          <dd className="font-medium">
            {verificationReport?.isValid ? 'Verified valid' : 'Unverified'}
          </dd>
          <dt className="text-muted-foreground">Cells modified</dt>
          <dd className="font-mono font-medium">{lastExportedStats.cellsModified}</dd>
          <dt className="text-muted-foreground">Rows purged or quarantined</dt>
          <dd className="font-mono font-medium">{lastExportedStats.rowsRemoved}</dd>
          <dt className="text-muted-foreground">Format exported</dt>
          <dd className="font-medium uppercase">{exportFormat}</dd>
        </dl>

        <DialogFooter>
          <Button type="button" className="w-full" onClick={onClose}>
            Back to Workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
