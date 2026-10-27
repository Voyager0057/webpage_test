"""Render the two Chinese responsibility tables from Markdown using Pillow."""
from pathlib import Path
import re
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/TEAM_RESPONSIBILITIES_ZH.md'
OUT = ROOT / 'docs/assets'
FONT = '/System/Library/Fonts/Hiragino Sans GB.ttc'
BODY = ImageFont.truetype(FONT, 30, index=0)
BOLD = ImageFont.truetype(FONT, 30, index=1)
TITLE = ImageFont.truetype(FONT, 54, index=1)
SMALL = ImageFont.truetype(FONT, 26, index=0)
MEASURE = ImageDraw.Draw(Image.new('RGB', (1, 1)))
LINE = 47
PAD = 24


def layout(value, width):
    """Keep source content, explicit breaks and bold spans; wrap by measured width."""
    result = []
    paragraphs = value.split('<br>')
    for pi, para in enumerate(paragraphs):
        runs = re.split(r'(\*\*.*?\*\*)', para)
        current, used = [], 0
        for run in runs:
            bold = run.startswith('**') and run.endswith('**')
            raw = run[2:-2] if bold else run
            font = BOLD if bold else BODY
            tokens = []
            for token in re.findall(r'[A-Za-z0-9]+(?:[._/-][A-Za-z0-9]+)*|.', raw):
                if tokens and token in '，。；：、！？）》”’':
                    tokens[-1] += token
                else:
                    tokens.append(token)
            for token in tokens:
                w = MEASURE.textlength(token, font=font)
                if current and used + w > width:
                    result.append((current, LINE))
                    current, used = [], 0
                if not current and token == ' ':
                    continue
                current.append((token, font, w))
                used += w
        if current:
            result.append((current, LINE + (12 if pi < len(paragraphs)-1 else 0)))
    return result


def render(block, widths, title, subtitle, filename):
    rows = [[s.strip() for s in row.strip().strip('|').split('|')]
            for row in block.strip().splitlines()]
    header, data = rows[0], rows[2:]
    assert len(data) == 6
    assert all(len(row) == len(widths) for row in rows)
    layouts = [[layout(cell, w-2*PAD) for cell, w in zip(row, widths)] for row in data]
    heights = [max(sum(advance for _, advance in cell) for cell in row)+2*PAD for row in layouts]
    margin, top, head_h = 60, 204, 92
    width = sum(widths)+2*margin
    height = top+head_h+sum(heights)+90
    im = Image.new('RGB', (width, height), '#ffffff')
    d = ImageDraw.Draw(im)
    d.text((margin, 43), title, font=TITLE, fill='#162b45', anchor='lt')
    d.text((margin, 126), subtitle, font=SMALL, fill='#5a6878', anchor='lt')
    x = margin
    for label, w in zip(header, widths):
        d.rectangle((x, top, x+w, top+head_h), fill='#173655')
        d.text((x+PAD, top+27), label, font=BOLD, fill='white', anchor='lt')
        x += w
    y = top+head_h
    for i, (cells, h) in enumerate(zip(layouts, heights)):
        d.rectangle((margin, y, width-margin, y+h), fill='#f4f7fb' if i % 2 == 0 else 'white')
        x = margin
        for col, (lines, w) in enumerate(zip(cells, widths)):
            yy = y+PAD
            for runs, advance in lines:
                xx = x+PAD
                for token, font, ww in runs:
                    d.text((xx, yy+34), token, font=font,
                           fill='#173655' if col == 0 else '#243344', anchor='ls')
                    xx += ww
                assert xx <= x+w-PAD+1, 'Cell content overflow'
                yy += advance
            assert yy <= y+h-PAD+1, 'Row content overflow'
            d.line((x, y, x, y+h), fill='#cbd5df', width=2)
            x += w
        d.line((margin, y+h, width-margin, y+h), fill='#cbd5df', width=2)
        y += h
    d.rectangle((margin, top, width-margin, y), outline='#cbd5df', width=2)
    d.text((margin, y+28), 'GRP P01 · 按最新任务分工导出', font=SMALL, fill='#6a7684', anchor='lt')
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / filename
    im.save(path, dpi=(200, 200))
    print(f'{path}: {width} × {height}')


if __name__ == '__main__':
    blocks = re.findall(r'(?:^\|.*\n)+', SOURCE.read_text(), re.M)
    assert len(blocks) == 2, 'Expected exactly two tables'
    render(blocks[0], [120, 390, 410, 1560],
           '表一：成员角色与具体职责',
           '六名成员的角色、负责页面、具体任务与示例',
           'team_responsibilities_zh.png')
    render(blocks[1], [270, 450, 290, 250, 1220],
           '表二：功能页面与人员分配',
           '六个功能页面的前后端负责人、功能说明与验收示例',
           'page_assignments_zh.png')
