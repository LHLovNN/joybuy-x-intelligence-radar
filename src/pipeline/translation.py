from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any


CHINESE_RE = re.compile(r"[\u3400-\u9fff]")
ZH_LANGUAGES = {"zh", "zh-cn", "zh-hans", "zh-tw", "zh-hant", "cn"}


class TranslationNotConfigured(RuntimeError):
    pass


class TranslationService:
    provider_name = "none"
    configured = False

    def translate_batch(self, items: list[dict[str, str]]) -> dict[str, str]:
        return {}


class NoopTranslationService(TranslationService):
    provider_name = "none"


class SampleDictionaryTranslationService(TranslationService):
    provider_name = "sample_dictionary"
    configured = True

    def translate_batch(self, items: list[dict[str, str]]) -> dict[str, str]:
        translated: dict[str, str] = {}
        for item in items:
            text = item["text"]
            match = sample_translation(text)
            if match:
                translated[item["id"]] = match
        return translated


class JoyBuilderTranslationService(TranslationService):
    provider_name = "joybuilder"
    configured = True

    def __init__(
        self,
        api_key: str,
        model: str | None = None,
        endpoint: str | None = None,
        timeout_seconds: int = 45,
        batch_size: int = 20,
    ) -> None:
        self.api_key = api_key
        self.model = model or os.getenv("JDBUILDER_TRANSLATION_MODEL") or "GPT-5.5"
        self.endpoint = endpoint or os.getenv("JDBUILDER_RESPONSES_URL") or "http://ai-api.jdcloud.com/v1/responses"
        self.timeout_seconds = timeout_seconds
        self.batch_size = batch_size

    def translate_batch(self, items: list[dict[str, str]]) -> dict[str, str]:
        result: dict[str, str] = {}
        for start in range(0, len(items), self.batch_size):
            chunk = items[start : start + self.batch_size]
            result.update(self._translate_chunk(chunk))
        return result

    def _build_request_body(self, items: list[dict[str, str]]) -> dict[str, Any]:
        system_prompt = (
            "你是专业的多语言社交媒体译员。请把输入的公开社媒帖子忠实翻译成自然、准确的简体中文。"
            "不要总结，不要省略事实，不要添加分析。保留品牌名、@账号、话题标签、URL、数字、emoji 和专有名词。"
            "只返回 JSON 数组，每一项必须是 {\"id\":\"...\",\"translation_zh\":\"...\"}。"
        )
        input_payload = json.dumps(
            [
                {
                    "id": item["id"],
                    "language": item.get("language", "und"),
                    "text": item["text"],
                }
                for item in items
            ],
            ensure_ascii=False,
        )
        return {
            "model": self.model,
            "stream": False,
            "input": f"{system_prompt}\n\n待翻译帖子 JSON 数组：\n{input_payload}",
        }

    def _translate_chunk(self, items: list[dict[str, str]]) -> dict[str, str]:
        request_body = self._build_request_body(items)
        request = urllib.request.Request(
            self.endpoint,
            data=json.dumps(request_body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"JoyBuilder translation request failed with HTTP {error.code}: {body[:300]}") from error
        except urllib.error.URLError as error:
            raise RuntimeError(f"JoyBuilder translation request failed: {error}") from error

        text = response_output_text(payload)
        try:
            records = json.loads(extract_json_array(text))
        except json.JSONDecodeError as error:
            raise RuntimeError(f"JoyBuilder translation returned non-JSON output: {text[:300]}") from error
        translations: dict[str, str] = {}
        for record in records:
            item_id = str(record.get("id", ""))
            translation = str(record.get("translation_zh", "")).strip()
            if item_id and translation:
                translations[item_id] = translation
        return translations


def build_translation_service(source_provider: str) -> TranslationService:
    selected = (os.getenv("TRANSLATION_PROVIDER") or "").strip().lower()
    if not selected:
        selected = "sample_dictionary" if source_provider == "sample" else "joybuilder"
    if selected in {"none", "off", "disabled"}:
        return NoopTranslationService()
    if selected in {"sample", "sample_dictionary"}:
        return SampleDictionaryTranslationService()
    if selected in {"joybuilder", "jdcloud", "company", "company_gpt"}:
        api_key = os.getenv("JDCLOUD_GPT_API_KEY")
        if not api_key:
            return NoopTranslationService()
        return JoyBuilderTranslationService(api_key=api_key)
    raise TranslationNotConfigured(f"Unknown TRANSLATION_PROVIDER: {selected}")


def apply_translations(posts: list[dict[str, Any]], service: TranslationService) -> dict[str, Any]:
    pending: list[dict[str, str]] = []
    for index, post in enumerate(posts):
        text = post.get("clean_text") or post.get("text") or ""
        post["translation_provider"] = service.provider_name
        if not needs_translation(post):
            post["translation_zh"] = text
            post["translation_status"] = "source_chinese"
            continue
        supplied = str(post.get("translation_zh") or "").strip()
        if supplied and CHINESE_RE.search(supplied):
            post["translation_status"] = "provider_supplied"
            continue
        post["translation_zh"] = ""
        post["translation_status"] = "pending"
        pending.append(
            {
                "id": str(index),
                "language": str(post.get("language") or "und"),
                "text": text,
            }
        )

    translations: dict[str, str] = {}
    error_message = ""
    if pending and service.configured:
        try:
            translations = service.translate_batch(pending)
        except RuntimeError as error:
            error_message = str(error)

    for item in pending:
        post = posts[int(item["id"])]
        translated = translations.get(item["id"], "").strip()
        if translated:
            post["translation_zh"] = translated
            post["translation_status"] = "sample_dictionary" if service.provider_name == "sample_dictionary" else "translated"
        else:
            post["translation_zh"] = item["text"]
            post["translation_status"] = "error" if error_message else "missing"
            if error_message:
                post["translation_error"] = error_message[:300]

    return translation_report(posts, service.provider_name, error_message)


def needs_translation(post: dict[str, Any]) -> bool:
    language = str(post.get("language") or "").strip().lower()
    text = post.get("clean_text") or post.get("text") or ""
    if language in ZH_LANGUAGES:
        return False
    return not bool(CHINESE_RE.search(text))


def translation_report(posts: list[dict[str, Any]], provider: str, error_message: str = "") -> dict[str, Any]:
    counts: dict[str, int] = {}
    missing_examples = []
    for post in posts:
        status = str(post.get("translation_status") or "unknown")
        counts[status] = counts.get(status, 0) + 1
        if status in {"missing", "error"} and len(missing_examples) < 3:
            missing_examples.append(
                {
                    "post_id": post.get("post_id"),
                    "language": post.get("language", "und"),
                    "author_handle": post.get("author", {}).get("handle") or post.get("author_handle"),
                }
            )
    return {
        "provider": provider,
        "configured": provider != "none",
        "counts": counts,
        "missing_count": counts.get("missing", 0) + counts.get("error", 0),
        "fallback_original_count": counts.get("missing", 0) + counts.get("error", 0),
        "missing_examples": missing_examples,
        "error": error_message,
    }


def sample_translation(text: str) -> str:
    if CHINESE_RE.search(text):
        return text
    lower = text.lower()
    translations = [
        (
            ["still waiting", "joybuy refund", "12 days"],
            "我还在等 Joybuy 退款，已经 12 天了。客服一直说这个 case 还在审核中。",
        ),
        (
            ["same refund issue", "joybuy uk", "payment is still pending"],
            "我也遇到了 Joybuy UK 的退款问题。订单已经取消，但付款状态仍然挂起。",
        ),
        (
            ["joybuy germany delivered", "two days earlier"],
            "JD.com / Joybuy Germany 比预计时间提前两天把手机送到了，价格也不错。",
        ),
        (
            ["joybuy netherlands legit", "never got the parcel"],
            "Joybuy Netherlands 靠谱吗？物流显示已送达，但我从来没有收到包裹。",
        ),
        (
            ["joybuy france promo code", "returns are easy"],
            "Joybuy France 的优惠码可以用，预计送达时间看起来也合理。我好奇退货是否方便。",
        ),
        (
            ["joybuy belgium", "slow customer service"],
            "有个关于 Joybuy Belgium 的讨论串：价格低，但有人反馈退货时客服响应较慢。",
        ),
        (
            ["joybuy luxembourg", "damaged packaging"],
            "Joybuy Luxembourg 的订单到了，但包装破损。商品看起来没问题，不过客服应该回应。",
        ),
        (
            ["jd overseas shopping", "same checkout flow"],
            "JD 海外购物流程有点让人困惑。Joybuy 对欧盟客户是不是同一个结账流程？",
        ),
        (
            ["switch from temu to joybuy", "germany shipping"],
            "如果 Joybuy Germany 的配送能一直这么快，我可能会从 Temu 转到 Joybuy。",
        ),
        (
            ["joybuy return page", "timing out"],
            "Joybuy 的退货页面一直超时，还有其他人遇到这个问题吗？",
        ),
        (
            ["joybuy refund screenshot", "not sure if it is real"],
            "这张 Joybuy 退款截图正在我的群聊里传播。我不确定它是不是真的。",
        ),
        (
            ["temu refund", "support chat finally solved"],
            "Temu 的退款比预期更久，但在线客服最后解决了问题。",
        ),
        (
            ["temu delivery", "joybuy germany"],
            "Temu 配送变慢后，有人开始拿 Joybuy Germany 做对比。",
        ),
        (
            ["temu delivery", "germany", "slower"],
            "Temu 在德国本周配送变慢了。还有其他人在等包裹吗？",
        ),
        (
            ["temu fake discount", "same price"],
            "又一个关于 Temu 虚假折扣的讨论串。同样的价格每周都会出现。",
        ),
        (
            ["joybuy logistics", "temu"],
            "如果 Joybuy 的物流保持稳定，可能会吸走一部分 Temu 用户。",
        ),
        (
            ["temu package", "damaged", "refund request"],
            "Temu 包裹送达时已经损坏，用户已经发起退款申请。",
        ),
        (
            ["temu customer service", "surprisingly quick"],
            "Temu 今天的客服响应出乎意料地快。",
        ),
    ]
    for needles, translation in translations:
        if all(needle in lower for needle in needles):
            return translation
    return ""


def response_output_text(payload: dict[str, Any]) -> str:
    if isinstance(payload.get("output_text"), str):
        return payload["output_text"]
    if isinstance(payload.get("text"), str):
        return payload["text"]
    chunks: list[str] = []
    for output in payload.get("output", []) or []:
        for content in output.get("content", []) or []:
            text = content.get("text")
            if isinstance(text, str):
                chunks.append(text)
    for candidate in payload.get("candidates", []) or []:
        content = candidate.get("content", {})
        for part in content.get("parts", []) or []:
            text = part.get("text")
            if isinstance(text, str):
                chunks.append(text)
    for choice in payload.get("choices", []) or []:
        message = choice.get("message", {})
        content = message.get("content")
        if isinstance(content, str):
            chunks.append(content)
    return "\n".join(chunks)


def extract_json_array(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("["):
        return stripped
    start = stripped.find("[")
    end = stripped.rfind("]")
    if start >= 0 and end >= start:
        return stripped[start : end + 1]
    return stripped
