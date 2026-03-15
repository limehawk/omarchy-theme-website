"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

interface AuthorFilterProps {
  authors: string[];
  value: string;
  onChange: (value: string) => void;
}

export function AuthorFilter({ authors, value, onChange }: AuthorFilterProps) {
  return (
    <Combobox
      items={authors}
      value={value || null}
      onValueChange={(v) => onChange(v ?? "")}
    >
      <ComboboxInput
        placeholder="find an author..."
        showClear={!!value}
        className="w-48 font-mono text-sm"
      />
      <ComboboxContent>
        <ComboboxEmpty>No authors found.</ComboboxEmpty>
        <ComboboxList>
          {(author) => (
            <ComboboxItem key={author} value={author} className="font-mono text-sm">
              {author}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
