from deep_translator import GoogleTranslator

_translator = GoogleTranslator(source="auto", target="en")
_NEED_TRANSLATION = {"es", "de"}


def detect_lang(text: str) -> str:
    try:
        return GoogleTranslator(source="auto", target="en").detect(text)
    except Exception:
        return "en"


def translate(text: str, source_lang: str | None = None) -> tuple[str, bool]:
    if not text or len(text.strip()) < 3:
        return text, False

    try:
        lang = source_lang or detect_lang(text[:200])
        if lang not in _NEED_TRANSLATION:
            return text, False

        translated = _translator.translate(text)
        if translated and len(translated) > 10:
            return translated, True
        return text, False
    except Exception:
        return text, False
