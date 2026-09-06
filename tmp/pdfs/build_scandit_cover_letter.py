from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import Paragraph
from reportlab.pdfgen import canvas


OUTPUT = "/Users/francescobassignana/sviluppo/portfolio/portfolio_v22/output/pdf/francesco-bassignana-scandit-cover-letter.pdf"

PAGE_W, PAGE_H = A4
NAVY = HexColor("#17212B")
RED = HexColor("#EC4B4B")
MUTED = HexColor("#65717D")
PALE = HexColor("#E8EBEE")
WHITE = HexColor("#FFFFFF")

LEFT = 24 * mm
RIGHT = 24 * mm
CONTENT_W = PAGE_W - LEFT - RIGHT


def draw_paragraph(pdf, text, style, x, y_top, width):
    paragraph = Paragraph(text, style)
    _, height = paragraph.wrap(width, PAGE_H)
    paragraph.drawOn(pdf, x, y_top - height)
    return y_top - height


pdf = canvas.Canvas(OUTPUT, pagesize=A4)
pdf.setTitle("Cover Letter - Francesco Bassignana - Scandit")
pdf.setAuthor("Francesco Bassignana")
pdf.setSubject("Application for Senior Computer Vision Engineer")

# Header block
pdf.setFillColor(NAVY)
pdf.rect(0, PAGE_H - 48 * mm, PAGE_W, 48 * mm, stroke=0, fill=1)
pdf.setFillColor(RED)
pdf.rect(0, PAGE_H - 48 * mm, 5 * mm, 48 * mm, stroke=0, fill=1)

pdf.setFillColor(WHITE)
pdf.setFont("Helvetica-Bold", 22)
pdf.drawString(LEFT, PAGE_H - 21 * mm, "Francesco Bassignana")
pdf.setFont("Helvetica", 9.4)
pdf.setFillColor(HexColor("#D8DEE4"))
pdf.drawString(LEFT, PAGE_H - 28 * mm, "AI SYSTEMS  /  COMPUTER VISION  /  SOFTWARE ENGINEERING")

header_right = PAGE_W - RIGHT
pdf.setFont("Helvetica", 8.4)
pdf.setFillColor(WHITE)
for i, value in enumerate([
    "quicksolver02@gmail.com",
    "linkedin.com/in/francesco-bassignana",
    "github.com/bacobax",
]):
    pdf.drawRightString(header_right, PAGE_H - (19 + i * 5.2) * mm, value)

# Role and date
pdf.setFillColor(RED)
pdf.setFont("Helvetica-Bold", 9)
pdf.drawString(LEFT, PAGE_H - 61 * mm, "APPLICATION")
pdf.setFillColor(NAVY)
pdf.setFont("Helvetica-Bold", 15)
pdf.drawString(LEFT, PAGE_H - 68.5 * mm, "Senior Computer Vision Engineer")
pdf.setFillColor(MUTED)
pdf.setFont("Helvetica", 9)
date_text = "6 September 2026"
pdf.drawRightString(PAGE_W - RIGHT, PAGE_H - 68.5 * mm, date_text)

pdf.setStrokeColor(PALE)
pdf.setLineWidth(0.8)
pdf.line(LEFT, PAGE_H - 74 * mm, PAGE_W - RIGHT, PAGE_H - 74 * mm)

body = ParagraphStyle(
    "Body",
    fontName="Helvetica",
    fontSize=9.35,
    leading=13.2,
    textColor=NAVY,
    alignment=TA_LEFT,
    spaceAfter=0,
)
salutation = ParagraphStyle(
    "Salutation",
    parent=body,
    fontName="Helvetica-Bold",
    fontSize=9.6,
)
closing = ParagraphStyle(
    "Closing",
    parent=body,
    leading=13.8,
)

y = PAGE_H - 84 * mm
y = draw_paragraph(pdf, "Dear Scandit Hiring Team,", salutation, LEFT, y, CONTENT_W)
y -= 4.2 * mm

paragraphs = [
    "I am excited to apply for the Senior Computer Vision Engineer position in Zurich. Scandits goal of turning world visual data into reliable useful retail products strongly matches my interests at the intersection of computer vision applied research and end-to-end engineering.",
    "I am completing an M.Sc. In Artificial Intelligence Systems at the University of Trento. Currently conducting research at Ecole de technologie superieure in Montreal. My work focuses on diffusion and flow-matching models for generating infrared imagery expanding scarce datasets used to train and evaluate object detectors. This has given me hands-on experience with PyTorch, data pipelines, model training, experimental design and evaluation under challenging data constraints.",
    "My broader computer vision work includes adapting CLIP for few-shot classification and developing a framework for image-forgery localization using vulnerability and explainability maps. Across these projects I have learned to turn ended questions into measurable experiments compare alternative approaches and reason carefully about dataset quality and model behavior.",
    "Alongside my research I have worked as a technology consultant delivering IoT, firmware, backend and web systems from initial requirements through deployment. This experience has made me comfortable operating in environments working across technical domains and balancing experimentation with the practical needs of a production system.",
    "I am also highly proficient in using AI coding agents and assistants to accelerate research and engineering work. I use them deliberately for exploration, implementation, debugging and review while retaining ownership of architectural decisions and final results. Generated work is treated like any contribution: it must be understood, tested, reviewed and validated against clearly defined requirements. This allows me to move quickly without compromising rigor, maintainability or accountability.",
    "Although my recent vision work has focused primarily on images than action recognition the central challenges described in this role. Building high-quality datasets, measuring precision, recall and latency adapting modern architectures and developing robust capabilities, from noisy real-world data. Closely match how I approach applied ML problems. I would be particularly motivated by the opportunity to help establish Scandits video experimentation and annotation workflows and develop them into a privacy-production-grade system.",
    "I would welcome the opportunity to discuss how my computer vision research, engineering background and disciplined use of modern AI development tools could contribute to Scandits next generation of retail technology.",
]

for paragraph in paragraphs:
    y = draw_paragraph(pdf, paragraph, body, LEFT, y, CONTENT_W)
    y -= 3.05 * mm

y -= 0.5 * mm
y = draw_paragraph(pdf, "Kind regards,<br/><b>Francesco Bassignana</b>", closing, LEFT, y, CONTENT_W)

# Footer
footer_y = 14 * mm
pdf.setStrokeColor(PALE)
pdf.line(LEFT, footer_y + 5 * mm, PAGE_W - RIGHT, footer_y + 5 * mm)
pdf.setFillColor(MUTED)
pdf.setFont("Helvetica", 7.4)
pdf.drawString(LEFT, footer_y, "APPLICATION - SCANDIT - SENIOR COMPUTER VISION ENGINEER")
pdf.drawRightString(PAGE_W - RIGHT, footer_y, "FRANCESCO BASSIGNANA")

pdf.save()
print(OUTPUT)
