"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

interface SearchBarProps {
  names: string[];
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ names, value, onChange }: SearchBarProps) {
  return (
    <Combobox
      items={names}
      value={value || null}
      onValueChange={(v) => onChange(v ?? "")}
      filter={(value, query) => value.toLowerCase().includes(query.toLowerCase())}
    >
      <ComboboxInput
        placeholder="find a theme..."
        showClear={!!value}
        className="w-full font-mono text-sm"
      />
      <ComboboxContent>
        <ComboboxEmpty>No themes found.</ComboboxEmpty>
        <ComboboxList>
          {(name) => (
            <ComboboxItem key={name} value={name} className="font-mono text-sm">
              {name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
