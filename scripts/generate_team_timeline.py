"""Generate the current bilingual team timeline and matching Gantt PNG/SVG files.

The calendar is provisional: weekdays only, an extended winter break, and 5 April
excluded. Requires Pillow. Existing prototype features are reviewed and reused.
"""
from datetime import date, timedelta
from pathlib import Path
import html
import re
import zipfile
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
ASSETS = DOCS / 'assets'
START, END = date(2026, 10, 27), date(2027, 4, 22)
BREAK_START, BREAK_END = date(2026, 12, 10), date(2027, 2, 14)
HOLIDAYS = {date(2027, 4, 5)}


def dates(a, b):
    return (a + timedelta(days=i) for i in range((b-a).days+1))


def working(d):
    return d.weekday() < 5 and not BREAK_START <= d <= BREAK_END and d not in HOLIDAYS


# Dates; bilingual phase, owners, tasks and acceptance. Owners match the latest
# division: 1/2 policy-help, 3/4 calculations-details, 5/6 optimization-comparison.
PHASES = [
('2026-10-27','2026-10-30',
 ('启动、需求与政策范围','Kickoff, requirements and policy scope'),
 ('全员；1、2 核对需求','All; 1/2 review requirements'),
 ('每人启动现有 prototype；1、2 确认适用地区、年份和规则来源；3、5 确认计算接口；2、4、6 确认页面布局。核对 10/28 暂定伦理材料截止要求。',
  'Run the prototype on every member’s machine. 1/2 confirm policy scope and sources; 3/5 agree calculation contracts; 2/4/6 agree page layouts. Check the tentative 28 Oct ethics requirement.'),
 ('可运行基线、需求清单、责任分工及政策来源表。','Runnable baseline, requirement list, ownership and policy register.')),
('2026-11-02','2026-11-06',
 ('数据模型、接口与项目网站','Data models, API contracts and project website'),
 ('1、2 政策帮助；3、4 计算；5、6 优化','1/2 policy-help; 3/4 calculator; 5/6 optimization'),
 ('1 建政策和示例数据结构，2 完成说明页初版；3 建计算输入输出，4 完成表单与公共导航；5、6 用模拟数据接通优化页。11/5 前完成课程项目网站要求，各自开始写需求与设计说明。',
  '1 builds policy/example data; 2 drafts content pages; 3 defines calculation models; 4 builds forms/navigation; 5/6 connect the optimization view using mock responses. Meet the 5 Nov project website target; start requirements/design documentation.'),
 ('接口样例、页面框架、项目网站与需求追踪表。','API examples, page shell, project website and requirement traceability.')),
('2026-11-09','2026-11-13',
 ('工资、个税与公积金基础计算','Income, tax and provident-fund baseline'),
 ('3、4 主责；1、2 核对；5、6 并行开发','3/4 lead; 1/2 review; 5/6 build in parallel'),
 ('3 实现或复核工资、奖金、扣除、社保和公积金；4 联调收入结果；1、2 补齐来源、字段说明及参考案例；5、6 开发优化参数和候选生成。全员持续写中期报告自己的章节。',
  '3 implements/reviews income, bonus, deductions, insurance and provident fund; 4 connects results; 1/2 provide sources and reference cases; 5/6 build candidate generation and controls. Each member drafts their interim section.'),
 ('收入计算可演示；参考案例、边界测试和报告设计章节初稿。','Working income flow, reference/boundary checks and draft design sections.')),
('2026-11-16','2026-11-20',
 ('房贷、组合贷与账单明细','Mortgage, combined loans and ledgers'),
 ('3、4 主责；5 交叉检查；1、2 政策','3/4 lead; 5 cross-checks; 1/2 policy'),
 ('3、4 接通等额本息、等额本金、组合贷、年度现金流和完整还款明细；5 复用计算模块接入约束；6 完成优化结果展示；1、2 完成基础政策与帮助页面。',
  '3/4 connect both repayment methods, combined loans, annual cash flow and full schedules; 5 reuses the engine for constraints; 6 displays candidate results; 1/2 complete baseline policies/help.'),
 ('两种还款方式及组合贷可用，首页与账单总额一致，说明页面可读。','Repayment methods and combined loans work; homepage and ledgers reconcile; guidance is available.')),
('2026-11-23','2026-11-27',
 ('基础优化与全流程联调','Baseline optimization and end-to-end integration'),
 ('5、6 主责；3、4 联调；1、2 规则验收','5/6 lead; 3/4 integrate; 1/2 check rules'),
 ('完成年限、贷款组合等允许变量的有界搜索、约束过滤、推荐排序、原方案比较及应用方案；处理无可行方案；核对输入—计算—推荐—明细完整流程。',
  'Complete bounded search over permitted terms/loan splits, feasibility filtering, ranking, baseline comparison and applying a plan. Explain infeasible cases and verify the full input-calculation-recommendation-ledger journey.'),
 ('必做优化功能完成；小候选集有独立预期结果；推荐可复现。','Required optimization works; small candidate sets have independently checked expected results; selected plans reproduce.')),
('2026-11-30','2026-12-04',
 ('基础版验收与中期报告审阅','Baseline acceptance and interim review'),
 ('全员；1 审阅核对；3、5 后端；2、4、6 前端','All; 1 reviews; 3/5 backend; 2/4/6 frontend'),
 ('检查所有必做功能、双语、本地启动及至少一台真实电脑和一台真实手机；回归金额、接口和页面流程；修复阻断问题。每人完成自己的报告章节，1 核对报告、截图和软件版本。',
  'Accept all mandatory features, bilingual UI, local startup and actual desktop/mobile use. Regress financial/API/UI flows and fix blockers. Everyone completes their section; 1 checks the report, screenshots and software version.'),
 ('12/4 基础版验收并冻结，报告完整草稿及实际测试记录就绪。','Baseline accepted/frozen by 4 Dec; complete interim draft and actual test evidence.')),
('2026-12-07','2026-12-09',
 ('报告定稿、提交与休假归档','Interim finalization, submission and archive'),
 ('全员完成材料；1 审阅核对','All prepare materials; 1 reviews consistency'),
 ('仅做必要修复、引用和格式检查；12/9 提交中期报告并确认回执；归档基础版、演示输入、测试和复工说明。提前确认报告能在课程暂定 12/10 截止前一天提交。',
  'Use the buffer for necessary fixes, references and formatting. Submit the interim report on 9 Dec and retain the receipt; archive the baseline, examples, tests and restart notes. Confirm early submission access beforehand.'),
 ('中期报告已提交；基础功能及归档材料完整；假期无遗留提交任务。','Interim submitted; baseline archived; no submission duties left for the break.')),
('2026-12-10','2027-02-14',
 ('寒假及春节休假','Extended winter / Spring Festival break'),
 ('全员休假','All on break'),
 ('不安排开发、会议、审阅、报告或提交；暂定春节后 2/15 复工。','No development, meetings, reviews, reports or submissions. Provisional restart: 15 Feb.'),
 ('工作日容量为 0；无任何任务依赖假期投入。','Zero workday capacity and no dependency on holiday work.')),
('2027-02-15','2027-02-19',
 ('复工检查与条件对比拓展','Restart checks and condition-comparison extension'),
 ('1、2 核对；3、4 回归；5、6 拓展','1/2 review; 3/4 regress; 5/6 extend'),
 ('先恢复冻结版本并回归，核对政策、校历和截止日期；5、6 扩展独立条件变化对比页，支持固定基准改变一个参数。开始撰写最终报告增量章节；本周不预留首次完成必做功能。',
  'Restore/regress the accepted baseline; check policy, calendar and deadlines. 5/6 extend the standalone condition-comparison page with a fixed baseline and one changed input. Start final-report updates; mandatory features were completed before interim.'),
 ('基础版回归通过；条件对比首版可演示；仅已确认的拓展进入任务清单。','Baseline regression passes; first comparison extension is demonstrable; extension scope confirmed.')),
('2027-02-22','2027-02-26',
 ('导入导出、解释与图表拓展','Import/export, explanations and chart extensions'),
 ('3、4 明细及导入导出；5、6 推荐；1、2 帮助','3/4 data workflows; 5/6 explanations; 1/2 guidance'),
 ('3、4 完善 CSV 明细导出和 JSON 方案往返；5、6 完善推荐差额解释、条件对比图及不可行提示；1、2 更新政策追溯和帮助示例。',
  '3/4 improve CSV ledger exports and JSON scenario round trips; 5/6 improve recommendation differences, comparison charts and infeasibility messages; 1/2 update policy traceability and help examples.'),
 ('导出数据一致，导入可重算；图表与原始数据一致；六个最终页面全部贯通。','Exports reconcile, imports recalculate, charts match source data; all six final pages connected.')),
('2027-03-01','2027-03-05',
 ('拓展收尾与功能范围冻结','Extension completion and feature freeze'),
 ('全员；5、6 可选保存；1、2 内容；3、4 稳定性','All; 5/6 optional storage; 1/2 content; 3/4 stability'),
 ('仅在前述拓展通过后考虑 PostgreSQL 命名方案保存，由 5、6 实现，3、4 提供方案数据，1 辅助；其余成员完善双语、手机及说明。3/5 冻结功能，未完成可选项移出本期。',
  'Only after prior checks pass, consider named PostgreSQL scenarios: 5/6 implement, 3/4 supply data, 1 assists. Finish bilingual/mobile guidance. Freeze scope on 5 Mar; drop incomplete optional items.'),
 ('拓展完成并冻结，方案保存明确标注完成或取消，后续只做测试修复。','Extensions frozen; optional persistence explicitly included or dropped; subsequent work is validation/fixes.')),
('2027-03-08','2027-03-12',
 ('系统集成与回归测试','System integration and regression'),
 ('3、5 后端；2、4、6 前端；1 覆盖核对','3/5 backend; 2/4/6 frontend; 1 checks coverage'),
 ('执行 JUnit、Spring Boot 集成测试和 Playwright 关键流程；检查异常输入、无解、双语和导入导出；验证数据库、Docker 与 CI 的实际运行情况。',
  'Run JUnit, Spring Boot integration tests and critical Playwright flows; check invalid inputs, infeasible cases, languages and data workflows. Verify actual database/Docker/CI behavior.'),
 ('需求—测试追踪表、真实测试结果和缺陷修复记录。','Requirement-test traceability, actual results and defect/fix records.')),
('2027-03-15','2027-03-19',
 ('跨平台验收与最终报告初稿','Cross-platform acceptance and final draft'),
 ('全员完成自己的章节；1 审阅核对','Each member writes their section; 1 reviews'),
 ('在真实电脑和手机完成典型操作，修复可用性问题；完成需求、设计、实现、测试、限制及贡献章节。1 核对报告与软件结果、截图和版本。',
  'Complete actual desktop/mobile user journeys and fix usability defects. Finish requirements, design, implementation, tests, limitations and contribution sections. 1 checks report/software consistency.'),
 ('跨平台验收记录及 3/19 最终报告完整初稿。','Actual platform acceptance and a complete final-report draft by 19 Mar.')),
('2027-03-22','2027-03-26',
 ('发布候选、报告终审与展示准备','Release candidate, report review and media preparation'),
 ('3、5 发布；2、4、6 展示；1 审阅','3/5 release; 2/4/6 media; 1 reviews'),
 ('从干净环境验证启动，回归关键计算，核对政策引用、用户手册和贡献记录；准备演示脚本、PPT 和宣传材料初稿；3/26 冻结提交候选版。',
  'Verify clean setup, regress key calculations and check citations, manuals and contribution records. Prepare demo scripts, slides and promotional drafts. Freeze the release candidate on 26 Mar.'),
 ('可运行发布候选、终审报告和展示材料初稿，关键缺陷关闭。','Runnable candidate, reviewed report and draft media; critical defects closed.')),
('2027-03-29','2027-03-31',
 ('最终检查与提交缓冲','Final checks and submission buffer'),
 ('全员；1 核对交付清单','All; 1 checks the delivery list'),
 ('保留三天用于必要返工、打包、格式和上传检查；内部目标 3/31 提交团队报告和软件，若系统未开放则全部材料提前就绪。',
  'Reserve three days for necessary rework, packaging, formatting and upload checks. Internal target: submit report/software by 31 Mar, or have the full package ready if the portal is not open.'),
 ('软件、报告、配置和证据版本一致，提交回执或待上传完整包就绪。','Consistent software/report/configuration/evidence; receipt or complete ready-to-upload package.')),
('2027-04-01','2027-04-01',
 ('团队报告与软件提交截止','Team report and software deadline'),
 ('全员；1 核对完成情况','All; 1 verifies completion'),
 ('15:00 前完成或核对提交，下载检查所交文件，保存回执；附件日期仍为暂定。','Submit or verify before 15:00; check downloaded files and retain receipts. Course date remains tentative.'),
 ('团队报告与软件提交完成。','Report and software submission complete.')),
('2027-04-02','2027-04-02',
 ('演示及团队展示录制','Demo and team presentation recording'),
 ('全员；2、4、6 画面；3、5 技术演示；1 核对','All; 2/4/6 visuals; 3/5 walkthrough; 1 reviews'),
 ('按已准备脚本录制提交版本；制作宣传数字作品；不再增加软件功能。','Record the submitted software using prepared scripts; build the promotional artefact; no new software features.'),
 ('两份录制初稿和宣传作品初稿。','Draft demo/presentation recordings and promotional artefact.')),
('2027-04-06','2027-04-07',
 ('录制材料检查与提前提交','Media checks and early submission'),
 ('全员；1 审阅完整性','All; 1 reviews completeness'),
 ('4/3—4/5 不工作；4/6 起检查声音、字幕、时长、播放及链接，目标 4/7 提交三项材料。','No work on 3–5 Apr. From 6 Apr check audio, captions, duration, playback and links; target submission of all three items on 7 Apr.'),
 ('三项展示材料通过检查并准备好或完成提交。','All three media deliverables checked and ready/submitted.')),
('2027-04-08','2027-04-08',
 ('录屏、展示及宣传材料截止','Media submission deadline'),
 ('全员核对','All verify'),
 ('15:00 前核对软件演示录屏、团队展示录屏和宣传数字作品提交及回执；日期暂定。','Verify demo, presentation and promotional artefact submissions/receipts before 15:00; date tentative.'),
 ('三项材料提交完成。','All three media submissions complete.')),
('2027-04-09','2027-04-09',
 ('个人报告提纲与答辩素材','Individual outlines and Q&A materials'),
 ('每人负责自己的报告','Each member owns their report'),
 ('整理本人真实贡献、技术决策和证据；准备一分钟介绍和问答素材。Open Day 与现场问答实际日期另行确认。','Select personal contributions, decisions and evidence; prepare one-minute introductions/Q&A materials. Open Day and live Q&A dates remain unconfirmed.'),
 ('六份个人提纲与贡献证据清单。','Six outlines and personal evidence lists.')),
('2027-04-12','2027-04-16',
 ('个人报告撰写','Individual report drafting'),
 ('每人独立撰写','Each member writes independently'),
 ('完成个人实现、问题解决、测试、协作和反思；同伴可检查事实和引用。','Draft personal implementation, problem-solving, tests, teamwork and reflection; peers may check facts and references.'),
 ('六份个人报告完整初稿。','Six complete individual drafts.')),
('2027-04-19','2027-04-21',
 ('个人报告终审与缓冲','Individual final review and buffer'),
 ('每人负责自己的提交','Each member owns submission'),
 ('核对格式、引用、贡献及课程要求的 AI 使用说明；内部目标 4/21 提交。','Check format, references, contribution accuracy and required AI-use statements; internal target: submit by 21 Apr.'),
 ('六份个人报告终稿及提交准备。','Six final individual reports ready/submitted.')),
('2027-04-22','2027-04-22',
 ('个人报告提交截止','Individual report deadline'),
 ('每人提交；1 核对完成状态','Each submits; 1 checks completion status'),
 ('15:00 前核对或完成提交并保存回执；未定日期活动继续标记待确认。','Verify/complete submissions before 15:00 and save receipts; undated events remain TBC.'),
 ('所有已知书面和数字材料提交归档。','All dated written/digital submissions archived.')),
]


def schedule(lang):
    headings = ['阶段','开始日期','结束日期','工作日','负责人','具体任务','交付／验收'] if lang == 0 else ['Phase','Start','End','Workdays','Owners','Tasks','Acceptance']
    lines = ['| '+' | '.join(headings)+' |','|---|---|---|---:|---|---|---|']
    seen = []
    for i,(a,b,name,owners,tasks,accept) in enumerate(PHASES,1):
        aa,bb = date.fromisoformat(a),date.fromisoformat(b)
        active = [d for d in dates(aa,bb) if working(d)]
        if active:
            assert working(aa) and working(bb)
        seen += active
        lines.append('| '+' | '.join([f'{i:02d}. **{name[lang]}**',a,b,str(len(active)),owners[lang],tasks[lang],accept[lang]])+' |')
    expected = [d for d in dates(START,END) if working(d)]
    assert len(seen)==len(set(seen)) and sorted(seen)==expected
    assert sum(working(d) for d in dates(START,BREAK_START-timedelta(days=1)))==32
    assert len(expected)==80
    return '\n'.join(lines)


# Label pairs, dates, type. Section rows separate the semesters explicitly.
CHART = [
 (('上学期｜基础版与中期报告','SEMESTER 1 | BASELINE + INTERIM'),None,None,'section'),
 (('需求、政策、接口与项目网站','Requirements, policy, APIs and website'),'2026-10-27','2026-11-06','base'),
 (('收入、房贷、组合贷与明细','Income, mortgage, combined loans and ledgers'),'2026-11-09','2026-11-20','base'),
 (('基础优化与全流程联调','Required optimization and integration'),'2026-11-23','2026-11-27','base'),
 (('基础版测试与跨平台验收','Baseline checks and platform acceptance'),'2026-11-30','2026-12-04','base'),
 (('基础功能完成／基础版冻结','BASELINE ACCEPTED / FROZEN'),'2026-12-04','2026-12-04','milestone'),
 (('中期报告撰写、审阅及提交准备','Interim writing, review and submission prep'),'2026-11-09','2026-12-08','writing'),
 (('中期报告提交（内部提前一天）','INTERIM SUBMITTED (one day early)'),'2026-12-09','2026-12-09','milestone'),
 (('寒假及春节｜不安排任何工作','WINTER / SPRING FESTIVAL | NO WORK'),'2026-12-10','2027-02-14','break'),
 (('下学期｜拓展、验证与最终交付','SEMESTER 2 | EXTENSIONS + DELIVERY'),None,None,'section'),
 (('复工回归及条件变化对比拓展','Restart regression and comparison extension'),'2027-02-15','2027-02-19','extension'),
 (('导入导出、解释和图表完善','Data workflows, explanations and charts'),'2027-02-22','2027-02-26','extension'),
 (('可选方案保存／拓展收尾','Optional saved plans / extension completion'),'2027-03-01','2027-03-05','extension'),
 (('拓展功能冻结','EXTENSIONS FROZEN'),'2027-03-05','2027-03-05','milestone'),
 (('系统回归与跨平台验收','System regression and platform acceptance'),'2027-03-08','2027-03-19','writing'),
 (('最终报告撰写及审阅','Final report writing and review'),'2027-02-15','2027-03-26','writing'),
 (('发布候选、材料核对及提交缓冲','Release candidate, review and buffer'),'2027-03-22','2027-03-31','writing'),
 (('团队报告与软件截止（暂定）','REPORT + SOFTWARE DUE (TBC)'),'2027-04-01','2027-04-01','milestone'),
 (('录屏、展示和宣传材料','Demo, presentation and promotional media'),'2027-04-02','2027-04-07','writing'),
 (('三项展示材料截止（暂定）','THREE MEDIA ITEMS DUE (TBC)'),'2027-04-08','2027-04-08','milestone'),
 (('个人报告撰写及核对','Individual report writing and review'),'2027-04-09','2027-04-21','writing'),
 (('个人报告截止（暂定）','INDIVIDUAL REPORTS DUE (TBC)'),'2027-04-22','2027-04-22','milestone'),
]


def chart(lang):
    W, TOP, STEP, LEFT, RIGHT = 2200, 255, 56, 760, 1800
    bottom = TOP+(len(CHART)-1)*STEP+30
    H = bottom+220
    image = Image.new('RGB',(W,H),'white')
    draw = ImageDraw.Draw(image)
    sv = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
          '<title>GRP P01 team timeline: baseline before interim, extensions next semester</title>',
          '<rect width="100%" height="100%" fill="white"/>']
    fonts = {}
    def font(size,bold=False):
        key=(size,bold)
        if key not in fonts:
            if lang==0:
                path='/System/Library/Fonts/Hiragino Sans GB.ttc'
                fonts[key]=ImageFont.truetype(path,size,index=1 if bold else 0)
            else:
                path='/System/Library/Fonts/Supplemental/Arial'+(' Bold' if bold else '')+'.ttf'
                fonts[key]=ImageFont.truetype(path,size)
        return fonts[key]
    def txt(x,y,s,size=25,color='#23364a',bold=False,anchor='start'):
        f=font(size,bold)
        ww=draw.textlength(s,font=f)
        xx=x if anchor=='start' else x-ww if anchor=='end' else x-ww/2
        assert xx>=0 and xx+ww<=W, s
        draw.text((xx,y),s,font=f,fill=color,anchor='lt')
        family='Hiragino Sans GB, sans-serif' if lang==0 else 'Arial, sans-serif'
        sv.append(f'<text x="{x}" y="{y+size}" font-family="{family}" font-size="{size}" fill="{color}" font-weight="{700 if bold else 400}" text-anchor="{anchor}">{html.escape(s)}</text>')
    def line(x,y,xx,yy,color='#e3e8ed',w=1):
        draw.line((x,y,xx,yy),fill=color,width=w)
        sv.append(f'<line x1="{x}" y1="{y}" x2="{xx}" y2="{yy}" stroke="{color}" stroke-width="{w}"/>')
    def rect(x,y,xx,yy,fill,r=0):
        draw.rounded_rectangle((x,y,xx,yy),radius=r,fill=fill)
        sv.append(f'<rect x="{x}" y="{y}" width="{xx-x}" height="{yy-y}" rx="{r}" fill="{fill}"/>')
    def diamond(x,y):
        pts=[(x,y-12),(x+12,y),(x,y+12),(x-12,y)]
        draw.polygon(pts,fill='#2675c7')
        sv.append('<polygon points="'+' '.join(f'{xx},{yy}' for xx,yy in pts)+'" fill="#2675c7"/>')
    first,last=date(2026,10,20),date(2027,4,30)
    def x(d): return LEFT+(d-first).days/(last-first).days*(RIGHT-LEFT)
    title=('GRP P01｜整组交付时间线','GRP P01 | Whole-team delivery timeline')[lang]
    subtitle=('12 月 4 日前完成基础版验收；下学期拓展；保留测试、报告和提交缓冲。',
              'Baseline accepted by 4 Dec; extensions next semester; protected verification and submission buffers.')[lang]
    txt(55,35,title,40,bold=True)
    txt(55,99,subtitle,25)
    txt(55,145,('2026-10-27 — 2027-04-22｜80 个可用工作日｜周末及排除日不工作｜课程截止日期暂定',
                '27 Oct 2026 - 22 Apr 2027 | 80 available weekdays | Weekends excluded | Course dates tentative')[lang],23,color='#657484')
    txt(55,206,('工作包／里程碑','WORK PACKAGE / MILESTONE')[lang],21,bold=True)
    txt(1850,206,('计划日期','PLANNED DATES')[lang],21,bold=True)
    rect(x(BREAK_START),TOP-20,x(BREAK_END+timedelta(days=1)),bottom,'#f1f4f8')
    for month in [date(2026,11,1),date(2026,12,1),date(2027,1,1),date(2027,2,1),date(2027,3,1),date(2027,4,1)]:
        line(x(month),TOP-20,x(month),bottom)
        txt(x(month),205, f'{month.month}月' if lang==0 else month.strftime('%b'),21,anchor='middle')
    txt(LEFT-8,205,'10月' if lang==0 else 'Oct',21,anchor='end')
    palette={'base':'#407ea8','extension':'#3b9482','writing':'#a7b4c0','break':'#d9e0e9'}
    for i,(label,a,b,kind) in enumerate(CHART):
        y=TOP+i*STEP
        if kind=='section':
            rect(45,y-20,W-45,y+25,'#eaf0f6',5)
            txt(60,y-13,label[lang],24,bold=True)
            continue
        txt(55,y-13,label[lang],24,bold=kind=='milestone')
        assert draw.textlength(label[lang],font=font(24,kind=='milestone')) < LEFT-80
        line(LEFT,y,RIGHT,y)
        aa,bb=date.fromisoformat(a),date.fromisoformat(b)
        if kind=='milestone':
            assert working(aa)
            diamond(x(aa),y)
        else:
            # Weekday-only segments make excluded days visible inside each bar.
            active=list(dates(aa,bb)) if kind=='break' else [d for d in dates(aa,bb) if working(d)]
            for d in active:
                rect(x(d),y-11,x(d+timedelta(days=1)),y+11,palette[kind],1)
        value=aa.strftime('%m/%d') if aa==bb else f'{aa:%m/%d} - {bb:%m/%d}'
        txt(1850,y-13,value,24,color='#2675c7' if kind=='milestone' else '#556575',bold=kind=='milestone')
    foot=bottom+34
    legends=[('base',('基础功能','Required baseline')[lang]),('extension',('下学期拓展','Next-semester extensions')[lang]),('writing',('测试／文档／交付','Verification / documentation')[lang]),('break',('整段休假','Extended break')[lang])]
    xx=55
    for kind,label in legends:
        rect(xx,foot,xx+42,foot+20,palette[kind],3)
        txt(xx+55,foot-2,label,22)
        xx += 400 if lang else 345
    diamond(xx+12,foot+10)
    txt(xx+38,foot-2,('里程碑','Milestone')[lang],22)
    txt(55,foot+47,('12/10—2/14 全员休假；暂定 2/15 复工；4/5 清明不排工作；所有周末均排除。',
                    'No work: 10 Dec - 14 Feb. Restart: 15 Feb (provisional). 5 Apr and all weekends excluded.')[lang],23,color='#657484')
    txt(55,foot+90,('柱条仅着色可用工作日；1、2 政策帮助｜3、4 计算明细｜5、6 优化对比。',
                    'Bars color available weekdays only. 1/2 policy-help | 3/4 calculator-ledger | 5/6 optimization-comparison.')[lang],23,color='#657484')
    sv.append('</svg>')
    stem='grp_delivery_timeline_zh' if lang==0 else 'grp_delivery_timeline'
    ASSETS.mkdir(exist_ok=True)
    image.save(ASSETS/f'{stem}.png',dpi=(200,200))
    (ASSETS/f'{stem}.svg').write_text('\n'.join(sv))


def main():
    for lang in (0,1):
        doc=DOCS/('TEAM_TIMELINE_ZH.md' if lang==0 else 'GRP_TEAM_AND_DELIVERY_PLAN_EN.md')
        content=doc.read_text()
        block='<!-- TIMELINE_TABLE -->\n\n'+schedule(lang)+'\n\n<!-- /TIMELINE_TABLE -->'
        assert '<!-- TIMELINE_TABLE -->' in content
        content=re.sub(r'<!-- TIMELINE_TABLE -->(?:.*?<!-- /TIMELINE_TABLE -->)?',lambda _:block,content,flags=re.S)
        doc.write_text(content)
        chart(lang)
    with zipfile.ZipFile(DOCS/'GRP_TEAM_TIMELINE.zip','w',zipfile.ZIP_DEFLATED) as z:
        for path in [DOCS/'TEAM_TIMELINE_ZH.md',DOCS/'TEAM_RESPONSIBILITIES_ZH.md',DOCS/'GRP_TEAM_AND_DELIVERY_PLAN_EN.md',
                     *[ASSETS/f'{stem}.{ext}' for stem in ('grp_delivery_timeline_zh','grp_delivery_timeline') for ext in ('png','svg')]]:
            z.write(path,path.relative_to(DOCS))
    # Refresh the earlier portable English bundle as well.
    with zipfile.ZipFile(DOCS/'GRP_TEAM_AND_DELIVERY_PLAN_EN.zip','w',zipfile.ZIP_DEFLATED) as z:
        for path in [DOCS/'GRP_TEAM_AND_DELIVERY_PLAN_EN.md',ASSETS/'grp_delivery_timeline.png',ASSETS/'grp_delivery_timeline.svg']:
            z.write(path,path.relative_to(DOCS))
    print('Generated bilingual schedules and Gantt charts: 80 weekdays, 32 before break, 48 after; no working-day gaps or overlaps.')


if __name__=='__main__':
    main()
