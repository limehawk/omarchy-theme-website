"use client";

import { useEffect, useState } from "react";
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

export function SearchBar({ names, value: externalValue, onChange }: SearchBarProps) {
  const [value, setValue] = useState(externalValue);

  useEffect(() => {
    setValue(externalValue);
  }, [externalValue]);

  useEffect(() => {
    const timeout = setTimeout(() => onChange(value), 200);
    return () => clearTimeout(timeout);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Combobox
      items={names}
      value={value || null}
      onValueChange={(v) => setValue(v ?? "")}
      inputValue={value}
      onInputValueChange={(v) => setValue(v)}
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
