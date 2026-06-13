"""
BTCFi API Explorer — Hugging Face Spaces Demo
Bitcoin Intelligence API at btcfi.aiindigo.com
Built by AI Indigo: https://aiindigo.com
"""

import json
import gradio as gr
import requests

BASE = "https://btcfi.aiindigo.com/api/v1"

# ── Endpoint catalogue ────────────────────────────────────────────────
# Only free-tier GET endpoints (no x402 auth required) are included
# so anyone can try the demo without a key.
ENDPOINTS = {
    # ── Core Bitcoin (free) ──
    "Fees": {"path": "/fees", "params": [], "desc": "Fee estimates (fastest, 30min, 1hr, economy) with USD values"},
    "Mempool": {"path": "/mempool", "params": [], "desc": "Mempool summary, tx count, size, fee histogram"},
    "Address Info": {"path": "/address/{addr}", "params": ["addr"], "desc": "Address balance, tx count, funded/spent stats"},
    "Address UTXOs": {"path": "/address/{addr}/utxos", "params": ["addr"], "desc": "Unspent transaction outputs"},
    "Address Tx History": {"path": "/address/{addr}/txs", "params": ["addr"], "desc": "Transaction history for address"},
    "Transaction": {"path": "/tx/{txid}", "params": ["txid"], "desc": "Full transaction details by txid"},
    "Tx Status": {"path": "/tx/{txid}/status", "params": ["txid"], "desc": "Confirmation status for a transaction"},
    "Latest Blocks": {"path": "/block/latest", "params": [], "desc": "Latest blocks with details"},
    "Block by ID": {"path": "/block/{id}", "params": ["id"], "desc": "Block by height or hash"},

    # ── Intelligence (free tier, some may need x402) ──
    "AI Fee Prediction": {"path": "/intelligence/fees", "params": [], "desc": "AI fee prediction (1h, 6h, 24h)"},
    "Whale Detection": {"path": "/intelligence/whales", "params": [], "desc": "Large transaction detection"},
    "Risk Score": {"path": "/intelligence/risk/{addr}", "params": ["addr"], "desc": "Address risk scoring"},
    "Network Health": {"path": "/intelligence/network", "params": [], "desc": "Hashrate, difficulty, congestion"},
    "Consolidation Advice": {"path": "/intelligence/consolidate/{addr}", "params": ["addr"], "desc": "UTXO consolidation advice"},
    "MVRV Ratio": {"path": "/intelligence/mvrv", "params": [], "desc": "Market Value to Realized Value"},
    "SOPR": {"path": "/intelligence/sopr", "params": [], "desc": "Spent Output Profit Ratio"},
    "NUPL": {"path": "/intelligence/nupl", "params": [], "desc": "Net Unrealized Profit/Loss"},
    "HODL Waves": {"path": "/intelligence/hodl-waves", "params": [], "desc": "HODL wave distribution"},

    # ── Security ──
    "Threat Analysis": {"path": "/security/threat/{addr}", "params": ["addr"], "desc": "YARA-pattern threat analysis (8 patterns)"},

    # ── Ethereum ──
    "ETH Gas": {"path": "/eth/gas", "params": [], "desc": "ETH gas prices"},
    "ETH Address": {"path": "/eth/address/{addr}", "params": ["addr"], "desc": "ETH address balance"},
    "ETH Transaction": {"path": "/eth/tx/{hash}", "params": ["hash"], "desc": "ETH transaction details"},

    # ── Solana ──
    "SOL Fees": {"path": "/sol/fees", "params": [], "desc": "SOL priority fees"},
    "SOL Address": {"path": "/sol/address/{addr}", "params": ["addr"], "desc": "SOL address balance"},
}


def build_url(name: str, params_text: str) -> str:
    """Build the full URL, substituting path params from the input."""
    ep = ENDPOINTS[name]
    path = ep["path"]
    # Split comma-separated params and strip whitespace
    values = [v.strip() for v in params_text.split(",")] if params_text else []
    for i, pname in enumerate(ep["params"]):
        if i < len(values) and values[i]:
            path = path.replace("{" + pname + "}", values[i])
        else:
            path = path.replace("{" + pname + "}", "MISSING")
    return BASE + path


def query_api(name: str, params_text: str) -> str:
    """Call the BTCFi API and return formatted JSON or error."""
    url = build_url(name, params_text)

    if "MISSING" in url:
        return json.dumps(
            {"error": "Missing required parameter(s)", "required": ENDPOINTS[name]["params"]},
            indent=2,
        )

    try:
        resp = requests.get(url, timeout=15)
        data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text
        return json.dumps(data, indent=2, default=str)
    except requests.exceptions.Timeout:
        return json.dumps({"error": "Request timed out (15 s). The API may be busy."}, indent=2)
    except requests.exceptions.ConnectionError:
        return json.dumps({"error": "Could not connect to btcfi.aiindigo.com. Check your network."}, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)}, indent=2)


def on_select_endpoint(name: str):
    """Update placeholder / help text when user picks an endpoint."""
    ep = ENDPOINTS[name]
    if ep["params"]:
        placeholder = ", ".join(ep["params"])
        help_text = f"Required params ({ep['desc']}): {placeholder}"
    else:
        placeholder = ""
        help_text = f"No parameters needed — {ep['desc']}"
    return gr.update(placeholder=placeholder), help_text


# ── Build Gradio UI ───────────────────────────────────────────────────
with gr.Blocks(
    title="BTCFi API Explorer",
    theme=gr.themes.Soft(),
    css="""
    footer { display: none !important; }
    .api-url { font-family: monospace; font-size: 0.85em; color: #666; margin: 4px 0; }
    """,
) as demo:
    gr.Markdown(
        """
        # ₿ BTCFi API Explorer
        **Bitcoin Intelligence API** — 33 endpoints across Bitcoin, Ethereum & Solana.

        *Free tier: 100 calls/day per IP — no signup, no API keys.*

        [Docs](https://btcfi.aiindigo.com) · [GitHub](https://github.com/aiindigo925/btcfi-api) · [OpenAPI Spec](https://btcfi.aiindigo.com/openapi.json) · [MCP Server](https://btcfi.aiindigo.com/mcp)
        """
    )

    with gr.Row():
        with gr.Column(scale=2):
            endpoint = gr.Dropdown(
                choices=list(ENDPOINTS.keys()),
                value="Fees",
                label="Endpoint",
                info="Select an API endpoint to query",
            )
            params_input = gr.Textbox(
                label="Parameters",
                placeholder="",
                info="Comma-separated params (leave blank for no-param endpoints)",
            )
            run_btn = gr.Button("🚀 Query API", variant="primary")

        with gr.Column(scale=3):
            param_help = gr.Markdown(
                "No parameters needed — Fee estimates (fastest, 30min, 1hr, economy) with USD values"
            )

    # Hidden HTML for full URL display
    url_display = gr.HTML(value="")

    output = gr.Code(label="API Response", language="json", lines=20)

    # ── Wire events ──
    endpoint.change(fn=on_select_endpoint, inputs=endpoint, outputs=[params_input, param_help])

    def do_query(name, params_text):
        url = build_url(name, params_text)
        result = query_api(name, params_text)
        url_html = f'<div class="api-url"><b>Request:</b> <code>{url}</code></div>'
        return url_html, result

    run_btn.click(
        fn=do_query,
        inputs=[endpoint, params_input],
        outputs=[url_display, output],
    )

    params_input.submit(
        fn=do_query,
        inputs=[endpoint, params_input],
        outputs=[url_display, output],
    )

    gr.Markdown(
        """
        ---
        ### How it works
        1. **Pick an endpoint** from the dropdown
        2. **Enter parameters** if required (e.g. a Bitcoin address)
        3. **Hit Query** — the response appears in formatted JSON below

        **Powered by** [BTCFi API](https://btcfi.aiindigo.com) · Built by [AI Indigo](https://aiindigo.com)
        """
    )


if __name__ == "__main__":
    demo.launch()
