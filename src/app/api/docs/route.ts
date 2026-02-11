/**
 * OpenAPI Interactive Docs — Task 16
 * Serves Swagger UI with BTCFi OpenAPI 3.1 spec
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>BTCFi API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; background: #0a0a0a; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui { background: #0a0a0a; color: #e0e0e0; }
    .swagger-ui .info .title { color: #f7931a; }
    .swagger-ui .scheme-container { background: #111; }
    .swagger-ui .opblock .opblock-summary-method { font-weight: 700; }
    .swagger-ui .btn.execute { background: #f7931a; border-color: #f7931a; color: #000; }
    .swagger-ui .btn.execute:hover { background: #e8851a; }
    .swagger-ui input[type=text] { background: #111; color: #fff; border-color: #333; }
    .swagger-ui textarea { background: #111; color: #fff; }
    .swagger-ui .opblock.opblock-get { border-color: #4ade80; background: rgba(74,222,128,0.05); }
    .swagger-ui .opblock.opblock-post { border-color: #60a5fa; background: rgba(96,165,250,0.05); }
    .swagger-ui .response-col_status { color: #4ade80; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      defaultModelsExpandDepth: -1,
      docExpansion: 'list',
      tryItOutEnabled: true,
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
