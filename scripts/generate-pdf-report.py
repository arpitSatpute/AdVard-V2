import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#6B7280"))
        
        # Header
        self.drawString(54, 11 * 72 - 36, "AdVard — Android USB Controller | Technical Report")
        self.setStrokeColor(colors.HexColor("#374151"))
        self.setLineWidth(0.5)
        self.line(54, 11 * 72 - 42, 8.5 * 72 - 54, 11 * 72 - 42)
        
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * 72 - 54, 36, footer_text)
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY — ADVARD DOCUMENTATION")
        self.line(54, 48, 8.5 * 72 - 54, 48)
        
        self.restoreState()

def generate_pdf(filename="AdVard_Functionality_Report.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom Color Palette
    PRIMARY = colors.HexColor("#4F46E5")      # Indigo Accent
    DARK_BG = colors.HexColor("#0D0E14")      # Dark Surface
    CARD_BG = colors.HexColor("#1A1B25")      # Card Surface
    TEXT_MAIN = colors.HexColor("#111827")    # Main Text
    TEXT_MUTED = colors.HexColor("#4B5563")   # Muted Text
    ACCENT_BG = colors.HexColor("#EEF2FF")    # Light Indigo tint

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=14,
        textColor=TEXT_MUTED,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=TEXT_MAIN,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_MAIN,
        spaceAfter=6
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#C084FC"),
        backColor=colors.HexColor("#1F2028"),
        borderColor=colors.HexColor("#374151"),
        borderWidth=0.5,
        borderPadding=5,
        spaceAfter=6
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )

    table_body_style = ParagraphStyle(
        'TableBody',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_MAIN
    )

    elements = []

    # Title Banner
    elements.append(Paragraph("AdVard — Comprehensive Technical Functionality Report", title_style))
    elements.append(Paragraph("Detailed Architecture, Mechanism of Action, and ADB Implementation Specs for all Desktop Android Controller Capabilities", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=15))

    # Executive Overview
    elements.append(Paragraph("1. Executive Overview & System Architecture", h1_style))
    elements.append(Paragraph(
        "<b>AdVard</b> is a cross-platform desktop control suite designed for seamless remote administration of Android smartphones over a physical USB connection. "
        "Built on a high-security architecture, AdVard avoids third-party agent installations on the smartphone by leveraging Android's native <b>Android Debug Bridge (ADB)</b> protocol via binary subprocess execution.",
        body_style
    ))

    arch_data = [
        [Paragraph("Layer", table_header_style), Paragraph("Technology Stack", table_header_style), Paragraph("Responsibility & Functionality", table_header_style)],
        [Paragraph("Frontend UI", table_body_style), Paragraph("React 19, TypeScript, Tailwind CSS, Lucide React", table_body_style), Paragraph("Renders dark-mode UI, manages real-time component state, captures user interactions (mouse clicks/drags, dialpad input, terminal commands).", table_body_style)],
        [Paragraph("IPC Layer", table_body_style), Paragraph("Electron ContextBridge, IPC Main / Renderer", table_body_style), Paragraph("Securely exposes typed asynchronous methods to the frontend without exposing Node process or shell access.", table_body_style)],
        [Paragraph("Backend ADB Layer", table_body_style), Paragraph("Node.js (child_process.spawn)", table_body_style), Paragraph("Resolves ADB binary paths across macOS/Win/Linux, formats non-injected arguments, pipes binary streams (screencap).", table_body_style)],
        [Paragraph("Target Device", table_body_style), Paragraph("Android OS (adbd daemon)", table_body_style), Paragraph("Receives adb commands over USB and executes kernel/framework calls (input keyevents, settings, package manager).", table_body_style)],
    ]

    t_arch = Table(arch_data, colWidths=[100, 150, 254])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#D1D5DB")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, ACCENT_BG])
    ]))
    elements.append(t_arch)
    elements.append(Spacer(1, 12))

    # Detailed Functionality Section
    elements.append(Paragraph("2. Detailed Functionality & Working Mechanism", h1_style))

    features = [
        ("2.1 Automated USB Device Detection",
         "Continuously polls `adb devices` every 2 seconds via a non-blocking background loop. Parses serial numbers and device states (`device`, `unauthorized`, `offline`). Automatically updates the sidebar list and selects active devices.",
         "adb devices"),

        ("2.2 Comprehensive Device Specifications",
         "Queries system properties in parallel using `getprop` and system dump services to extract detailed device information without UI lag.",
         "adb -s SERIAL shell getprop ro.product.model\nadb -s SERIAL shell getprop ro.build.version.release\nadb -s SERIAL shell dumpsys battery\nadb -s SERIAL shell wm size\nadb -s SERIAL shell wm density"),

        ("2.3 Hardware Navigation & Power Control",
         "Executes hardware Android keyevents directly into the Linux input subsystem via `input keyevent`.",
         "adb -s SERIAL shell input keyevent 3     # Home Button\nadb -s SERIAL shell input keyevent 4     # Back Button\nadb -s SERIAL shell input keyevent 187   # Recent Apps Button\nadb -s SERIAL shell input keyevent 26    # Power Toggle\nadb -s SERIAL reboot                     # Soft Reboot"),

        ("2.4 Remote Device Unlock",
         "Sends a sequence of wake-up events, automated swipe gestures, and optional security PIN inputs followed by an ENTER keyevent.",
         "adb -s SERIAL shell input keyevent 224              # Wake Screen\nadb -s SERIAL shell input swipe 500 1500 500 500 300 # Swipe Up\nadb -s SERIAL shell input text <SECURITY_PIN>       # Input PIN\nadb -s SERIAL shell input keyevent 66               # Press Enter"),

        ("2.5 Interactive Live Screen Mirroring & Laptop Remote Control",
         "Establishes a high-frequency frame capture stream (`screencap -p`). Calculates click/drag coordinates on the scaled HTML image canvas and maps them to actual Android screen resolutions for instant tap and swipe execution.",
         "adb -s SERIAL exec-out screencap -p                 # Binary PNG Stream\nadb -s SERIAL shell input tap <X> <Y>                # Laptop Mouse Click -> Tap\nadb -s SERIAL shell input swipe <X1> <Y1> <X2> <Y2>  # Laptop Mouse Drag -> Swipe"),

        ("2.6 Phone Call Management",
         "Allows starting, answering, and ending voice calls directly from the desktop application using Android Intent actions and Call keyevents.",
         "adb -s SERIAL shell am start -a android.intent.action.CALL -d tel:<NUMBER> # Make Call\nadb -s SERIAL shell input keyevent 5  # Answer Call (KEYCODE_CALL)\nadb -s SERIAL shell input keyevent 6  # End Call (KEYCODE_ENDCALL)"),

        ("2.7 Volume, Media Playback & Brightness Control",
         "Controls device audio streams, media player state, and system display brightness settings.",
         "adb -s SERIAL shell input keyevent 24  # Volume Up\nadb -s SERIAL shell input keyevent 25  # Volume Down\nadb -s SERIAL shell input keyevent 164 # Mute/Unmute\nadb -s SERIAL shell input keyevent 85  # Media Play/Pause\nadb -s SERIAL shell settings put system screen_brightness <0-255>"),

        ("2.8 Application Listing & Remote Launcher",
         "Features tabbed filtering between Third-Party Apps (`-3`), System Apps (`-s`), or All Apps. Supports 1-click launch, force stopping running processes, clearing app cache/data, installing desktop `.apk` files, and uninstalling packages.",
         "adb -s SERIAL shell pm list packages -3             # List User Apps\nadb -s SERIAL shell monkey -p <PACKAGE> -c ... 1     # Launch App\nadb -s SERIAL shell am force-stop <PACKAGE>          # Force Stop App\nadb -s SERIAL shell pm clear <PACKAGE>               # Clear App Data\nadb -s SERIAL install -r <PATH_TO_LOCAL_APK>        # Install APK"),

        ("2.9 Embedded Interactive ADB Shell Terminal",
         "Provides a desktop developer terminal to run direct ADB shell commands. Maintains command history (navigable via ↑/↓ keys), separates stdout and stderr streams, displays exit code badges, and allows copying command output.",
         "adb -s SERIAL shell <CUSTOM_SHELL_COMMAND>"),

        ("2.10 Screenshot Capture & Export",
         "Pipes raw binary PNG screenshot data from the device directly into Electron memory using `exec-out screencap -p` and provides a zoomable preview with desktop save dialog export.",
         "adb -s SERIAL exec-out screencap -p")
    ]

    for title, desc, code in features:
        feature_box = []
        feature_box.append(Paragraph(title, h2_style))
        feature_box.append(Paragraph(f"<b>Working Mechanism:</b> {desc}", body_style))
        feature_box.append(Paragraph(code.replace('\n', '<br/>'), code_style))
        elements.append(KeepTogether(feature_box))

    elements.append(Spacer(1, 10))

    # Security & Error Handling Summary
    elements.append(Paragraph("3. Security Architecture & Error Resiliency", h1_style))
    
    sec_text = (
        "<b>1. Process Isolation:</b> The renderer process runs with <code>contextIsolation: true</code> and <code>nodeIntegration: false</code>. "
        "No direct access to <code>child_process</code>, <code>fs</code>, or <code>exec</code> is permitted from React.<br/>"
        "<b>2. Command Injection Prevention:</b> All ADB calls are executed using Node's <code>child_process.spawn</code> with explicit string array arguments rather than shell string interpolation.<br/>"
        "<b>3. Fault Tolerant Diagnostics:</b> The app detects ADB installation paths automatically, provides 1-click ADB server restarts (`adb kill-server && adb start-server`), and handles `unauthorized` and `offline` state transitions gracefully."
    )
    elements.append(Paragraph(sec_text, body_style))

    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF report: {filename}")

if __name__ == '__main__':
    generate_pdf("/Users/arpitrameshsatpute/Code/AdVard/frontend/AdVard_Functionality_Report.pdf")
