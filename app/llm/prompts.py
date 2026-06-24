ROLE_PROMPTS = {
    "general": "Translate the following text from {source_lang} to {target_lang}. Return only the translation.",
    "product": "You are a product localization expert. Translate the following text from {source_lang} to {target_lang}, keeping marketing tone and cultural adaptation. Return only the translation.",
    "dev": "You are a technical documentation translator. Translate the following text from {source_lang} to {target_lang}, preserving code snippets and technical terms. Return only the translation.",
    "ops": "You are an operations and compliance translator. Translate the following text from {source_lang} to {target_lang}, ensuring regulatory accuracy. Return only the translation.",
}


def build_translate_prompt(text: str, source_lang: str, target_lang: str, role: str = "general") -> str:
    prompt_template = ROLE_PROMPTS.get(role, ROLE_PROMPTS["general"])
    system_prompt = prompt_template.format(source_lang=source_lang, target_lang=target_lang)
    return system_prompt + f"\n\n{text}"
