import json
from collections import Counter

# load json
with open("locations.json", "r", encoding="utf-8") as f:
    data = json.load(f)

locations = data["locations"]

lines = []

# title
lines.append("# Locations Table\n")

# --------- main table ----------
lines.append("| location | theme | roles |")
lines.append("|----------|-------|-------|")

for loc in locations:
    location_name = f'{loc["name_en"]} {loc["name_ch"]}'
    theme = loc["theme"]
    roles = "，".join(loc["roles"])

    lines.append(f"| {location_name} | {theme} | {roles} |")

# --------- summary ----------
theme_counts = Counter(l["theme"] for l in locations)

lines.append("\n## Theme Summary\n")
lines.append("| theme | count |")
lines.append("|-------|-------|")

for theme, count in sorted(theme_counts.items()):
    lines.append(f"| {theme} | {count} |")

# --------- total ----------
lines.append(f"\n**Total number of locations:** {len(locations)}")

# --------- write file ----------
with open("locations.md", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Markdown file written to locations.md")