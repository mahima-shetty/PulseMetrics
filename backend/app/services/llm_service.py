import json
import asyncio

from app.core.config import get_settings

_cached_client = None


def get_client():
    """Lazy import OpenAI to avoid slow startup and hot-reload issues."""
    global _cached_client
    if _cached_client is not None:
        return _cached_client
    settings = get_settings()
    api_key = settings.llm_api_key
    if not api_key:
        return None
    import httpx
    from openai import OpenAI
    # Pass explicit httpx client to bypass openai's SyncHttpxClientWrapper (proxies compatibility issue)
    http_client = httpx.Client()
    _cached_client = OpenAI(
        api_key=api_key,
        base_url=settings.llm_base_url,
        http_client=http_client,
    )
    return _cached_client


async def generate_insights(metrics: dict) -> str:
    """Generate business insights from metrics using LLM."""
    client = get_client()
    if not client:
        return (
            "AI insights are not configured. Set OPENAI_API_KEY or GROQ_API_KEY "
            "in your .env to enable AI-generated insights."
        )

    settings = get_settings()
    prompt = f"""You are a business analyst. Given these metrics:
{json.dumps(metrics, indent=2, default=str)}

Generate a 2-3 paragraph natural language summary covering:
- Sales trends
- Revenue growth
- Customer purchasing behavior
- Product performance summary

Be concise and actionable. Use specific numbers from the data."""

    try:
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model=settings.llm_model,
                messages=[{"role": "user", "content": prompt}],
            ),
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        return f"Error generating insights: {str(e)}"


async def generate_weekly_report(report_data: dict) -> str:
    """Generate weekly business report in Markdown."""
    client = get_client()
    if not client:
        return (
            "# Weekly Report\n\n"
            "AI report generation is not configured. "
            "Set OPENAI_API_KEY or GROQ_API_KEY to enable automated reports.\n\n"
            f"## Raw Data\n\n```json\n{json.dumps(report_data, indent=2)}\n```"
        )

    settings = get_settings()
    prompt = f"""Generate a weekly business report in Markdown format.

Include these sections:
1. Executive Summary
2. Revenue Summary
3. Customer Activity
4. Product Trends
5. Forecast / Outlook

Data:
{json.dumps(report_data, indent=2, default=str)}

Write in a professional, actionable tone. Use specific numbers."""

    try:
        response = client.chat.completions.create(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.choices[0].message.content or ""
    except Exception as e:
        return f"# Error\n\nFailed to generate report: {str(e)}"
