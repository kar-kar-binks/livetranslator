/**
 * Canonical language list shared between renderer and main.
 * `nllbCode` is the FLORES-200 code used by the local NLLB translation model.
 * `whisperCode` is the ISO-639-1 code understood by whisper.cpp.
 * `piperVoice` is the default bundled Piper voice id for TTS output in that language (if any).
 */
export interface LanguageDef {
  code: string;
  label: string;
  nllbCode: string;
  whisperCode: string | null;
  piperVoice: string | null;
  flag: string;
}

export const AUTO_DETECT = 'auto';

export const LANGUAGES: LanguageDef[] = [
  {
    code: 'auto',
    label: 'Auto Detect',
    nllbCode: '',
    whisperCode: null,
    piperVoice: null,
    flag: '🌐',
  },
  {
    code: 'en',
    label: 'English',
    nllbCode: 'eng_Latn',
    whisperCode: 'en',
    piperVoice: 'en_US-lessac-medium',
    flag: '🇺🇸',
  },
  {
    code: 'es',
    label: 'Spanish',
    nllbCode: 'spa_Latn',
    whisperCode: 'es',
    piperVoice: 'es_ES-davefx-medium',
    flag: '🇪🇸',
  },
  {
    code: 'fr',
    label: 'French',
    nllbCode: 'fra_Latn',
    whisperCode: 'fr',
    piperVoice: 'fr_FR-siwis-medium',
    flag: '🇫🇷',
  },
  {
    code: 'de',
    label: 'German',
    nllbCode: 'deu_Latn',
    whisperCode: 'de',
    piperVoice: 'de_DE-thorsten-medium',
    flag: '🇩🇪',
  },
  {
    code: 'it',
    label: 'Italian',
    nllbCode: 'ita_Latn',
    whisperCode: 'it',
    piperVoice: 'it_IT-riccardo-x_low',
    flag: '🇮🇹',
  },
  {
    code: 'pt',
    label: 'Portuguese',
    nllbCode: 'por_Latn',
    whisperCode: 'pt',
    piperVoice: 'pt_BR-faber-medium',
    flag: '🇵🇹',
  },
  {
    code: 'zh',
    label: 'Chinese',
    nllbCode: 'zho_Hans',
    whisperCode: 'zh',
    piperVoice: null,
    flag: '🇨🇳',
  },
  {
    code: 'ja',
    label: 'Japanese',
    nllbCode: 'jpn_Jpan',
    whisperCode: 'ja',
    piperVoice: null,
    flag: '🇯🇵',
  },
  {
    code: 'ko',
    label: 'Korean',
    nllbCode: 'kor_Hang',
    whisperCode: 'ko',
    piperVoice: null,
    flag: '🇰🇷',
  },
  {
    code: 'hi',
    label: 'Hindi',
    nllbCode: 'hin_Deva',
    whisperCode: 'hi',
    piperVoice: 'hi_IN-pratham-medium',
    flag: '🇮🇳',
  },
  {
    code: 'ar',
    label: 'Arabic',
    nllbCode: 'arb_Arab',
    whisperCode: 'ar',
    piperVoice: 'ar_JO-kareem-medium',
    flag: '🇸🇦',
  },
  {
    code: 'ru',
    label: 'Russian',
    nllbCode: 'rus_Cyrl',
    whisperCode: 'ru',
    piperVoice: 'ru_RU-irina-medium',
    flag: '🇷🇺',
  },
  {
    code: 'tr',
    label: 'Turkish',
    nllbCode: 'tur_Latn',
    whisperCode: 'tr',
    piperVoice: 'tr_TR-fahrettin-medium',
    flag: '🇹🇷',
  },
  {
    code: 'vi',
    label: 'Vietnamese',
    nllbCode: 'vie_Latn',
    whisperCode: 'vi',
    piperVoice: 'vi_VN-vais1000-medium',
    flag: '🇻🇳',
  },
  {
    code: 'th',
    label: 'Thai',
    nllbCode: 'tha_Thai',
    whisperCode: 'th',
    piperVoice: null,
    flag: '🇹🇭',
  },
  {
    code: 'nl',
    label: 'Dutch',
    nllbCode: 'nld_Latn',
    whisperCode: 'nl',
    piperVoice: 'nl_NL-mls-medium',
    flag: '🇳🇱',
  },
  {
    code: 'pl',
    label: 'Polish',
    nllbCode: 'pol_Latn',
    whisperCode: 'pl',
    piperVoice: 'pl_PL-darkman-medium',
    flag: '🇵🇱',
  },
  {
    code: 'sv',
    label: 'Swedish',
    nllbCode: 'swe_Latn',
    whisperCode: 'sv',
    piperVoice: 'sv_SE-nst-medium',
    flag: '🇸🇪',
  },
  {
    code: 'uk',
    label: 'Ukrainian',
    nllbCode: 'ukr_Cyrl',
    whisperCode: 'uk',
    piperVoice: 'uk_UA-ukrainian_tts-medium',
    flag: '🇺🇦',
  },
  {
    code: 'id',
    label: 'Indonesian',
    nllbCode: 'ind_Latn',
    whisperCode: 'id',
    piperVoice: 'id_ID-fajri-medium',
    flag: '🇮🇩',
  },
  {
    code: 'he',
    label: 'Hebrew',
    nllbCode: 'heb_Hebr',
    whisperCode: 'he',
    piperVoice: null,
    flag: '🇮🇱',
  },
  {
    code: 'el',
    label: 'Greek',
    nllbCode: 'ell_Grek',
    whisperCode: 'el',
    piperVoice: 'el_GR-rapunzelina-low',
    flag: '🇬🇷',
  },
  {
    code: 'cs',
    label: 'Czech',
    nllbCode: 'ces_Latn',
    whisperCode: 'cs',
    piperVoice: 'cs_CZ-jirka-medium',
    flag: '🇨🇿',
  },
  {
    code: 'ro',
    label: 'Romanian',
    nllbCode: 'ron_Latn',
    whisperCode: 'ro',
    piperVoice: 'ro_RO-mihai-medium',
    flag: '🇷🇴',
  },
  {
    code: 'fa',
    label: 'Persian',
    nllbCode: 'pes_Arab',
    whisperCode: 'fa',
    piperVoice: 'fa_IR-amir-medium',
    flag: '🇮🇷',
  },
  {
    code: 'ur',
    label: 'Urdu',
    nllbCode: 'urd_Arab',
    whisperCode: 'ur',
    piperVoice: 'ur_PK-asad-medium',
    flag: '🇵🇰',
  },
  {
    code: 'bn',
    label: 'Bengali',
    nllbCode: 'ben_Beng',
    whisperCode: 'bn',
    piperVoice: 'bn_BD-multi-medium',
    flag: '🇧🇩',
  },
  {
    code: 'sw',
    label: 'Swahili',
    nllbCode: 'swh_Latn',
    whisperCode: 'sw',
    piperVoice: null,
    flag: '🇹🇿',
  },
];

export function getLanguage(code: string): LanguageDef {
  const found = LANGUAGES.find((l) => l.code === code);
  if (!found) throw new Error(`Unknown language code: ${code}`);
  return found;
}
