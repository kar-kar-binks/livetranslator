import { LANGUAGES } from '@shared/languages';

interface Props {
  value: string;
  onChange: (code: string) => void;
  excludeAuto?: boolean;
  className?: string;
}

export default function LanguageSelector({ value, onChange, excludeAuto, className }: Props) {
  const options = excludeAuto ? LANGUAGES.filter((l) => l.code !== 'auto') : LANGUAGES;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`no-drag cursor-pointer rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-700 outline-none transition hover:border-zinc-300 focus:ring-2 focus:ring-accent-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-600 ${className ?? ''}`}
    >
      {options.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.label}
        </option>
      ))}
    </select>
  );
}
