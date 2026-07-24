from __future__ import annotations

from typing import Any


def build_x_search_queries(keyword_config: dict[str, Any], brand_key: str) -> list[str]:
    brand = keyword_config["brands"][brand_key]
    terms = brand.get("brand_terms", [])
    negative_terms = brand.get("query_negative_terms", [])
    negative_clause = _negative_clause(negative_terms)
    query_groups = brand.get("query_groups", [])

    if query_groups:
        queries = []
        for group in query_groups:
            group_terms = group.get("terms", []) if isinstance(group, dict) else []
            group_context = group.get("context_terms", []) if isinstance(group, dict) else []
            context_clause = f" ({_or_clause(group_context)})" if group_context else ""
            if group_terms:
                queries.append(f"({_or_clause(group_terms)}){context_clause} -filter:retweets {negative_clause}".strip())
        if queries:
            return queries

    if brand_key == "joybuy":
        primary_terms = [
            term
            for term in terms
            if term.lower() not in {"jd", "京东", "jingdong"}
        ]
        queries = [f"({_or_clause(primary_terms)}) -filter:retweets {negative_clause}".strip()]
        jd_terms = [
            "JD.com",
            "Jingdong",
            "京东",
            "JD shopping",
            "JD ecommerce",
            "JD order",
            "JD tracking",
            "JD parcel",
            "JD customer service",
            "JD seller",
            "JD warehouse",
            "JD overseas",
            "JD Europe",
            "JD UK",
            "JD Germany",
            "JD France",
            "JD Netherlands",
            "JD Belgium",
            "JD Luxembourg",
        ]
        queries.append(f"({_or_clause(jd_terms)}) -filter:retweets {negative_clause}".strip())
        return queries

    context_terms = brand.get("query_context_terms", [])
    context_clause = f" ({_or_clause(context_terms)})" if context_terms else ""
    return [f"({_or_clause(terms)}){context_clause} -filter:retweets {negative_clause}".strip()]


def _or_clause(terms: list[str]) -> str:
    return " OR ".join(_format_term(term) for term in terms if term.strip())


def _format_term(term: str) -> str:
    normalized = term.strip()
    if " " in normalized or "." in normalized:
        return f'"{normalized}"'
    return normalized


def _negative_clause(terms: list[str]) -> str:
    if not terms:
        return ""
    return " ".join(f"-{_format_term(term)}" for term in terms if term.strip())
