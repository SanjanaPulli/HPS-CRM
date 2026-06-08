const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, Header, Footer,
  LevelFormat, TabStopType
} = require('docx')
const fs = require('fs')

const emp = JSON.parse(Buffer.from(process.argv[2], 'base64').toString())
const outputPath = process.argv[3]

// ── Dates ─────────────────────────────────────────────────────────────────────
const today = new Date()
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : 'TBD'

const todayStr   = fmtDate(today.toISOString())
const joiningStr = fmtDate(emp.joiningDate)
const endDateStr = emp.endDate ? fmtDate(emp.endDate) : 'TBD'

// ── Is this an internship? ────────────────────────────────────────────────────
const positionFull = emp.position || 'Employee'
const isIntern     = positionFull.toLowerCase().includes('intern')

// ── Helpers ───────────────────────────────────────────────────────────────────
const BRAND   = '1A6B8A'
const LIGHT   = 'D5EEF5'
const BORDER  = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }

const t  = (text, opts = {}) => new TextRun({ text, font: 'Arial', size: 20, ...opts })
const tb = (text, opts = {}) => new TextRun({ text, font: 'Arial', size: 20, bold: true, ...opts })
const gap = (before = 80, after = 80) => new Paragraph({ children: [], spacing: { before, after } })

// ── Responsibilities by dept ──────────────────────────────────────────────────
const dept = (emp.department || '').toLowerCase()
let responsibilities = [
  'Designing and developing scalable applications',
  'Writing clean, efficient, and maintainable code',
  'Working on data structures, algorithms, and system design fundamentals',
  'Debugging, testing, and optimizing application performance',
  'Collaborating with cross-functional teams to deliver high-quality software solutions',
]
if (dept.includes('hr')) {
  responsibilities = [
    'Assisting in recruitment drives and candidate screening',
    'Supporting onboarding and employee documentation processes',
    'Maintaining HR records and databases accurately',
    'Coordinating training sessions and company events',
    'Contributing to policy documentation and compliance activities',
  ]
} else if (dept.includes('market') || dept.includes('sales')) {
  responsibilities = [
    'Assisting in campaign planning and digital marketing initiatives',
    'Conducting market research and competitor analysis',
    'Creating content for social media and marketing collateral',
    'Supporting lead generation and CRM management',
    'Collaborating with the sales team to drive business growth',
  ]
} else if (dept.includes('finance')) {
  responsibilities = [
    'Assisting in financial data entry and reconciliation',
    'Preparing reports, summaries, and financial statements',
    'Supporting budgeting, forecasting, and audit processes',
    'Maintaining accurate and organised financial records',
    'Coordinating with accounts and external vendors',
  ]
}

// ── Numbering ─────────────────────────────────────────────────────────────────
const numberingConfig = {
  config: [
    {
      reference: 'bullets',
      levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 480, hanging: 240 } } } }]
    },
    {
      reference: 'tc-numbers',
      levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 480, hanging: 240 } } } }]
    }
  ]
}

const bulletPara = (text) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  spacing: { before: 40, after: 40 },
  children: [t(text)]
})

const tcPara = (text) => new Paragraph({
  numbering: { reference: 'tc-numbers', level: 0 },
  spacing: { before: 60, after: 60 },
  children: [t(text)]
})

// ── Details table — intern gets Start + End + Stipend, full-time gets Start + Salary ──
function detailRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        borders: BORDERS,
        width: { size: 2800, type: WidthType.DXA },
        shading: { fill: LIGHT, type: ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({ children: [tb(label, { size: 19, color: BRAND })] })]
      }),
      new TableCell({
        borders: BORDERS,
        width: { size: 6200, type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 140, right: 140 },
        children: [new Paragraph({ children: [t(value || 'Not Disclosed')] })]
      })
    ]
  })
}

const internRows = [
  detailRow('Location',   emp.location || 'Hybrid'),
  detailRow('Start Date', joiningStr),
  detailRow('End Date',   endDateStr),          // ← only for interns
  detailRow('Stipend',    emp.salary || 'Not Disclosed'),
]

const fullTimeRows = [
  detailRow('Location',      emp.location || 'On-site'),
  detailRow('Date of Joining', joiningStr),     // no end date for permanent roles
  detailRow('Department',    emp.department || '—'),
  detailRow('Salary / CTC',  emp.salary || 'Not Disclosed'),
]

const detailsTable = new Table({
  width: { size: 9000, type: WidthType.DXA },
  columnWidths: [2800, 6200],
  rows: isIntern ? internRows : fullTimeRows
})

// ── Opening paragraph — intern mentions duration, full-time doesn't ───────────
const openingChildren = isIntern
  ? [
      t('We are pleased to offer you the position of '),
      tb(positionFull),
      t(' at HPS (OPC) Pvt. Ltd., commencing from '),
      tb(joiningStr),
      t(' to '),
      tb(endDateStr),                            // ← end date only here for interns
      t('. This internship is part of our initiative to nurture emerging talent in software engineering and modern development practices.'),
    ]
  : [
      t('We are pleased to offer you the position of '),
      tb(positionFull),
      t(' at HPS (OPC) Pvt. Ltd., with effect from '),
      tb(joiningStr),
      t('. We are confident that your skills and experience will be a valuable addition to our organisation.'),
    ]

// ── T&C — intern has final report clause, full-time has notice period ─────────
const tcClauses = isIntern
  ? [
      'You are required to maintain confidentiality of all company marketing strategies, client data, and proprietary information.',
      'A final report and presentation summarising your contributions must be submitted at the end of the internship.',
      'Based on your performance and contribution, the internship may be extended, and you may be considered for a full-time role at HPS (OPC) Pvt. Ltd.',
      'Any intellectual property developed during this engagement remains the sole property of HPS OPC Pvt. Ltd.',
    ]
  : [
      'You are required to maintain strict confidentiality of all company information, client data, and proprietary materials during and after your employment.',
      'Either party may terminate the employment by serving a notice period of 30 days or payment in lieu thereof.',
      'You will be on probation for a period of 6 months from the date of joining, during which the notice period shall be 7 days.',
      'Any intellectual property developed in the course of your employment remains the sole property of HPS OPC Pvt. Ltd.',
      'You are expected to comply with all company policies, codes of conduct, and applicable laws at all times.',
    ]

// ── Document ──────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: numberingConfig,
  styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1400, right: 1080, bottom: 1080, left: 1080 }
      }
    },

    headers: {
      default: new Header({
        children: [
          new Paragraph({ spacing: { after: 0 }, children: [tb('HPS OPC Pvt. Ltd', { size: 22 })] }),
          new Paragraph({ spacing: { after: 0 }, children: [t('31-7-67, Assam Gardens,')] }),
          new Paragraph({ spacing: { after: 0 }, children: [t('Visakhapatnam, Andhra Pradesh - 530020')] }),
          new Paragraph({ spacing: { after: 0 }, children: [t('+91 92466 15251')] }),
          new Paragraph({ spacing: { after: 0 }, children: [t('director@thehps.in  |  thehps.in')] }),
          new Paragraph({ spacing: { after: 0 }, children: [tb('Date: ', { size: 20 }), t(todayStr)] }),
          new Paragraph({ spacing: { after: 0 }, children: [tb('Subject: ', { size: 20 }), tb(`Offer Letter for ${positionFull}`, { size: 20 })] }),
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND, space: 4 } },
            spacing: { before: 100, after: 0 }, children: []
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 60 },
            children: [tb(`${isIntern ? 'Internship' : 'Employment'} Offer Letter  —  ${positionFull}`, { size: 28, color: BRAND })]
          }),
        ]
      })
    },

    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: BRAND, space: 4 } },
            spacing: { before: 80 },
            alignment: AlignmentType.CENTER,
            children: [t(`${isIntern ? 'Internship' : 'Employment'} Offer Letter — ${positionFull}`, { size: 16, color: '888888' })]
          })
        ]
      })
    },

    children: [
      new Paragraph({ spacing: { before: 100, after: 160 }, children: [tb(`Dear ${emp.name || 'Candidate'},`)] }),

      // Opening — different for intern vs full-time
      new Paragraph({ spacing: { after: 160 }, children: openingChildren }),

      // Responsibilities intro
      new Paragraph({
        spacing: { after: 80 },
        children: [t(`During your ${isIntern ? 'internship' : 'tenure'}, you will work closely with our ${emp.department || 'Engineering'} Team on real-world projects involving:`)]
      }),

      ...responsibilities.map(r => bulletPara(r)),

      gap(120, 80),

      new Paragraph({
        spacing: { after: 160 },
        children: [t(
          isIntern
            ? `This opportunity will provide hands-on experience in building robust systems and exposure to industry-standard development workflows and tools. You are expected to dedicate 20 hours per week, maintain a high level of professionalism, meet project deadlines, and actively collaborate with the team.`
            : `We look forward to your valuable contributions to the team. You are expected to maintain a high level of professionalism, adhere to company policies, meet deliverable timelines, and work collaboratively across functions.`
        )]
      }),

      // Details section heading
      new Paragraph({
        spacing: { before: 160, after: 100 },
        children: [tb(`${isIntern ? 'Internship' : 'Employment'} Details:`, { size: 20 })]
      }),

      detailsTable,

      gap(200, 80),

      new Paragraph({ spacing: { before: 120, after: 100 }, children: [tb('Terms & Conditions:', { size: 20 })] }),

      ...tcClauses.map(c => tcPara(c)),

      gap(160, 80),

      new Paragraph({
        spacing: { after: 200 },
        children: [t(`To confirm your acceptance of this offer, please visit our office in person at your earliest convenience. This will allow us to complete the onboarding formalities and provide further instructions for your ${isIntern ? 'internship' : 'joining'}.`)]
      }),

      new Paragraph({ spacing: { after: 320 }, children: [t('Warm regards,')] }),

      new Paragraph({
        spacing: { after: 0 },
        tabStops: [{ type: TabStopType.LEFT, position: 5400 }],
        children: [tb('Dr. P. Satheesh'), t('\t'), tb('Candidate Signature', { color: '555555' })]
      }),
      new Paragraph({
        spacing: { after: 0 },
        tabStops: [{ type: TabStopType.LEFT, position: 5400 }],
        children: [tb('Director'), t('\t')]
      }),
      new Paragraph({ spacing: { after: 0 }, children: [tb('Harsha Perfect Solutions OPC Pvt. Ltd.')] }),
    ]
  }]
})

Packer.toBuffer(doc).then(buf => {
  const safe = (emp.name || 'employee').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
  const out = outputPath || `/home/claude/offer/Offer_Letter_${safe}.docx`
  fs.writeFileSync(out, buf)
  console.log(out)
})
