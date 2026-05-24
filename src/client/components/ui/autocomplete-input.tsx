import { useState, useRef, useEffect } from "react";
import { FormInput } from "./primitives";

interface Suggestion {
  key: string;
  label: string;
}

interface AutocompleteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (val: string) => void;
  suggestions: Suggestion[];
  className?: string;
}

export function AutocompleteInput({
  value,
  onChange,
  suggestions,
  className,
  ...props
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [triggerIndex, setTriggerIndex] = useState(-1);
  const [activeIndex, setActiveIndex] = useState(0);
  const [filtered, setFiltered] = useState<Suggestion[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setFiltered([]);
      return;
    }
    const matching = suggestions.filter((s) =>
      s.key.toLowerCase().includes(query.toLowerCase())
    );
    setFiltered(matching);
    setActiveIndex(0);
  }, [query, suggestions, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || filtered.length === 0) {
      if (props.onKeyDown) props.onKeyDown(e);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectSuggestion(filtered[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else {
      if (props.onKeyDown) props.onKeyDown(e);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);

    const selectionStart = e.target.selectionStart ?? 0;
    const textBeforeCursor = val.substring(0, selectionStart);

    const lastDollarIndex = textBeforeCursor.lastIndexOf("$");
    if (lastDollarIndex !== -1) {
      const isBrace = textBeforeCursor.charAt(lastDollarIndex + 1) === "{";
      const startIdx = lastDollarIndex;
      const offset = isBrace ? 2 : 1;
      const searchVal = textBeforeCursor.substring(lastDollarIndex + offset);

      if (!searchVal.includes("}") && !searchVal.includes(" ")) {
        setIsOpen(true);
        setTriggerIndex(startIdx);
        setQuery(searchVal);
        return;
      }
    }

    setIsOpen(false);
  }

  function selectSuggestion(s?: Suggestion) {
    if (!s || !inputRef.current) return;

    const selectionStart = inputRef.current.selectionStart ?? 0;
    const beforeTrigger = value.substring(0, triggerIndex);
    const afterCursor = value.substring(selectionStart);

    const newValue = `${beforeTrigger}\${${s.key}}${afterCursor}`;
    onChange(newValue);
    setIsOpen(false);

    const newCursorPos = triggerIndex + s.key.length + 3; 
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  }

  return (
    <div className="relative w-full">
      <FormInput
        {...props}
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={className}
      />
      {isOpen && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 top-[calc(100%+0.25rem)] w-full max-h-60 overflow-y-auto border border-zinc-700 bg-zinc-950/98 shadow-2xl rounded backdrop-blur-md"
        >
          <div className="flex flex-col">
            {filtered.map((item, index) => (
              <button
                key={item.key}
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition duration-150 border-b border-zinc-900/60 last:border-b-0 ${
                  index === activeIndex
                    ? "bg-[#4FB8B2]/12 text-[#7fe3dd]"
                    : "text-zinc-300 hover:bg-zinc-900/70 hover:text-zinc-100"
                }`}
                onClick={() => selectSuggestion(item)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="font-mono text-xs text-zinc-500 font-semibold">{`{ }`}</span>
                <div className="flex flex-col min-w-0">
                  <span className="font-mono text-[13px] font-semibold tracking-wide truncate">
                    {"${" + item.key + "}"}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-sans mt-0.5 truncate">
                    {item.label}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
