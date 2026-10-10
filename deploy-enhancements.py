from pathlib import Path

page = Path("index.html")
html = page.read_text(encoding="utf-8")
css_link = '<link rel="stylesheet" href="./game-enhancements.css">'
if css_link not in html:
    if html.count("</head>") != 1:
        raise SystemExit("No se encontró un cierre único de head")
    html = html.replace("</head>", css_link + "</head>", 1)

js_path = Path("game-enhancements.js")
enhancements = js_path.read_text(encoding="utf-8").strip()
marker = "ENTREDOS_ENHANCEMENTS_V1"
if marker not in html:
    end_marker = "\ninit();\n})();"
    if html.count(end_marker) != 1:
        raise SystemExit("No se encontró de forma única el punto de inicialización de EntreDos")
    html = html.replace(end_marker, "\n" + enhancements + "\ninit();\n})();", 1)

page.write_text(html, encoding="utf-8")
print("Mejoras de juego integradas para publicar.")
