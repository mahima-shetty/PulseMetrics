"""
RAG (Retrieval-Augmented Generation) service for Ask AI Expert.
Uses 5 business reference documents + real business data to give expert recommendations.
"""
import re
from pathlib import Path
from uuid import UUID

from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import get_settings
from app.services.llm_service import get_client
from app.services.dashboard_service import get_kpis, get_revenue_chart, get_orders_chart, get_top_products
from app.services.segmentation_service import compute_segments
from app.services.churn_service import get_at_risk_customers
from app.services.alerts_service import get_alerts

_DOCS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "business_docs"
_CHUNK_SIZE = 400
_CHUNK_OVERLAP = 80
_TOP_K = 5

_chunks_cache: list[tuple[str, str]] | None = None
_vectorizer_cache: TfidfVectorizer | None = None
_matrix_cache = None


def _load_and_chunk_docs() -> list[tuple[str, str]]:
    """Load all markdown docs and split into overlapping chunks. Returns [(chunk_text, source_doc)]."""
    global _chunks_cache
    if _chunks_cache is not None:
        return _chunks_cache

    chunks: list[tuple[str, str]] = []
    if not _DOCS_DIR.exists():
        return chunks

    for path in sorted(_DOCS_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8", errors="ignore")
        source = path.stem.replace("_", " ").title()
        # Split by double newline or heading, then by sentence/size
        parts = re.split(r"\n\n+|\n#+ ", text)
        for part in parts:
            part = part.strip()
            if len(part) < 50:
                continue
            # Split long parts into smaller chunks
            start = 0
            while start < len(part):
                end = min(start + _CHUNK_SIZE, len(part))
                if end < len(part):
                    # Try to break at sentence or word
                    break_at = part.rfind(". ", start, end + 1)
                    if break_at > start:
                        end = break_at + 1
                    else:
                        break_at = part.rfind(" ", start, end + 1)
                        if break_at > start:
                            end = break_at + 1
                chunk = part[start:end].strip()
                if len(chunk) >= 50:
                    chunks.append((chunk, source))
                start = end - _CHUNK_OVERLAP if end < len(part) else len(part)

    _chunks_cache = chunks
    return chunks


def _retrieve(query: str, top_k: int = _TOP_K) -> list[tuple[str, str]]:
    """Retrieve top-k most relevant chunks using TF-IDF cosine similarity."""
    global _vectorizer_cache, _matrix_cache
    chunks = _load_and_chunk_docs()
    if not chunks:
        return []

    texts = [c[0] for c in chunks]
    vectorizer = _vectorizer_cache
    matrix = _matrix_cache

    if vectorizer is None:
        vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words="english",
            ngram_range=(1, 2),
        )
        matrix = vectorizer.fit_transform(texts)
        _vectorizer_cache = vectorizer
        _matrix_cache = matrix

    query_vec = vectorizer.transform([query])
    sims = cosine_similarity(query_vec, matrix)[0]
    top_indices = sims.argsort()[-top_k:][::-1]

    return [chunks[i] for i in top_indices if sims[i] > 0]


def _gather_business_data(db: Session, user_id: UUID) -> str:
    """Fetch real business metrics and format for the prompt."""
    parts = []

    try:
        kpis = get_kpis(db, user_id)
        parts.append(f"""**KPIs**
- Total revenue: ${kpis['total_revenue']:,.0f}
- Total orders: {kpis['total_orders']}
- Total customers: {kpis['total_customers']}
- Monthly growth: {kpis['monthly_growth']}%""")
    except Exception:
        parts.append("**KPIs**: Unable to load.")

    try:
        rev_chart = get_revenue_chart(db, user_id, 30)
        rev_30d = sum(r["revenue"] for r in rev_chart)
        parts.append(f"""**Revenue (last 30 days)**
- Total: ${rev_30d:,.0f}
- Days with data: {len(rev_chart)}""")
    except Exception:
        parts.append("**Revenue (30d)**: Unable to load.")

    try:
        ord_chart = get_orders_chart(db, user_id, 14)
        ord_14d = sum(r["orders"] for r in ord_chart)
        parts.append(f"""**Orders (last 14 days)**
- Total: {ord_14d}
- Days with data: {len(ord_chart)}""")
    except Exception:
        parts.append("**Orders (14d)**: Unable to load.")

    try:
        top = get_top_products(db, user_id, 5)
        if top:
            lines = [f"  - {p['product']}: ${p['revenue']:,.0f} revenue, {p['quantity']} units" for p in top]
            parts.append("**Top 5 products by revenue**\n" + "\n".join(lines))
        else:
            parts.append("**Top products**: None yet.")
    except Exception:
        parts.append("**Top products**: Unable to load.")

    try:
        segments = compute_segments(db, user_id)
        if segments:
            lines = [f"  - {s['name']}: {s['customer_count']} customers" for s in segments]
            parts.append("**Customer segments (RFM)**\n" + "\n".join(lines))
        else:
            parts.append("**Segments**: Not enough data.")
    except Exception:
        parts.append("**Segments**: Unable to load.")

    try:
        at_risk = get_at_risk_customers(db, user_id, 60)
        if at_risk:
            names = [c["name"] for c in at_risk[:5]]
            parts.append(f"""**At-risk customers** (inactive >60 days)
- Count: {len(at_risk)}
- Top at risk: {', '.join(names[:5])}{'...' if len(at_risk) > 5 else ''}""")
        else:
            parts.append("**At-risk customers**: None.")
    except Exception:
        parts.append("**At-risk customers**: Unable to load.")

    try:
        alerts_list = get_alerts(db, user_id)
        if alerts_list:
            lines = [f"  - [{a['severity']}] {a['message']}" for a in alerts_list]
            parts.append("**Active alerts**\n" + "\n".join(lines))
        else:
            parts.append("**Alerts**: None (all clear).")
    except Exception:
        parts.append("**Alerts**: Unable to load.")

    return "\n\n".join(parts)


def ask_ai_expert(db: Session, user_id: UUID, issue: str) -> dict:
    """
    RAG: retrieve relevant business doc chunks + real business data, then generate expert recommendations.
    Returns { answer, sources }.
    """
    client = get_client()
    if not client:
        return {
            "answer": "AI Expert is not configured. Set OPENAI_API_KEY or GROQ_API_KEY in your .env to enable recommendations.",
            "sources": [],
        }

    retrieved = _retrieve(issue, top_k=_TOP_K)
    context_parts = []
    seen = set()
    for chunk, source in retrieved:
        key = (chunk[:50], source)
        if key in seen:
            continue
        seen.add(key)
        context_parts.append(f"[{source}]\n{chunk}")

    doc_context = "\n\n---\n\n".join(context_parts) if context_parts else "Use general business best practices."
    sources = list(dict.fromkeys(s for _, s in retrieved))

    business_data = _gather_business_data(db, user_id)

    settings = get_settings()
    prompt = f"""You are a seasoned business expert and advisor. You know how to build businesses, spot failing scenarios, and apply tactics that improve sales and operations. A founder is sharing an issue with their business.

You have access to:
1) Their REAL business data (metrics, products, segments, at-risk customers, alerts)
2) Reference material from business best-practice documents

Use BOTH the real data and the reference material to give tailored, actionable recommendations. Reference specific numbers from their data when relevant. Identify failing scenarios they may be in (revenue decline, churn, cash flow, scaling) and what to do next.

---
REAL BUSINESS DATA (from their dashboard):
{business_data}

---
REFERENCE MATERIAL (business best practices):
{doc_context}

---
FOUNDER'S ISSUE:
{issue}

---
Give 4-6 concrete recommendations. Be specific to their situation. Include:
- What failing scenario(s) you see (e.g., revenue decline, churn risk, cash flow, product-market fit)
- Tactics to improve sales and operations
- Prioritized next steps (most critical first)
- Reference the docs when applicable (e.g., "As noted in Customer Retention, ...")

Format clearly with bullet points or short paragraphs. Be direct and actionable."""

    try:
        response = client.chat.completions.create(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.6,
        )
        answer = (response.choices[0].message.content or "").strip()
    except Exception as e:
        answer = f"Failed to generate recommendations: {str(e)}"

    return {"answer": answer, "sources": sources}
