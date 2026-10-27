"""Named weekly work packages shared by the PDF table and Gantt chart.

Each active week has exactly one task entry for each of the six members.
Break dates have no tasks. Dates use the provisional Asia/Shanghai calendar.
"""
from datetime import date, timedelta
from generate_team_timeline import dates, working

NAMES=['Xingjian XIE','Xinyi DENG','Haochen YIN','Wan-Chia WEI','Boqing HAN','Zicheng LIU']
FIRST=['Xingjian','Xinyi','Haochen','Wan-Chia','Boqing','Zicheng']


def week(code,start,end,title,kind,tasks,output,milestones=()):
    return dict(code=code,start=date.fromisoformat(start),end=date.fromisoformat(end),title=title,
                kind=kind,tasks=tasks,output=output,milestones=milestones)


WEEKS=[
week('W01','2026-10-27','2026-10-30','Scope and setup','base',[
 'Review the requirement checklist and policy scope; check ethics requirements for 28 Oct.',
 'Collect policy sources and sketch the policy/help pages with field definitions.',
 'Run the Java calculation module and list its inputs, outputs and known calculation gaps.',
 'Run the React application; map navigation and draft calculator/ledger layouts.',
 'Run backend checks; inspect optimization inputs and propose a bounded candidate set.',
 'Sketch optimization/comparison controls and agree example API responses with Boqing.'
],'Runnable environments, agreed scope, policy register and page sketches.',(('2026-10-28','Ethics target (TBC)'),)),
week('W02','2026-11-02','2026-11-06','Models, APIs and website','base',[
 'Define policy/example response fields and review requirement coverage and website content.',
 'Build the policy/help page shell and course project information for the 5 Nov target.',
 'Define salary/loan request models, response fields, monetary units and rounding rules.',
 'Build shared navigation, income/loan forms and typed API access using agreed examples.',
 'Create optimization request models, candidate-generation scaffolding and basic CI checks.',
 'Build range/objective controls and recommendation cards using mock responses.'
],'API examples, page shell and course project website; each member starts design notes.',(('2026-11-05','Project website (TBC)'),)),
week('W03','2026-11-09','2026-11-13','Income and tax baseline','base',[
 'Implement the policy/example endpoints and cross-check tax assumptions against sources.',
 'Connect policy/help content; write bilingual field hints and check the rule descriptions.',
 'Implement or verify salary, bonus, tax, insurance and provident-fund calculations with reference tests.',
 'Connect income results and validation messages; display tax and provident-fund breakdowns.',
 'Implement candidate generation and feasibility checks using the agreed calculation contract.',
 'Add objective/range validation and connect optimization request handling and loading states.'
],'Demonstrable income calculation; reference checks pass; all six draft their interim sections.'),
week('W04','2026-11-16','2026-11-20','Mortgage and ledgers','base',[
 'Review loan-policy assumptions and maintain the supported-scope and source records.',
 'Complete baseline policy/help pages and a step-by-step combined-loan example.',
 'Complete both repayment methods, combined loans, annual cash flow and full amortization tests.',
 'Build ledger/repayment tables and basic charts; reconcile displayed totals with API results.',
 'Connect the financial engine to search, add loan constraints and cross-check repayment results.',
 'Display candidate payments, interest and disposable cash; add original-plan comparison fields.'
],'Both repayment methods and combined loans work; ledgers reconcile; policy/help is usable.'),
week('W05','2026-11-23','2026-11-27','Baseline optimization','base',[
 'Check recommendations against agreed requirements and record missing or inconsistent behavior.',
 'Verify eligibility wording and update help for optimization controls and no-feasible-plan cases.',
 'Resolve calculation/API integration issues and verify that applied plans reproduce their figures.',
 'Connect selected-plan parameters to the calculator; preserve user input and refresh details.',
 'Finish constrained ranking and infeasibility reasons; test results against a small checked candidate set.',
 'Complete the recommendation comparison, apply-plan button and clear empty/error states.'
],'The complete input-calculation-optimization-ledger flow works; required optimization is complete.'),
week('W06','2026-11-30','2026-12-04','Baseline acceptance','base',[
 'Review requirement coverage, test evidence and report/software consistency; track remaining blockers.',
 'Check policy/help links, language switching and mobile layout; finish business-analysis report text.',
 'Run tax/mortgage boundary tests, fix calculation defects and finish the financial-model section.',
 'Run calculator/ledger journeys on an actual desktop and phone; finish UI evidence and screenshots.',
 'Run optimization/API integration checks, fix blockers and verify startup instructions and CI.',
 'Test recommendations, applying plans and responsive views; finish optimization UI evidence.'
],'Accepted baseline and complete interim draft by 4 Dec; each member corrects their own section.',(('2026-12-04','Baseline accepted'),)),
week('W07','2026-12-07','2026-12-09','Interim submission','delivery',[
 'Review the final report, references and submission package; verify the early upload receipt.',
 'Proofread business/UI wording and bilingual screenshots; archive policy sources and help examples.',
 'Recheck reported calculation values; archive reference tests and the frozen calculation version.',
 'Check screenshot/version consistency; archive frontend assets and the local demonstration steps.',
 'Package backend configuration and startup instructions; rerun critical checks and write restart notes.',
 'Proofread optimization results and charts; verify example plans and archive UI test evidence.'
],'Submit on 9 Dec and retain receipts; all materials archived before the break.',(('2026-12-09','Interim submitted'),)),
week('BREAK','2026-12-10','2027-02-14','Winter / Spring Festival break','break',[],
 'All six members are on break. No development, meetings, review, reporting or submission duties.'),
week('W08','2027-02-15','2027-02-19','Restart and comparison','extension',[
 'Review policy/calendar changes and recheck agreed extension scope against the accepted baseline.',
 'Update sources and help for changed assumptions; draft instructions for condition comparison.',
 'Restore and regress the calculation module; define reusable outputs for comparison and export.',
 'Restore calculator/ledger flows; design export/import controls and check shared state behavior.',
 'Implement the one-input-at-a-time comparison endpoint against a fixed baseline.',
 'Build the separate comparison page, variable controls and first table/chart using real responses.'
],'Baseline regression passes and the first comparison extension works; each member updates final-report notes.'),
week('W09','2027-02-22','2027-02-26','Data flows and explanations','extension',[
 'Add or verify policy-version metadata; check that displayed rules match calculation assumptions.',
 'Update help examples for comparison and data import/export; review wording and source links.',
 'Verify exported ledger data and scenario schema; add import-validation and round-trip checks.',
 'Complete CSV exports and JSON import/export controls with clear invalid-file feedback.',
 'Improve recommendation-difference calculations and infeasibility explanations; test comparison values.',
 'Improve comparison charts, labels and recommendation explanations; verify figures against responses.'
],'All six pages connect; exports reconcile, imported scenarios recalculate, and explanations match data.'),
week('W10','2027-03-01','2027-03-05','Extensions and feature freeze','extension',[
 'Review extension acceptance and scope; help verify policy metadata and any saved-plan data rules.',
 'Finish bilingual examples and policy/help layout; review content accessibility and usability.',
 'Stabilize calculation/data contracts and test malformed scenarios; assist Boqing with stored-plan data.',
 'Finish ledger chart, pagination and import/export edge cases; check mobile and keyboard use.',
 'If earlier checks pass, implement named PostgreSQL scenarios; otherwise harden search and document exclusions.',
 'If saved plans are included, build save/load controls; otherwise fix comparison interaction and layout defects.'
],'Freeze features on 5 Mar; incomplete optional saved-plan work is dropped.',(('2027-03-05','Feature freeze'),)),
week('W11','2027-03-08','2027-03-12','Integrated regression','verification',[
 'Check requirement-to-test coverage and review unresolved defects and policy-version evidence.',
 'Test policy/help pages, example loading and translations; fix broken links or unclear guidance.',
 'Run reference and boundary tests for tax, loans and cash flow; fix and document calculation defects.',
 'Run calculator/ledger Playwright journeys, import/export tests and mobile-layout checks.',
 'Run optimization/API/database integration checks and clean Docker/CI builds; record actual results.',
 'Run optimization/comparison journeys, no-feasible cases and selected-plan navigation tests.'
],'Regression results and defect records cover every committed feature.'),
week('W12','2027-03-15','2027-03-19','Platform acceptance and draft','verification',[
 'Review desktop/mobile evidence and assemble a report-consistency checklist for each author.',
 'Test policy/help on actual devices; finish business analysis and user-guide sections.',
 'Verify calculations on the release environment; finish formulas, implementation and test sections.',
 'Check calculator/ledger tasks on actual desktop and mobile OSs; finish UI design and screenshots.',
 'Check deployment and optimization on the release environment; finish backend and integration sections.',
 'Check optimization/comparison tasks on actual devices; finish interaction and test-result sections.'
],'Actual platform acceptance and a complete final-report draft by 19 Mar.'),
week('W13','2027-03-22','2027-03-26','Release and final review','verification',[
 'Review report/software consistency, sources and contribution records; verify closure of critical issues.',
 'Finalize policy/help text and user-guide screenshots; prepare project-introduction slides.',
 'Recheck financial examples and clean-start calculations; prepare the calculator explanation for the demo.',
 'Finalize frontend packaging and calculator/ledger demo steps; capture release screenshots.',
 'Verify database setup, Docker, CI and release packaging; prepare the optimization/backend walkthrough.',
 'Prepare comparison/optimization presentation slides and check demo scenarios against the release.'
],'Release candidate frozen on 26 Mar; reviewed report and draft media materials are ready.',(('2027-03-26','Release candidate'),)),
week('W14','2027-03-29','2027-04-02','Submission and recording','delivery',[
 'Review the final checklist and report upload; verify the 1 Apr receipt and review the recording script.',
 'Proofread policy/business text and the user guide; prepare the promotional artefact draft.',
 'Recheck financial tables and package calculation evidence; record the calculator explanation on 2 Apr.',
 'Check submitted frontend files and screenshots; record calculator/ledger interaction on 2 Apr.',
 'Finalize runnable software/configuration and download-check the upload; record backend/optimization setup.',
 'Finalize optimization charts and presentation slides; record optimization/comparison interaction on 2 Apr.'
],'Internal report/software target: 31 Mar; course target: 1 Apr, 15:00 (TBC). First recordings on 2 Apr.',
 (('2027-03-31','Internal submission'),('2027-04-01','Software/report due (TBC)'))),
week('W15','2027-04-06','2027-04-09','Media delivery and outlines','delivery',[
 'Review all three media deliverables and upload receipts; draft the project-review part of the individual report.',
 'Edit captions and finalize the promotional artefact; draft the individual business-analysis/UI outline.',
 'Verify and edit financial explanations in recordings; draft the individual calculation/testing outline.',
 'Edit UI demo footage and check video playback; draft the individual calculator/ledger UI outline.',
 'Verify reproducible demo setup and media links; draft the individual optimization/deployment outline.',
 'Edit team-presentation/optimization footage; draft the individual comparison/UI-testing outline.'
],'Internal media target: 7 Apr; course target: 8 Apr, 15:00 (TBC). Six individual outlines by 9 Apr.',
 (('2027-04-07','Internal media target'),('2027-04-08','Media due (TBC)'))),
week('W16','2027-04-12','2027-04-16','Individual report drafts','report',[
 'Write personal review, requirements, policy/API work and reflection; attach genuine contribution evidence.',
 'Write personal business-analysis, policy/help UI and usability work with examples and reflection.',
 'Write personal tax/mortgage implementation, design decisions, reference tests and problem-solving.',
 'Write personal calculator/ledger UI, shared components, data workflows and platform-testing work.',
 'Write personal optimization, database, deployment and integration-testing work and trade-offs.',
 'Write personal recommendation/comparison UI, charts, interaction tests and lessons learned.'
],'Six complete individual drafts; each member checks one peer draft for shared factual consistency.'),
week('W17','2027-04-19','2027-04-22','Individual final submission','report',[
 'Revise, proofread and submit your individual report; verify personal receipt and team completion status.',
 'Revise, proofread and submit your individual report; verify citations, contribution evidence and receipt.',
 'Revise, proofread and submit your individual report; verify calculation examples, references and receipt.',
 'Revise, proofread and submit your individual report; verify screenshots, contribution evidence and receipt.',
 'Revise, proofread and submit your individual report; verify backend/test evidence, references and receipt.',
 'Revise, proofread and submit your individual report; verify UI/test evidence, references and receipt.'
],'Internal individual target: 21 Apr; course target: 22 Apr, 15:00 (TBC). All six retain submission receipts.',
 (('2027-04-21','Internal individual target'),('2027-04-22','Individual reports due (TBC)'))),
]


def validate():
    seen=[]
    for w in WEEKS:
        active=[d for d in dates(w['start'],w['end']) if working(d)]
        w['days']=len(active)
        assert len(w['tasks'])==(0 if w['kind']=='break' else 6)
        if active:
            assert working(w['start']) and working(w['end'])
            assert w['start'].isocalendar()[:2]==w['end'].isocalendar()[:2]
        seen.extend(active)
        for value,_ in w['milestones']:
            d=date.fromisoformat(value)
            assert w['start']<=d<=w['end'] and working(d)
    expected=[d for d in dates(date(2026,10,27),date(2027,4,22)) if working(d)]
    assert len(seen)==len(set(seen))==80 and sorted(seen)==expected
    assert sum(w['days'] for w in WEEKS if w['end']<date(2026,12,10))==32


validate()
