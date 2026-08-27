import React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { FindAndReplaceConfig } from '../../lib/types';

interface FindReplaceModalProps {
  isOpen: boolean;
  findReplace: FindAndReplaceConfig;
  onFindReplaceChange: (config: FindAndReplaceConfig) => void;
  onClose: () => void;
  onApply: () => void;
}

export default function FindReplaceModal({
  isOpen,
  findReplace,
  onFindReplaceChange,
  onClose,
  onApply,
}: FindReplaceModalProps) {
  const clearAndClose = () => {
    onFindReplaceChange({ search: '', replace: '', isRegex: false, matchCase: false });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Find and Replace</DialogTitle>
          <DialogDescription>
            Replace matching cell values across the cleaned preview before export.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="find-pattern">Find pattern</FieldLabel>
            <Input
              id="find-pattern"
              autoFocus
              placeholder="Text or pattern to search"
              value={findReplace.search}
              onChange={(event) =>
                onFindReplaceChange({ ...findReplace, search: event.target.value })
              }
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="replace-with">Replace with</FieldLabel>
            <Input
              id="replace-with"
              placeholder="Replacement text"
              value={findReplace.replace}
              onChange={(event) =>
                onFindReplaceChange({ ...findReplace, replace: event.target.value })
              }
            />
          </Field>

          <FieldSet>
            <FieldLegend variant="label">Matching options</FieldLegend>
            <FieldGroup data-slot="checkbox-group">
              <Field orientation="horizontal">
                <Checkbox
                  id="match-case"
                  checked={findReplace.matchCase}
                  onCheckedChange={(checked) =>
                    onFindReplaceChange({ ...findReplace, matchCase: Boolean(checked) })
                  }
                />
                <FieldLabel htmlFor="match-case">Match case</FieldLabel>
              </Field>
              <Field orientation="horizontal">
                <Checkbox
                  id="regex-mode"
                  checked={findReplace.isRegex}
                  onCheckedChange={(checked) =>
                    onFindReplaceChange({ ...findReplace, isRegex: Boolean(checked) })
                  }
                />
                <FieldLabel htmlFor="regex-mode">Regex mode</FieldLabel>
              </Field>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={clearAndClose}>
            Clear &amp; Close
          </Button>
          <Button type="button" disabled={!findReplace.search.trim()} onClick={onApply}>
            Apply Transform
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
