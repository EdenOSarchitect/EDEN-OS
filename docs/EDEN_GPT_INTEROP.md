# EDEN GPT Interop

The sovereign interop route is now:

`GROK -> EDEN -> GPT -> CLAUDE`

The default command performs **packet construction only** and makes no external model call:

```bash
python3 interop/grok_eden_gpt_claude_line.py
```

To build from a JSON payload:

```bash
python3 interop/grok_eden_gpt_claude_line.py --input grok_payload.json
```

To explicitly invoke OpenAI, set `OPENAI_API_KEY`, install the official `openai` package, and use:

```bash
python3 interop/grok_eden_gpt_claude_line.py --input grok_payload.json --call-gpt
```

The live GPT path uses the OpenAI Responses API and `store=False`. Claude remains a downstream packet only in this module; no Anthropic call is performed.

## Truth boundaries

The GPT packet carries explicit policy that synthetic evidence cannot be promoted to live evidence, local evidence cannot be promoted to independent evidence, and provider execution cannot be claimed without a provider receipt.

Each stage is content-addressed with SHA-256 and the complete line receives a final line hash. These hashes establish local packet integrity; they are not provider attestations or independent validation.
