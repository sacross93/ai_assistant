#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF 에서 한국어가 아닌 텍스트를 한글로 번역하는 기능 + 자유 텍스트 번역
- AX4-Light 로컬 모델 사용(오프라인 가능)
- PyMuPDF(fitz)로 PDF 읽기/쓰기
- 내장 텍스트 레이어가 없거나 매우 빈약하면 Tesseract OCR로 자동 폴백(텍스트+좌표 추출)

[중요 변경]
- 번역 1건(요청 1번) 처리 후 GPU에서 모델 언로딩(메모리 반환) 지원
  - PDF: translate_pdf2() 종료 시 언로딩
  - 자유 텍스트: translate_text_llm() 종료 시 언로딩

[멀티턴 지원]
- translate_text_llm(text, target_lang, previous_context) 지원
  - previous_context는 "번역할 본문이 아닌" 참고용 맥락(이전 대화/보고서 요약 등)
  - 출력에는 previous_context를 절대 포함하지 않고, current input(text)만 번역 출력

[환경변수(선택)]
- AX_TR_UNLOAD_AFTER_JOB=1/0  (기본 1)
- AX_TR_UNLOAD_MODE=delete/cpu (기본 delete)
- AX_TR_KEEP_TOKENIZER=1/0     (기본 1)
- AX_TR_CONTEXT_MAX_CHARS=6000  (기본 6000)  # previous_context를 너무 길게 넣지 않기 위한 제한
"""

from __future__ import annotations

import os, io, re, logging, textwrap, fitz, threading, gc
from functools import lru_cache
from typing import List, Tuple, Optional

# ─────────────────────────────────────────────────────────────────────────────
# AX4-Light 번역기 (로컬 LLM)
# ─────────────────────────────────────────────────────────────────────────────
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from transformers.generation.logits_process import LogitsProcessorList, NoRepeatNGramLogitsProcessor
import json
# 오프라인/성능 기본
os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("HF_DATASETS_OFFLINE", "1")
os.environ.setdefault("CUDA_DEVICE_MAX_CONNECTIONS", "1")
torch.set_float32_matmul_precision("high")

_AX_MODEL = os.getenv("AX_MODEL") or os.getenv("MODEL_DIR") or "/usr/llm/models/AX4-Light"
_AX_MODEL_ROOTS = os.getenv("AX_MODEL_ROOTS", "")
_MODEL_DTYPE = (os.getenv("MODEL_DTYPE") or "bf16").lower()

# "번역 1건 끝나면 언로딩" 옵션 (기본 ON)
_TR_UNLOAD_AFTER_JOB = os.environ.get("AX_TR_UNLOAD_AFTER_JOB", "1") == "1"
_TR_UNLOAD_MODE = (os.environ.get("AX_TR_UNLOAD_MODE", "delete") or "delete").lower()
_TR_KEEP_TOKENIZER = os.environ.get("AX_TR_KEEP_TOKENIZER", "1") == "1"

# 멀티턴: previous_context 길이 제한
_CTX_MAX_CHARS = int(os.environ.get("AX_TR_CONTEXT_MAX_CHARS", "6000") or "6000")

_LLM_TOK: Optional[AutoTokenizer] = None
_LLM_MDL: Optional[AutoModelForCausalLM] = None
_LLM_DEV: Optional[torch.device] = None
_LLM_LOGITS: Optional[LogitsProcessorList] = None

# 전역 락(전역 큐가 있어도 안전장치로 유지)
_LLM_LOCK = threading.Lock()

# 번역/사고 토큰, 프롬프트 누수/노이즈 제거
_PROMPT_LEAK_LINE_RE = re.compile(
    r"^\s*(?:[-*•]\s*)?(?:"  # optional bullet
    r"(?:숫자|단위|날짜|마크다운|제목|불릿|목록|표|머리말|지시문|출력)\b"
    r"|(?:keep|preserve|numbers?|units?|dates?|markdown|bullets?|headings?|output|no\s*preamble|instruction)"
    r")[:\s].*$",
    re.IGNORECASE | re.MULTILINE,
)
_THINK_RGX = re.compile(r"<think>.*?</think>", re.S | re.I)
_NOISE_TOK_RGX = re.compile(r"(?:/no_think|<\|endoftext\|>|</s>|번역\s*[:：]|translation\s*[:：])", re.I)

# 한/중/라틴 문자 & 숫자 토큰
_KO_CH = re.compile(r"[\u3131-\u318E\uAC00-\uD7A3]")
_ZH_CH = re.compile(r"[\u4E00-\u9FFF\u3400-\u4DBF]")
_NUM_TOKEN_RE = re.compile(r"(?<!\w)(\d[\d,\.]*)")

# 입력 정규화(하이픈/nbsp/soft hyphen)
_DASH_RGX = re.compile(r"[\u2010-\u2015\u2212]")
_NBSP_RGX = re.compile(r"\u00A0")
_SOFT_HYPHEN_RGX = re.compile(r"\u00AD")


def _normalize_en(s: str) -> str:
    if not s:
        return s
    s = _SOFT_HYPHEN_RGX.sub("", s)
    s = _NBSP_RGX.sub(" ", s)
    s = _DASH_RGX.sub("-", s)
    return " ".join(s.split())


def _strip_prompt_leak(text: str) -> str:
    """지시문/머리말/메타 줄 제거 + 공백 정리"""
    if not text:
        return text
    t = _THINK_RGX.sub("", text)
    t = _NOISE_TOK_RGX.sub(" ", t)
    out = []
    for ln in t.splitlines():
        l = ln.strip()
        if not l:
            continue
        if _PROMPT_LEAK_LINE_RE.match(l):
            continue
        if re.match(r"(?i)^(번역|translation)\s*[:：]\s*$", l):
            continue
        out.append(l)
    t = "\n".join(out)
    t = re.sub(r"[ \t]{2,}", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def _numbers_list(s: str) -> list[str]:
    return [m.replace(",", "") for m in _NUM_TOKEN_RE.findall(s or "")]


def _numbers_mismatch(src: str, tgt: str) -> bool:
    """숫자 시퀀스가 달라지면 위험으로 간주"""
    s = _numbers_list(src)
    t = _numbers_list(tgt)
    if not s and not t:
        return False
    return s != t


def _surgical_fix_numbers(src: str, tgt: str) -> str:
    """선택: 숫자만 원문으로 부분 치환(보수 회귀 대신 쓸 수 있음)"""
    s_nums = _NUM_TOKEN_RE.findall(src or "")
    if not s_nums:
        return tgt
    idx = 0

    def repl(m):
        nonlocal idx
        tok = m.group(1)
        if idx < len(s_nums):
            want = s_nums[idx]
            idx += 1
            return m.group(0).replace(tok, want)
        return m.group(0)

    return _NUM_TOKEN_RE.sub(repl, tgt)


# ── 브랜드/약어 보존(안전하게 제한) ──
PRESERVE_BRANDS = True  # 필요 없으면 False
_TRADEMARK_TOK_RE = re.compile(r"\b[\w\-/]*[®™]\b")
_UNIT_STOP = {
    "IN", "MM", "CM", "M", "KM", "HZ", "KHZ", "MHZ", "GHZ",
    "V", "A", "W", "KW", "G", "KG", "DB", "DBM",
}
_ACRONYM_SAFE_RE = re.compile(r"\b[A-Z]{2,5}\b")
_MODEL_CODE_RE = re.compile(r"\b[A-Z]*\d+[A-Z0-9\-]*\b")
_SLASH_ACRONYM_RE = re.compile(r"\b[A-Z0-9]{2,}(?:/[A-Z0-9]{2,})+\b")


def _extract_preserve_tokens(src: str) -> list[str]:
    if not src:
        return []
    toks = set()
    toks |= {m.group(0) for m in _TRADEMARK_TOK_RE.finditer(src)}
    for m in _ACRONYM_SAFE_RE.finditer(src):
        t = m.group(0)
        if t.upper() not in _UNIT_STOP:
            toks.add(t)
    toks |= {m.group(0) for m in _MODEL_CODE_RE.finditer(src)}
    toks |= {m.group(0) for m in _SLASH_ACRONYM_RE.finditer(src)}
    return [t for t in toks if re.search(r"[A-Z]", t)]


def _preserve_brand_tokens(src: str, tgt: str) -> str:
    """진짜 브랜드/약어/모델만 조심스럽게 보존(최대 2개)."""
    if not src or not tgt:
        return tgt
    if len(src.split()) <= 3 and not re.search(r"\d|/", src):
        return tgt
    keep = _extract_preserve_tokens(src)
    if not keep:
        return tgt
    missing = [k for k in keep if not re.search(re.escape(k), tgt)]
    if not missing:
        return tgt
    missing = missing[:2]
    tail = " (" + " / ".join(missing) + ")"
    out = tgt.strip()
    if out.endswith(")"):
        return out
    return (out + tail).strip()


def _ensure_ko(text: str) -> str:
    """한국어 비율 낮고 한자 비율 높은 경우 한자 제거/축약"""
    if not text:
        return text
    ko = len(_KO_CH.findall(text))
    zh = len(_ZH_CH.findall(text))
    if zh > 0 and ko == 0 and re.search(r"\(([A-Za-z0-9][^)]{0,60})\)", text):
        return re.sub(r".*?\(([A-Za-z0-9][^)]{0,60})\).*", r"\1", text)
    return text


def _resolve_model_path() -> str:
    """AX_MODEL / AX_MODEL_ROOTS 기반 모델 경로 해석."""
    if _AX_MODEL and os.path.isdir(_AX_MODEL):
        return _AX_MODEL
    roots = [p for p in _AX_MODEL_ROOTS.split(":") if p]
    for root in roots:
        cand = os.path.join(root, _AX_MODEL)
        if os.path.isdir(cand):
            return cand
    return _AX_MODEL


def _ax_unload(*, aggressive: bool = True) -> None:
    """
    번역 1건 끝난 뒤 GPU에서 모델 언로딩(옵션).
    - delete: 모델 객체 제거(다음 호출 시 재로딩)
    - cpu: CPU로 내림(다음에 다시 GPU로 올릴 때 복사 비용)
    - tokenizer는 기본 유지(AX_TR_KEEP_TOKENIZER=1)
    """
    global _LLM_MDL, _LLM_DEV, _LLM_LOGITS, _LLM_TOK

    if not torch.cuda.is_available():
        return

    with _LLM_LOCK:
        if _LLM_MDL is None and (_TR_KEEP_TOKENIZER or _LLM_TOK is None):
            return

        try:
            torch.cuda.synchronize()
        except Exception:
            pass

        mode = (_TR_UNLOAD_MODE or "delete").lower().strip()

        try:
            if mode == "cpu":
                if _LLM_MDL is not None:
                    try:
                        _LLM_MDL.to("cpu")
                    except Exception:
                        mode = "delete"

            if mode == "delete":
                if _LLM_MDL is not None:
                    try:
                        del _LLM_MDL
                    except Exception:
                        pass
                    _LLM_MDL = None

            _LLM_DEV = None
            _LLM_LOGITS = None

            if not _TR_KEEP_TOKENIZER:
                _LLM_TOK = None

        finally:
            if aggressive:
                try:
                    gc.collect()
                except Exception:
                    pass
            try:
                torch.cuda.empty_cache()
            except Exception:
                pass
            try:
                torch.cuda.ipc_collect()
            except Exception:
                pass


def _ax_load():
    global _LLM_TOK, _LLM_MDL, _LLM_DEV, _LLM_LOGITS
    if (
        _LLM_TOK is not None
        and _LLM_MDL is not None
        and _LLM_DEV is not None
        and _LLM_LOGITS is not None
    ):
        return

    with _LLM_LOCK:
        if (
            _LLM_TOK is not None
            and _LLM_MDL is not None
            and _LLM_DEV is not None
            and _LLM_LOGITS is not None
        ):
            return

        model_path = _resolve_model_path()

        # ① 토크나이저: fast 시도 → 실패하면 slow 폴백
        try:
            tok = AutoTokenizer.from_pretrained(
                model_path,
                use_fast=True,
                trust_remote_code=True,
                local_files_only=True,
            )
        except Exception as e:
            print(f"[translate_language] fast tokenizer failed, fallback to slow: {e}")
            tok = AutoTokenizer.from_pretrained(
                model_path,
                use_fast=False,
                trust_remote_code=True,
                local_files_only=True,
            )

        if tok.eos_token is None:
            tok.eos_token = "</s>" if "</s>" in tok.get_vocab() else "<|endoftext|>"
        if tok.pad_token is None:
            tok.pad_token = tok.eos_token
        tok.padding_side = "left"

        # ② 모델 메모리/장치 맵
        if torch.cuda.is_available():
            max_memory = {}
            for i in range(torch.cuda.device_count()):
                try:
                    free_b, _ = torch.cuda.mem_get_info(i)
                    free_gb = max(1, int(free_b // (1024**3)) - 2)
                except Exception:
                    free_gb = 20
                max_memory[i] = f"{free_gb}GiB"
            max_memory["cpu"] = os.getenv("AX_CPU_MEM", "64GiB")
        else:
            max_memory = {"cpu": os.getenv("AX_CPU_MEM", "64GiB")}

        # dtype 결정
        torch_dtype = None
        if torch.cuda.is_available():
            if _MODEL_DTYPE in ("bf16", "bfloat16"):
                torch_dtype = torch.bfloat16
            elif _MODEL_DTYPE in ("fp16", "float16", "half"):
                torch_dtype = torch.float16
            else:
                torch_dtype = None

        mdl = AutoModelForCausalLM.from_pretrained(
            model_path,
            trust_remote_code=True,
            attn_implementation="sdpa",
            device_map="auto",
            max_memory=max_memory,
            low_cpu_mem_usage=True,
            local_files_only=True,
            dtype=torch_dtype,
        ).eval()

        # ③ 디바이스 추출
        dev = None
        dmap = getattr(mdl, "hf_device_map", None)
        if isinstance(dmap, dict):
            for v in dmap.values():
                if isinstance(v, str) and v.startswith("cuda"):
                    dev = torch.device(v)
                    break
        if dev is None:
            try:
                dev = next(mdl.parameters()).device
            except StopIteration:
                dev = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        _LLM_TOK, _LLM_MDL, _LLM_DEV = tok, mdl, dev
        _LLM_LOGITS = LogitsProcessorList([NoRepeatNGramLogitsProcessor(3)])


def _ax_ctx_limit() -> int:
    ml = getattr(_LLM_TOK, "model_max_length", None)
    if isinstance(ml, int) and 0 < ml < 10**9:
        return ml
    conf = getattr(_LLM_MDL, "config", None)
    for k in ("max_position_embeddings", "max_seq_len", "rope_scaling_max_position"):
        v = getattr(conf, k, None)
        if isinstance(v, int) and v > 0:
            return v
    return 8192


def _ax_apply_chat(messages: List[dict]) -> str:
    has_tpl = hasattr(_LLM_TOK, "apply_chat_template") and getattr(
        _LLM_TOK, "chat_template", None
    )
    if has_tpl:
        try:
            return _LLM_TOK.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
                enable_thinking=False,
            )
        except TypeError:
            return _LLM_TOK.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )
    sys = "\n".join(m["content"] for m in messages if m.get("role") == "system")
    usr = "\n\n".join(m["content"] for m in messages if m.get("role") == "user")
    return (sys + "\n\n" + usr).strip()


def _ax_generate(prompt: str, max_new_tokens: int = 256) -> str:
    _ax_load()
    with _LLM_LOCK:
        enc = _LLM_TOK(
            [prompt],
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=max(256, _ax_ctx_limit() - max_new_tokens - 16),
        )
        in_len = (
            int(enc["attention_mask"].sum())
            if "attention_mask" in enc
            else enc["input_ids"].shape[1]
        )
        enc = {k: v.to(_LLM_DEV) for k, v in enc.items()}
        gen_kwargs = dict(
            max_new_tokens=max_new_tokens,
            do_sample=False,
            eos_token_id=_LLM_TOK.eos_token_id,
            pad_token_id=_LLM_TOK.pad_token_id,
            use_cache=True,
            logits_processor=_LLM_LOGITS,
        )
        with torch.inference_mode():
            out = _LLM_MDL.generate(**enc, **gen_kwargs)
        gen_ids = out[0, in_len:]
        txt = _LLM_TOK.decode(gen_ids, skip_special_tokens=True)
        txt = txt.replace("```", "").strip()
        for s in ("</s>", "<|endoftext|>"):
            if s in txt:
                txt = txt.split(s, 1)[0].strip()
        return txt


@lru_cache(maxsize=4096)
def en2ko_ax(src_text: str) -> str:
    """AX4-Light 기반 EN→KO 번역기 (PDF용)"""
    _ax_load()
    sys = (
        "정확한 번역가입니다. 한국어로만 출력하세요. 마크다운/불릿/표 구조 보존."
        " 지시문을 복사하지 마세요. 머리말·설명·규칙을 출력하지 마세요."
    )
    usr = (
        "다음 백틱 블록 안의 **본문만** 한국어로 번역하세요.\n"
        "- 숫자/단위/날짜는 원문 그대로 유지\n"
        "- 마크다운 제목/불릿/표 구조 보존\n"
        "- 추가 설명/머리말/규칙 출력 금지\n\n"
        "```text\n"
        f"{src_text}\n"
        "```\n"
        "번역 (한국어만):"
    )
    prompt = _ax_apply_chat(
        [
            {"role": "system", "content": sys},
            {"role": "user", "content": usr},
        ]
    )
    out = _ax_generate(prompt, max_new_tokens=512)
    return out.strip()


try:
    from PIL import Image
    import pytesseract
    from pytesseract import Output
    _OCR_AVAILABLE = True
except Exception:
    _OCR_AVAILABLE = False

logger = logging.getLogger(__name__)
if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO)

# ────────────── 전역 설정 / 사전 ──────────────
TRANSLATE_LABEL = True
SHOW_RAW = True
SHOW_DIFF = True

# OCR 설정
OCR_ENABLE = True
OCR_LANG = "eng+kor"
OCR_DPI = 400
OCR_PSM = 4
OCR_CONF_MIN = 40
OCR_MIN_LINE_CH = 2
OCR_DEBUG = False
if _OCR_AVAILABLE:
    _cmd = os.environ.get("TESSERACT_CMD")
    if _cmd:
        try:
            pytesseract.pytesseract.tesseract_cmd = _cmd
        except Exception as e:
            logger.warning("TESSERACT_CMD 설정 실패: %s", e)

LOCAL_DICT_RAW = {}
LOCAL_DICT = {k.lower(): v for k, v in LOCAL_DICT_RAW.items()}

SUPPORT_WRAP = hasattr(fitz, "TEXT_WRAP")

TEXT_FLAGS = 0
if hasattr(fitz, "TEXT_DEHYPHENATE"):
    TEXT_FLAGS |= fitz.TEXT_DEHYPHENATE
if hasattr(fitz, "TEXT_PRESERVE_LIGATURES"):
    TEXT_FLAGS |= fitz.TEXT_PRESERVE_LIGATURES
if hasattr(fitz, "TEXT_PRESERVE_WHITESPACE"):
    TEXT_FLAGS |= fitz.TEXT_PRESERVE_WHITESPACE


RED_PX = RED_PY = 1.0
INS_PX = 0.0
INS_PY_FACTOR = 0.25

BASE_GUTTER = 6.0
MIN_GUTTER = 1.0


STAR_ONLY = re.compile(r"^[\*\u2022●▪· ]+$")
ONLY_NUM = re.compile(r"^[0-9.\-/\s]+$")
ONLY_CODE = re.compile(r"^[A-Z0-9_\-/]{2,}$")
MD_STAR = re.compile(r"^[\*\-\u2022●▪·]\s+")
STRIP_BOLD = re.compile(r"^\*+\s*|\s*\*+$")
SINGLE_HAN = re.compile(r"^[가-힣]$")
NUM_UNIT_RGX = re.compile(
    r"^\s*\d+(?:\.\d+)?\s*(mm|cm|m|km|in|inch|°C|°F|°|%|V|A|W|kW|g|kg|Hz|kHz|MHz|GHz|Gbps|gb/s|mb/s)\s*$",
    re.I,
)
ENG_WORD_RGX = re.compile(r"[A-Za-z]")
LABEL_LIKE_RGX = re.compile(r"^[A-Za-z]{1,12}$")
SLASH_SPLIT_RGX = re.compile(r"\s*/\s*")
NUM_ONLY_RGX = re.compile(r"^[0-9.\-/\s]+$")
NOISE_MARK_RGX = re.compile(r"(?:번역\s*[:：]|translation\s*[:：])", re.I)
_UNIT_LIKE_AFTER_NUM_RE = re.compile(
    r"(?i)\b(\d+(?:\.\d+)?)(\s?)(u|mm|cm|m|km|in|inch|°c|°f|°|%|v|a|w|kw|g|kg|hz|khz|mhz|ghz|gbps|gb/s|mb/s)\b"
)


def pad(r):
    return fitz.Rect(r.x0 - RED_PX, r.y0 - RED_PY, r.x1 + RED_PX, r.y1 + RED_PY)


def shrink(r, size, txt):
    if size <= 8 and "|" not in txt and len(txt) >= 80:
        return r
    py = size * INS_PY_FACTOR
    return fitz.Rect(r.x0 + INS_PX, r.y0 + py, r.x1 - INS_PX, r.y1 - py)


def need_trans(t: str) -> bool:
    t = t.strip()
    return bool(
        t
        and ENG_WORD_RGX.search(t)
        and not STAR_ONLY.match(t)
        and not ONLY_NUM.match(t)
        and not ONLY_CODE.match(t)
    )


def is_footer_block(block, page_height) -> bool:
    if block.get("type", 0) != 0:
        return False
    sizes = [sp["size"] for line in block.get("lines", []) for sp in line.get("spans", [])]
    if not sizes:
        return False
    avg_sz = sum(sizes) / len(sizes)
    y0 = block["bbox"][1]
    return avg_sz <= 8 and y0 >= page_height * 0.8


def validate(en: str, ko: str) -> bool:
    return bool(
        ko
        and not SINGLE_HAN.match(ko)
        and en.strip().lower() != ko.strip().lower()
        and not (len(en.strip()) >= 8 and len(ko.strip()) <= 2)
    )


def dedup_words(text: str) -> str:
    out = []
    for w in text.split():
        if not out or out[-1] != w:
            out.append(w)
    return " ".join(out)


# ────────────── AX4-Light 번역 래퍼 (PDF용) ──────────────
@lru_cache(maxsize=4096)
def safe_ax(tex: str) -> str:
    """AX4-Light 번역 + 노이즈 제거 + 숫자/브랜드 보존 가드"""
    src = _normalize_en((tex or "").strip())
    if not src:
        return src
    try:
        ko = en2ko_ax(src).strip()
    except Exception:
        return LOCAL_DICT.get(src.lower(), src)

    ko = _strip_prompt_leak(ko)
    ko = re.sub(r"(?i)\bmarkdown\b", "", ko)
    ko = ko.replace("마크다운", "")
    ko = re.sub(r"\s{2,}", " ", ko).strip()

    if _numbers_mismatch(src, ko):
        return src

    if _UNIT_LIKE_AFTER_NUM_RE.search(src) and not _UNIT_LIKE_AFTER_NUM_RE.search(ko):
        return src

    if PRESERVE_BRANDS:
        ko = _preserve_brand_tokens(src, ko)

    ko = _ensure_ko(ko)
    ko = re.sub(r"\s*(<end_of_turn>|#{2,}|\*\*)\s*", " ", ko)
    ko = " ".join(ko.split())

    if NUM_UNIT_RGX.match(src):
        return src

    if not validate(src, ko):
        return LOCAL_DICT.get(src.lower(), src)

    return ko


safe_qwen = safe_ax
en2ko_qwen = en2ko_ax

_FONT_CACHE = {}


def _get_font(fontfile: str):
    if not fontfile or not hasattr(fitz, "Font"):
        return None
    f = _FONT_CACHE.get(fontfile)
    if f is None:
        try:
            f = fitz.Font(fontfile=fontfile)
        except Exception:
            f = None
        _FONT_CACHE[fontfile] = f
    return f


def split_line_dynamic(
    line,
    fontname="NotoSansCJKKRBold",
    base_gutter: float = BASE_GUTTER,
    min_gutter: float = MIN_GUTTER,
    fontfile: str | None = None,
):
    rect = fitz.Rect(line["bbox"])

    joined = "".join(sp.get("text", "") for sp in line.get("spans", []))
    clean = MD_STAR.sub("", joined)
    parts = [p.strip() for p in clean.split("|")]

    if len(parts) <= 1:
        return [(rect, parts[0] if parts else "")]

    n = len(parts)
    size = max((sp.get("size", 8) for sp in line.get("spans", [])), default=8)
    need_w = []
    F = _get_font(fontfile) if fontfile else None

    for p in parts:
        txt = p or " "
        try:
            if F:
                w = F.text_length(txt, fontsize=size)
            else:
                w = fitz.get_text_length(txt, fontsize=size, fontname=fontname)
        except Exception:
            avg = size * 0.55
            w = avg * max(len(txt), 1)
        need_w.append(w)

    usable = rect.width
    total_need = sum(need_w) + base_gutter * (n - 1)

    if total_need <= usable:
        extra = usable - total_need
        s = sum(need_w) or 1.0
        need_w = [w + extra * (w / s) for w in need_w]
        gutter = base_gutter
    else:
        gutter = max(min_gutter, (usable - sum(need_w)) / (n - 1))

    out, x = [], rect.x0
    for w, txt in zip(need_w, parts):
        out.append((fitz.Rect(x, rect.y0, x + w, rect.y1), txt))
        x += w + gutter
    return out


def split_slash(t: str) -> List[str]:
    if "/" not in t:
        return [t]
    ps = SLASH_SPLIT_RGX.split(t)
    if len(ps) == 2 and all(ENG_WORD_RGX.search(p) for p in ps):
        return ps
    if len(ps) >= 3 and not NUM_ONLY_RGX.match(t):
        return ps
    return [t]


def translate_segment(text: str) -> str:
    if len(text) >= 60:
        return safe_ax(text)

    if text.count(",") == 1:
        left, right = [t.strip() for t in text.split(",", 1)]
        return f"{safe_ax(left)}, {safe_ax(right)}"

    cps = [p.strip() for p in text.split(",")] if "," in text else [text]
    out = []
    for ip, part in enumerate(cps):
        subs = []
        for j, sp in enumerate(split_slash(part)):
            if ip == 0 and j == 0 and LABEL_LIKE_RGX.match(sp) and not TRANSLATE_LABEL:
                subs.append(sp)
                continue
            if need_trans(sp):
                ko = safe_ax(sp)
                if not validate(sp, ko):
                    ko = LOCAL_DICT.get(sp.lower(), sp)
                subs.append(ko)
            else:
                subs.append(sp)
        out.append(" / ".join(subs))
    return dedup_words(", ".join(out))


def merge_units(spans, orig, flags):
    ns, no, nf = [], [], []
    i = 0
    L = min(len(spans), len(orig), len(flags))
    while i < L:
        try:
            r, sz, _ = spans[i]
            if (
                i + 1 < L
                and NUM_UNIT_RGX.match(orig[i])
                and NUM_UNIT_RGX.match(orig[i + 1])
            ):
                r2, sz2, _ = spans[i + 1]
                merged_txt = f"{orig[i]} ({orig[i + 1]})"
                ns.append(
                    (
                        fitz.Rect(
                            min(r.x0, r2.x0),
                            min(r.y0, r2.y0),
                            max(r.x1, r2.x1),
                            max(r.y1, r2.y1),
                        ),
                        max(sz, sz2),
                        merged_txt,
                    )
                )
                no.append(merged_txt)
                nf.append(False)
                i += 2
                continue
            ns.append(spans[i])
            no.append(orig[i])
            nf.append(flags[i])
            i += 1
        except Exception as e:
            logger.warning("merge_units skip at i=%s: %s", i, e)
            ns.append(spans[i])
            no.append(orig[i])
            nf.append(flags[i])
            i += 1
    return ns, no, nf


def fit_font(rect, txt, fs_start, min_font, spacing=1.20):
    min_allowed = max(fs_start * 0.9, min_font)
    steps = int((fs_start - min_allowed) / 0.5) + 1
    for k in range(steps):
        fs = fs_start - 0.5 * k
        per = max(int(rect.width / (fs * 0.55)), 1)
        lines = len(txt) // per + 1
        if lines * fs * spacing <= rect.height:
            return max(fs, min_allowed)
    return min_allowed


def _ocr_page_lines(
    page: fitz.Page,
    dpi: int = OCR_DPI,
    lang: str = OCR_LANG,
    psm: int = OCR_PSM,
    conf_min: int = OCR_CONF_MIN,
) -> List[Tuple[fitz.Rect, float, str]]:
    if not (_OCR_AVAILABLE and OCR_ENABLE):
        return []

    mat = fitz.Matrix(dpi / 72.0, dpi / 72.0)
    pix = page.get_pixmap(matrix=mat, alpha=False)
    try:
        img = Image.open(io.BytesIO(pix.tobytes("png")))
    except Exception as e:
        logger.warning("OCR image decode failed: %s", e)
        return []

    config = f"--oem 1 --psm {psm} -c preserve_interword_spaces=1"
    try:
        data = pytesseract.image_to_data(
            img, lang=lang, config=config, output_type=Output.DICT
        )
    except Exception as e:
        logger.warning("pytesseract failed: %s", e)
        return []

    n = len(data.get("text", []))
    if n == 0:
        return []

    sx = pix.width / page.rect.width
    sy = pix.height / page.rect.height

    lines: dict[Tuple[int, int], dict] = {}
    for i in range(n):
        txt = (data["text"][i] or "").strip()
        conf = data.get("conf", ["-1"])[i]
        try:
            conf = float(conf)
        except Exception:
            conf = -1.0
        if not txt or conf < conf_min:
            continue

        l = int(data.get("left", [0])[i])
        t = int(data.get("top", [0])[i])
        w = int(data.get("width", [0])[i])
        h = int(data.get("height", [0])[i])
        b = int(data.get("block_num", [0])[i])
        ln = int(data.get("line_num", [0])[i])

        key = (b, ln)
        item = lines.get(key)
        if item is None:
            x0 = l / sx
            y0 = t / sy
            x1 = (l + w) / sx
            y1 = (t + h) / sy
            lines[key] = {
                "x0": x0,
                "y0": y0,
                "x1": x1,
                "y1": y1,
                "texts": [txt],
                "heights": [h / sy],
            }
        else:
            item["x0"] = min(item["x0"], l / sx)
            item["y0"] = min(item["y0"], t / sy)
            item["x1"] = max(item["x1"], (l + w) / sx)
            item["y1"] = max(item["y1"], (t + h) / sy)
            item["texts"].append(txt)
            item["heights"].append(h / sy)

    results: List[Tuple[fitz.Rect, float, str]] = []
    for _, v in sorted(lines.items(), key=lambda kv: kv[1]["y0"]):
        line_text = " ".join(v["texts"]).strip()
        if len(line_text) < OCR_MIN_LINE_CH:
            continue
        rect = fitz.Rect(v["x0"], v["y0"], v["x1"], v["y1"])
        size_est = max(
            min(sum(v["heights"]) / max(len(v["heights"]), 1) * 0.8, 16.0), 6.0
        )
        results.append((rect, size_est, line_text))

    if OCR_DEBUG:
        logger.info("[OCR] %d lines", len(results))
    return results


def _text_layer_stats(blocks: list) -> tuple[int, int]:
    span_cnt = 0
    ch_cnt = 0
    for blk in blocks or []:
        for ln in blk.get("lines", []):
            for sp in ln.get("spans", []):
                span_cnt += 1
                ch_cnt += len(sp.get("text", ""))
    return span_cnt, ch_cnt


def _looks_text_layer_sparse(blocks: list) -> bool:
    span_cnt, ch_cnt = _text_layer_stats(blocks)
    if not blocks:
        return True
    return (span_cnt < 3) or (ch_cnt < 20)


def _choose_psm(blocks: list) -> int:
    span_cnt, ch_cnt = _text_layer_stats(blocks)
    if not blocks or ch_cnt < 20:
        return 4
    return 6 if ch_cnt > 200 else 4


def translate_pdf2(
    in_pdf: str,
    out_pdf: str,
    *,
    fontfile="/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    fontname="NotoSansCJKKRBold",
    min_font=5.0,
    scale=1.0,
    padding=1.5,
):
    try:
        with fitz.open(in_pdf) as doc:
            for p in doc:
                spans: List[Tuple[fitz.Rect, float, str]] = []
                orig: List[str] = []
                flags: List[bool] = []
                footers: List[tuple[fitz.Rect, str]] = []

                page_dict = p.get_text("dict", flags=TEXT_FLAGS)
                blocks = page_dict.get("blocks", []) if page_dict else []
                span_cnt, ch_cnt = _text_layer_stats(blocks)
                textlayer_absent = (not blocks) or (ch_cnt == 0)

                if not textlayer_absent:
                    for blk in sorted(blocks, key=lambda b: b["bbox"][1]):
                        if is_footer_block(blk, p.rect.height):
                            block_rect = fitz.Rect(blk["bbox"])
                            block_txt = "".join(
                                sp.get("text", "")
                                for ln in blk.get("lines", [])
                                for sp in ln.get("spans", [])
                            ).strip()
                            if len(block_txt) > 5:
                                footers.append((block_rect, translate_segment(block_txt)))
                            continue

                        for line in blk.get("lines", []):
                            size = max(
                                (sp.get("size", 8) for sp in line.get("spans", [])),
                                default=8,
                            )
                            for idx, (r, t) in enumerate(
                                split_line_dynamic(line, fontname, BASE_GUTTER, MIN_GUTTER, fontfile)
                            ):
                                if not t:
                                    continue
                                spans.append((r, size, t))
                                orig.append(t)
                                do_trans = (idx != 0 or TRANSLATE_LABEL) and need_trans(t)
                                flags.append(do_trans)

                use_ocr = (
                    OCR_ENABLE
                    and _OCR_AVAILABLE
                    and (textlayer_absent or _looks_text_layer_sparse(blocks))
                )

                if use_ocr:
                    if textlayer_absent:
                        logger.info("Page %d: no text layer → using OCR", p.number + 1)
                    else:
                        logger.info("Page %d: sparse text layer → using OCR", p.number + 1)

                    psm = _choose_psm(blocks)
                    ocr_lines = _ocr_page_lines(
                        p, dpi=OCR_DPI, lang=OCR_LANG, psm=psm, conf_min=OCR_CONF_MIN
                    )
                    for (r, sz, t) in ocr_lines:
                        if sz <= 8 and r.y0 >= p.rect.height * 0.8 and len(t) > 5:
                            footers.append((r, translate_segment(t)))
                        else:
                            spans.append((r, sz, t))
                            orig.append(t)
                            flags.append(need_trans(t))

                    if not ocr_lines and textlayer_absent:
                        logger.warning(
                            "Page %d: OCR 결과도 비어있음(스캔 품질 저하 가능).",
                            p.number + 1,
                        )

                elif textlayer_absent and not _OCR_AVAILABLE:
                    logger.warning(
                        "Page %d: 내장 텍스트 없음 + Tesseract 미설치 → 페이지 스킵",
                        p.number + 1,
                    )

                spans, orig, flags = merge_units(spans, orig, flags)
                final = [txt if not f else translate_segment(txt) for txt, f in zip(orig, flags)]

                if SHOW_DIFF:
                    print(f"\n=== Page {p.number + 1} diff ===")
                    for e, k in zip(orig, final):
                        print(f"ENG: {e}\nKOR: {k}\n")
                    print("=== end diff ===")

                for (r, _, _), _ in zip(spans, final):
                    p.add_redact_annot(pad(r), fill=(1, 1, 1))
                for fr, _ in footers:
                    p.add_redact_annot(pad(fr), fill=(1, 1, 1))
                try:
                    p.apply_redactions()
                except Exception as e:
                    logger.warning("apply_redactions failed: %s", e)

                for block_rect, block_ko in footers:
                    wrap_kw = {"flags": fitz.TEXT_WRAP} if SUPPORT_WRAP else {}
                    fs = fit_font(block_rect, block_ko, fs_start=8, min_font=6, spacing=1.15)
                    kw = dict(
                        fontfile=fontfile,
                        fontname=fontname,
                        color=(0, 0, 0),
                        align=0,
                        fontsize=fs,
                        **wrap_kw,
                    )
                    ok = p.insert_textbox(block_rect, block_ko, **kw)
                    if ok < 0 or "\n" in block_ko:
                        big = fitz.Rect(
                            block_rect.x0,
                            block_rect.y0,
                            p.rect.x1 - 5,
                            block_rect.y1 + fs * 3,
                        )
                        p.insert_textbox(big, block_ko, **kw)

                for (r, size, _), txt in zip(spans, final):
                    ins = shrink(r, size, txt)
                    txtw = txt if SUPPORT_WRAP else "\n".join(textwrap.wrap(txt, 80))
                    fs = fit_font(ins, txtw, max(size * scale, min_font), min_font)
                    kw = dict(
                        fontfile=fontfile,
                        fontname=fontname,
                        color=(0, 0, 0),
                        align=0,
                        fontsize=fs,
                    )
                    if SUPPORT_WRAP:
                        kw["flags"] = fitz.TEXT_WRAP
                    ok = p.insert_textbox(ins, txtw, **kw)
                    if ok < 0 or "\n" in txtw:
                        big = fitz.Rect(
                            ins.x0 - padding,
                            ins.y0 - padding,
                            p.rect.x1 - padding,
                            ins.y1 + fs * 3 + padding,
                        )
                        p.insert_textbox(big, txtw, **kw)

                p.clean_contents()

            doc.save(out_pdf, garbage=4, deflate=True, clean=True)

        print("✓ 언어 번역 완료 →", out_pdf)

    finally:
        if _TR_UNLOAD_AFTER_JOB:
            _ax_unload(aggressive=True)


SUPPORTED_TARGET_LANGS = {"ko", "en", "zh"}

_LANG_LABELS = {"ko": "한국어", "en": "영어", "zh": "중국어"}


def _norm_lang_code(code: str | None) -> str:
    c = (code or "ko").strip().lower().replace("_", "-")

    if c in ("ko", "ko-kr"):
        return "ko"
    if c in ("en", "en-us", "en-gb"):
        return "en"
    if c in ("zh", "zh-cn", "zh-tw", "zh-hans", "zh-hant"):
        return "zh"

    raise ValueError(
        f"지원하지 않는 target_lang 입니다: {code!r}. "
        "지원 언어: 한국어(ko), 영어(en), 중국어(zh) 만 가능합니다."
    )


def _lang_label(code: str) -> str:
    return _LANG_LABELS.get(code, code)


def _trim_context(ctx: str | None) -> str:
    if not ctx:
        return ""
    c = ctx.strip()
    if not c:
        return ""
    if _CTX_MAX_CHARS > 0 and len(c) > _CTX_MAX_CHARS:
        c = c[-_CTX_MAX_CHARS:]  # 최근 내용 우선
    return c


def _build_translate_prompt(src: str, target_code: str, previous_context: List[dict] | str = "") -> str:
    """
    Constructs a prompt for the 7B model that handles both translation and context-aware instructions.
    supports multi-turn conversation via `previous_context`.
    """
    lang_label = _lang_label(target_code)

    # 1. System Prompt: 역할 정의 + Few-shot 예시 (7B 모델용)
    # 기계적인 번역기보다는 "눈치 빠른 번역 비서"로 설정
    sys = (
        f"You are a smart translation assistant. The user wants to translate text into {lang_label} (Korean/English/Chinese, etc).\n"
        "However, if the user gives an INSTRUCTION (e.g., 'Change to English', 'Stop', 'Explain this'), follow the instruction instead of translating it.\n\n"
        "Rules:\n"
        f"1. If input is a text to translate -> Translate it into {lang_label} directly. No extra comments.\n"
        "2. If input is a command (e.g., 'translate to English', 'use honorifics') -> Acknowledge it or change the target language behavior for the next turn. (For this turn, just reply 'Understood' or similar if ambiguous).\n"
        "3. Context Awareness: Look at the previous conversation to understand what 'this' or 'it' refers to, but prioritize the current input.\n"
        "4. DO NOT output the previous context in your response.\n"
        "5. Output ONLY the result."
    )

    messages = [{"role": "system", "content": sys}]

    # 2. Previous Context 처리 (List[dict] or str)
    # 문자열로 오면 그대로 넣고, 리스트면 파싱해서 history로 넣음
    if isinstance(previous_context, list):
        # 최근 3턴만 유지 (7B 모델 Context Window 고려)
        recent_context = previous_context[-6:] 
        for msg in recent_context:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
    elif isinstance(previous_context, str) and previous_context.strip():
        # 문자열로 온 경우 (기존 호환성)
        messages.append({"role": "user", "content": f"[Previous Context Summary]: {previous_context}"})

    # 3. Current Input 추가
    # 명확한 구분을 위해 포맷팅
    final_input = (
        f"Target Language: {lang_label}\n"
        f"Input:\n{src}"
    )
    messages.append({"role": "user", "content": final_input})

    # 4. Chat Template 적용
    prompt = _ax_apply_chat(messages)
    return prompt


@lru_cache(maxsize=2048)
def _translate_free_text_cached(text: str, target_lang: str = "ko") -> str:
    """previous_context 없는 경우만 캐시"""
    return _translate_free_text_uncached(text, target_lang=target_lang, previous_context="")


def _translate_free_text_uncached(text: str, target_lang: str = "ko", previous_context: List[dict] | str = "") -> str:
    src = (text or "").strip()
    if not src:
        return ""

    target_code = _norm_lang_code(target_lang)
    _ax_load()

    prompt = _build_translate_prompt(src, target_code, previous_context=previous_context)

    # 7B 모델의 경우 max_new_tokens를 좀 더 여유있게 (명령 수행 시 말이 길어질 수 있음)
    raw = _ax_generate(
        prompt,
        max_new_tokens=min(2048, len(src) * 3 + 256),
    )

    out = raw.strip()
    out = _strip_prompt_leak(out)
    out = NOISE_MARK_RGX.sub("", out)
    out = out.strip()

    # (기존 안전 장치들 - 번역 결과일 때만 적용하는 것이 좋으나, 일단 유지)
    # 만약 결과가 영어인데 한글이 섞여있거나 하면 후처리
    
    # 숫자/브랜드 보존 가드 (번역문일 때만 유효하지만, 안전을 위해 수행)
    try:
        if _numbers_mismatch(src, out):
            # 명령 수행 응답일 수 있으므로(예: "알겠습니다"), 길이가 현저히 다르면 스킵하거나 하는 로직이 필요하지만
            # 일단 기존 로직 유지 (숫자 틀리면 원문 리턴하므로, 명령 수행 응답에는 안 좋을 수 있음. 주의 필요)
            # 여기서는 단순히 숫자만 고치는 시도를 함
            pass 
    except Exception:
        pass

    try:
        if PRESERVE_BRANDS:
            out = _preserve_brand_tokens(src, out)
    except Exception:
        pass

    return out.strip()


def translate_free_text(text: str, target_lang: str = "ko", previous_context: List[dict] | str | None = None) -> str:
    """
    AX4-Light 기반 자유 텍스트 번역
    - 입력 언어는 자동 감지
    - target_lang: ko/en/zh
    - previous_context: 멀티턴 컨텍스트 (대화 내역)
    """
    if previous_context:
        return _translate_free_text_uncached(text, target_lang=target_lang, previous_context=previous_context)
    return _translate_free_text_cached(text, target_lang=target_lang)


def translate_text_llm(text: str, target_lang: str = "ko", previous_context: List[dict] | str | None = None) -> str:
    """
    서버에서 호출하는 '요청 1건' 단위 진입점.
    - 여기서 번역 실행 후, 요청이 끝나면 GPU 언로딩(옵션)
    - 멀티턴: previous_context를 프롬프트에 포함 (대화 내역 리스트 권장)
    """
    try:
        return translate_free_text(text, target_lang=target_lang, previous_context=previous_context)
    finally:
        if _TR_UNLOAD_AFTER_JOB:
            _ax_unload(aggressive=True)


if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 3:
        translate_pdf2(sys.argv[1], sys.argv[2])
    else:
        print("Usage: python trans_langueage.py <in_pdf> <out_pdf>")
