"""Create a landscape English team plan with named weekly tasks and a matching Gantt chart."""
from datetime import date, timedelta
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Flowable

from generate_team_timeline import working, dates, BREAK_START, BREAK_END
from team_weekly_plan import WEEKS, FIRST, validate

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf/GRP_Team_Responsibilities_and_Timeline_EN.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
for name, filename in [('Arial','Arial.ttf'),('Arial-Bold','Arial Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name,'/System/Library/Fonts/Supplemental/'+filename))
pdfmetrics.registerFontFamily('Arial',normal='Arial',bold='Arial-Bold',italic='Arial',boldItalic='Arial-Bold')

NAVY=colors.HexColor('#173655')
BLUE=colors.HexColor('#407ea8')
GREEN=colors.HexColor('#3b9482')
GREY=colors.HexColor('#a7b4c0')
LIGHT=colors.HexColor('#eef3f8')
TEXT=colors.HexColor('#243344')
W,H=landscape(A4)
M=30
CW=W-2*M

ST={
 'title':ParagraphStyle('title',fontName='Arial-Bold',fontSize=19,leading=22,textColor=NAVY,spaceAfter=5),
 'section':ParagraphStyle('section',fontName='Arial-Bold',fontSize=12,leading=15,textColor=NAVY,spaceBefore=7,spaceAfter=6),
 'body':ParagraphStyle('body',fontName='Arial',fontSize=10,leading=13,textColor=TEXT,spaceAfter=5),
 'small':ParagraphStyle('small',fontName='Arial',fontSize=8.8,leading=11,textColor=TEXT,spaceAfter=4),
 'cell':ParagraphStyle('cell',fontName='Arial',fontSize=9.5,leading=11.5,textColor=TEXT),
 'detail':ParagraphStyle('detail',fontName='Arial',fontSize=10,leading=12.6,textColor=TEXT),
 'head':ParagraphStyle('head',fontName='Arial-Bold',fontSize=9.7,leading=12,textColor=colors.white),
}


def p(s,style='cell'):
    return Paragraph(s,ST[style])


def table(headers, rows, widths, style='cell', pads=5):
    data=[[p(h,'head') for h in headers]]+[[p(v,style) for v in row] for row in rows]
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([
      ('BACKGROUND',(0,0),(-1,0),NAVY),
      ('ROWBACKGROUNDS',(0,1),(-1,-1),[LIGHT,colors.white]),
      ('VALIGN',(0,0),(-1,-1),'TOP'),
      ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
      ('TOPPADDING',(0,0),(-1,-1),pads),('BOTTOMPADDING',(0,0),(-1,-1),pads),
      ('LINEBELOW',(0,0),(-1,0),.5,NAVY),
      ('LINEBELOW',(0,1),(-1,-1),.35,colors.HexColor('#d6e0e9')),
    ]))
    return t


NAMES={1:'Xingjian XIE',2:'Xinyi DENG',3:'Haochen YIN',4:'Wan-Chia WEI',5:'Boqing HAN',6:'Zicheng LIU'}

MEMBERS=[
 ['1',NAMES[1],'Project Manager<br/>Business Analyst<br/>Supporting Backend','Policies &amp; Methodology<br/>Help &amp; Project Information','Review progress, requirements and reports; verify policies with Xinyi; build policy/example APIs and assist backend validation.'],
 ['2',NAMES[2],'Frontend Engineer<br/>UI Designer<br/>Business Analyst','Policies &amp; Methodology<br/>Help &amp; Project Information','Verify policies with Xingjian; build both content pages, bilingual guidance, examples and project information.'],
 ['3',NAMES[3],'Backend Engineer','Homepage / Joint Calculator<br/>Ledger &amp; Repayment Details','Build Java/BigDecimal tax, provident-fund, mortgage and cash-flow calculations, schedules, APIs and calculation tests.'],
 ['4',NAMES[4],'Frontend Engineer<br/>UI Designer','Homepage / Joint Calculator<br/>Ledger &amp; Repayment Details','Build forms, results, ledgers and charts; lead shared layout/navigation; implement CSV/JSON interactions.'],
 ['5',NAMES[5],'Backend Engineer','Plan Optimization<br/>Condition Comparison','Build search, constraints, ranking and comparison APIs; maintain PostgreSQL, integration checks, Docker and CI.'],
 ['6',NAMES[6],'Frontend Engineer<br/>UI Designer','Plan Optimization<br/>Condition Comparison','Build optimization controls, recommendations, baseline comparisons, apply-plan flow and condition-comparison charts.'],
]

FUNCTIONS=[
 ['<b>Policies &amp; Methodology</b><br/><b>Help &amp; Project Information</b>',NAMES[2],NAMES[1],'<b>Policies:</b> sources, effective dates, formulas and scope.<br/><b>Help:</b> instructions, example inputs, FAQ and project overview.'],
 ['<b>Homepage / Joint Calculator</b><br/><b>Ledger &amp; Repayment Details</b>',NAMES[4],NAMES[3],'<b>Calculator:</b> income, tax, provident fund, loan mix and disposable cash.<br/><b>Details:</b> annual ledger, full repayment schedule and data exports.'],
 ['<b>Plan Optimization</b><br/><b>Condition Comparison</b>',NAMES[6],NAMES[5],'<b>Optimization:</b> feasible recommendations versus the original plan.<br/><b>Comparison:</b> show changes in payments, interest and cash flow when one input changes.'],
]

# The table and chart use the exact same WEEKS records.
class Gantt(Flowable):
    def __init__(self):
        super().__init__()
        self.width=CW
        self.height=370

    def draw(self):
        c=self.canv
        left,right,top,step=235,650,318,16
        first,last=date(2026,10,1),date(2027,4,30)
        def x(d): return left+(d-first).days/(last-first).days*(right-left)
        bottom=top-(len(WEEKS)-1)*step-10
        def text(xx,yy,s,size=9.5,bold=False,color=TEXT):
            c.setFillColor(color)
            c.setFont('Arial-Bold' if bold else 'Arial',size)
            c.drawString(xx,yy,s)
        c.setFillColor(colors.HexColor('#f1f4f8'))
        c.rect(x(BREAK_START),bottom,x(BREAK_END+timedelta(days=1))-x(BREAK_START),top-bottom+10,stroke=0,fill=1)
        text(0,350,'WEEK / WORK PACKAGE',9.5,bold=True)
        text(667,350,'START - END',9.5,bold=True)
        text(x(date(2026,11,1)),365,'2026',8.5,bold=True)
        text(x(date(2027,2,15)),365,'2027',8.5,bold=True)
        for month in [date(2026,10,1),date(2026,11,1),date(2026,12,1),date(2027,1,1),date(2027,2,1),date(2027,3,1),date(2027,4,1)]:
            c.setStrokeColor(colors.HexColor('#dce4ec'));c.setLineWidth(.4)
            c.line(x(month),bottom,x(month),top+10)
            text(x(month+timedelta(days=13))-5,336,month.strftime('%b'),9)
        palette={'base':BLUE,'extension':GREEN,'verification':GREY,'report':GREY,'delivery':GREY,'break':colors.HexColor('#d9e0e9')}
        for i,w in enumerate(WEEKS):
            y=top-i*step
            label=w['code']+'  '+w['title']
            size=9.5
            while pdfmetrics.stringWidth(label,'Arial',size)>left-8:
                size-=.1
            assert size>=8.5
            text(0,y,label,size,bold=w['kind']=='break')
            c.setStrokeColor(colors.HexColor('#e6ebf0'));c.setLineWidth(.35);c.line(left,y+3,right,y+3)
            c.setFillColor(palette[w['kind']])
            for d in dates(w['start'],w['end']):
                if w['kind']=='break' or working(d):
                    c.rect(x(d),y-1,x(d+timedelta(days=1))-x(d)+.04,8,fill=1,stroke=0)
            for ds,_ in w['milestones']:
                xx=x(date.fromisoformat(ds)); yy=y+3
                path=c.beginPath();path.moveTo(xx,yy+3.5);path.lineTo(xx+3.5,yy);path.lineTo(xx,yy-3.5);path.lineTo(xx-3.5,yy);path.close()
                c.setFillColor(colors.HexColor('#2675c7'));c.drawPath(path,fill=1,stroke=0)
            label_date=f"{w['start']:%d %b} - {w['end']:%d %b}"
            text(667,y,label_date,9.3)
        yy=bottom-23
        for xx,color,label in [(0,BLUE,'Baseline'),(155,GREEN,'Extensions'),(310,GREY,'Checks / reports / delivery'),(575,palette['break'],'Break')]:
            c.setFillColor(color);c.roundRect(xx,yy,10,6,1,fill=1,stroke=0)
            text(xx+15,yy-1,label,9)
        


def footer(c,doc):
    c.saveState()
    c.setStrokeColor(colors.HexColor('#d5dfe8'));c.setLineWidth(.5);c.line(M,25,W-M,25)
    c.setFont('Arial',7);c.setFillColor(colors.HexColor('#667688'))
    c.drawString(M,14,'GRP P01 | Team plan | 25 October 2026 | Asia/Shanghai')
    c.drawRightString(W-M,14,str(doc.page));c.restoreState()


def heading(title,sub=None):
    out=[p(title,'title')]
    if sub:out.append(p(sub,'body'))
    return out


TEAM_FOCUS={
 'W01':'Agree the scope, review the prototype and prepare local development environments.',
 'W02':'Agree data models and APIs; build the page structure and project website.',
 'W03':'Connect income and tax calculations to the UI; begin optimization and report drafts.',
 'W04':'Complete mortgage calculations, repayment details and the combined-loan workflow.',
 'W05':'Connect the full calculation and optimization journey, including applying a recommended plan.',
 'W06':'Test and accept the required baseline; finish the interim report draft.',
 'W07':'Review and submit the interim report; archive the baseline and restart notes.',
 'BREAK':'Full team break. No project work or submission duties are scheduled.',
 'W08':'Restart and check the baseline; build the separate condition-comparison feature.',
 'W09':'Connect exports, imports, comparison charts and clear result explanations.',
 'W10':'Finish agreed extensions and usability fixes; freeze the feature scope.',
 'W11':'Run integrated tests across all features and fix remaining defects.',
 'W12':'Verify desktop and mobile use; complete the final report draft.',
 'W13':'Review the release and report; prepare demonstration and presentation materials.',
 'W14':'Submit the software and team report; begin demonstration recordings.',
 'W15':'Submit the media deliverables and prepare individual report outlines.',
 'W16':'Write individual report drafts and check shared facts against project evidence.',
 'W17':'Finalize and submit all six individual reports; confirm submission receipts.',
}


def weekly_table(weeks):
    data=[[p('Week and dates','head'),p('Team focus','head'),p('Specific work for each member','head')]]
    for w in weeks:
        period=f"<b>{w['code']}</b><br/>Start: {w['start']}<br/>End: {w['end']}<br/>{w['days']} workdays"
        focus=p('<b>'+escape(w['title'])+'</b><br/><br/>'+escape(TEAM_FOCUS[w['code']]),'cell')
        content=[]
        if w['tasks']:
            for i in (0,2,4):
                content.append(p(f"<b>{FIRST[i]}:</b> {escape(w['tasks'][i])} <b>{FIRST[i+1]}:</b> {escape(w['tasks'][i+1])}",'detail'))
                content.append(Spacer(1,3))
            content.append(p('<b>Weekly output:</b> '+escape(w['output']),'small'))
        else:
            content.append(p(escape(w['output']),'detail'))
        data.append([p(period,'cell'),focus,content])
    t=Table(data,colWidths=[110,150,CW-260],repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([
      ('BACKGROUND',(0,0),(-1,0),NAVY),('ROWBACKGROUNDS',(0,1),(-1,-1),[LIGHT,colors.white]),
      ('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
      ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
      ('LINEBELOW',(0,0),(-1,0),.5,NAVY),('LINEBELOW',(0,1),(-1,-1),.35,colors.HexColor('#d6e0e9')),
    ]))
    return t


def main():
    validate()
    story=[]
    story+=heading('GRP P01 | Team and Delivery Plan','Mortgage and Income Tax Joint Calculator<br/>27 October 2026 - 22 April 2027')
    story.append(p('1. Team responsibilities','section'))
    compact=[[f'<b>{r[0]}. {r[1]}</b>',r[2],r[3],r[4]] for r in MEMBERS]
    story.append(table(['Member','Roles','Assigned pages','Main responsibilities'],compact,[105,135,180,CW-420],pads=4))
    story.append(p('2. Functional pages','section'))
    story.append(table(['Functional pages','Frontend / UI','Backend','Function'],FUNCTIONS,[190,100,100,CW-390],pads=4))
    story.append(Spacer(1,6))
    story.append(p('<b>Shared work:</b> Xingjian and Xinyi verify policies; Haochen and Boqing cross-review backend logic; Xinyi, Wan-Chia and Zicheng review frontend/UI. Everyone tests, documents and writes their own report section.','small'))
    story.append(p('<b>Stack:</b> React, TypeScript, Ant Design and ECharts; Java, Spring Boot and BigDecimal; PostgreSQL; JUnit and Playwright; Docker and GitHub Actions.','small'))

    story.append(PageBreak())
    story+=heading('3. Gantt chart','Each row matches one row of the detailed schedule, including its code, dates and work package. Blue diamonds identify dated targets within a week.')
    story.append(Gantt())
    story.append(p('<b>Calendar:</b> All weekends excluded. No work from 10 December 2026 to 14 February 2027. Restart on 15 February is provisional. Qingming, 5 April, is excluded. Work bars show available weekdays only.','small'))
    story.append(p('<b>Key targets:</b> Baseline accepted: 4 Dec. Interim submitted: 9 Dec. Feature freeze: 5 Mar. Release candidate: 26 Mar. Internal / course submissions: 31 Mar / 1 Apr (software/report), 7 / 8 Apr (media), 21 / 22 Apr (individual reports). Course dates remain tentative.','small'))

    batches=[(0,3),(3,6),(6,9),(9,12),(12,15),(15,18)]
    for part,(a,b) in enumerate(batches,1):
        story.append(PageBreak())
        story+=heading(f'4. Detailed weekly schedule | {part}/6',
            'Named tasks are carried out in parallel. Every active week assigns work to all six members. Dates are inclusive; days exclude weekends and agreed breaks.')
        story.append(weekly_table(WEEKS[a:b]))
        if part==3:
            story.append(Spacer(1,7))
            story.append(p('<b>Interim rule:</b> Constrained optimization is a required baseline feature. The accepted baseline is completed before interim; the break carries no work or submission duties. Confirm that the report can be uploaded on 9 Dec.','small'))
        if part==6:
            story.append(Spacer(1,7))
            story.append(p('<b>Availability:</b> 80 project weekdays: 32 before the break, 48 after it. Of these, 66 fall on/before the 1 Apr software/report deadline. This is calendar capacity, not full-time person-days. Each member records their own testing, documentation and contribution evidence throughout.','small'))

    story.append(PageBreak())
    story+=heading('5. Stage goals','Required functionality before interim; extensions next semester; protected testing, report and submission time.')
    goals=[
      ['<b>Baseline delivery</b><br/>27 Oct - 4 Dec 2026',
       '<b>Scope:</b> Income/tax/provident fund; commercial, provident-fund and combined loans; both repayment methods; monthly/annual cash flow and full schedules; constrained optimization and original-plan comparison; basic policy/help, bilingual UI and local startup.<br/><b>Exit:</b> Accepted baseline, checked calculations, actual desktop/mobile use and a complete interim draft.'],
      ['<b>Interim submission</b><br/>7-9 Dec 2026',
       '<b>Scope:</b> Review the report against software, sources, screenshots and personal contributions. Submit on 9 Dec, ahead of the tentative 10 Dec course deadline.<br/><b>Exit:</b> Receipt and archived software, test evidence and restart instructions.'],
      ['<b>Extended break</b><br/>10 Dec 2026 -<br/>14 Feb 2027',
       '<b>Scope:</b> All six members rest. No development, meetings, reviews, reports or submission duties.<br/><b>Exit:</b> Zero scheduled holiday work; restart date remains provisional.'],
      ['<b>Extensions</b><br/>15 Feb - 5 Mar 2027',
       '<b>Scope:</b> Regress the baseline; improve condition comparison, charts, explanations, CSV/JSON workflows and policy traceability. Named PostgreSQL scenarios are optional.<br/><b>Exit:</b> All six final pages connected; feature freeze on 5 Mar; unfinished optional work dropped.'],
      ['<b>Final delivery</b><br/>8 Mar - 1 Apr 2027',
       '<b>Scope:</b> Integration/regression, actual platform acceptance, final report, clean-start checks and release packaging. Internal submission target: 31 Mar.<br/><b>Exit:</b> Software, report, user guide, policy sources and actual test evidence submitted by tentative 1 Apr, 15:00.'],
      ['<b>Media and individual reports</b><br/>2-22 Apr 2027',
       '<b>Scope:</b> Demo recording, presentation recording and promotional artefact: internal 7 Apr / tentative course 8 Apr. Individual reports: internal 21 Apr / tentative course 22 Apr.<br/><b>Exit:</b> Verified uploads and receipts; truthful individual contribution evidence.'],
    ]
    story.append(table(['Stage and dates','Scope and completion target'],goals,[155,CW-155],style='cell',pads=5))
    story.append(p('Working rules','section'))
    for text in [
      'Reuse and review the prototype. Xingjian reviews completeness, consistency and corrections; each author finishes their own report section. Development and code review remain shared within the team.',
      'If time is tight, drop optional saved scenarios and visual polish first. Required financial calculations and constrained optimization must remain complete before interim.',
      'Course dates are tentative: ethics 28 Oct; website 5 Nov; team report/software 1 Apr; media 8 Apr; individual reports 22 Apr. Course deadline times are 15:00, Asia/Shanghai. Open Day and live Q&amp;A dates remain TBC.',
      'The 2027 holiday calendar and 15 Feb restart are provisional. Recheck official and university arrangements and remove any additional holiday weekdays from the plan.'
    ]: story.append(p(text,'small'))
    story.append(p('<b>Calendar reference:</b> <link href="https://www.chinamoney.org.cn/chinese/bbjjr/20251219/3254570.html" color="#2675c7">CFETS provisional 2027 calendar</link>, subject to official adjustment. Course targets come from the supplied tentative key-dates attachment.','small'))

    doc=SimpleDocTemplate(str(OUT),pagesize=landscape(A4),rightMargin=M,leftMargin=M,topMargin=30,bottomMargin=37,
                         title='GRP P01 - Team Responsibilities and Weekly Delivery Plan',author='GRP P01 Project Team')
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    print(OUT)


if __name__=='__main__': main()
