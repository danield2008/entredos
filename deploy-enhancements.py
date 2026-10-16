from pathlib import Path

page = Path("index.html")
html = page.read_text(encoding="utf-8")
css_link = '<link rel="stylesheet" href="./game-enhancements.css">'
if css_link not in html:
    if html.count("</head>") != 1:
        raise SystemExit("No se encontró un cierre único de head")
    html = html.replace("</head>", css_link + "</head>", 1)

js_path = Path("game-enhancements.js")
import subprocess
subprocess.run(["node", "--check", str(js_path)], check=True)
enhancements = js_path.read_text(encoding="utf-8").strip()
marker = "ENTREDOS_ENHANCEMENTS_V1"
if marker not in html:
    end_marker = "\ninit();\n})();"
    if html.count(end_marker) != 1:
        raise SystemExit("No se encontró de forma única el punto de inicialización de Cercora")
    html = html.replace(end_marker, "\n" + enhancements + "\ninit();\n})();", 1)

# Comprobar el JavaScript final ya integrado, no solo cada archivo por separado.
# Así se detectan errores que bloquearían init() y todos los modos de juego.
import re
inline_scripts = re.findall(r"<script\b([^>]*)>([\s\S]*?)</script>", html, flags=re.IGNORECASE)
built_script = next(
    (body for attrs, body in inline_scripts if "ENTREDOS_ENHANCEMENTS_V1" in body and not re.search(r"\bsrc\s*=", attrs, flags=re.IGNORECASE)),
    None,
)
if not built_script:
    raise SystemExit("No se encontró el JavaScript integrado de Cercora")
check_path = Path(".entredos-build-check.js")
try:
    check_path.write_text(built_script, encoding="utf-8")
    subprocess.run(["node", "--check", str(check_path)], check=True)
finally:
    check_path.unlink(missing_ok=True)

page.write_text(html, encoding="utf-8")
print("Mejoras de Cercora integradas y JavaScript completo validado.")
